import uuid
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.submission import Submission, SubmissionStatus
from app.models.submission_result import SubmissionResult
from app.models.problem import Problem
from app.models.test_case import TestCase
from app.models.problem_template import ProblemTemplate
from app.repositories.submission_repo import SubmissionRepo
from app.repositories.submission_result_repo import SubmissionResultRepo
from app.services.code_wrapper_service import CodeWrapperService
from app.services.judge0_client import Judge0Client
from app.services.output_compare_service import OutputCompareService

class JudgeService:
    def __init__(self, judge0_client: Judge0Client):
        self.judge0_client = judge0_client

    async def run(self, session: AsyncSession, submission_id: uuid.UUID) -> None:
        submission = await SubmissionRepo.get_by_id(session, submission_id)
        if not submission:
            return

        # Get Problem
        problem_stmt = select(Problem).where(Problem.id == submission.problem_id)
        problem_res = await session.execute(problem_stmt)
        problem = problem_res.scalar_one_or_none()
        if not problem:
            await self._set_terminal_error(session, submission, SubmissionStatus.RUNTIME_ERROR, "Problem not found")
            return

        # Get Template
        tpl_stmt = select(ProblemTemplate).where(
            ProblemTemplate.problem_id == submission.problem_id,
            ProblemTemplate.language == submission.language
        )
        tpl_res = await session.execute(tpl_stmt)
        template = tpl_res.scalar_one_or_none()
        if not template:
            await self._set_terminal_error(session, submission, SubmissionStatus.RUNTIME_ERROR, "Template not found")
            return

        # Get Python Template (for robust signature recovery fallback)
        py_tpl_stmt = select(ProblemTemplate).where(
            ProblemTemplate.problem_id == submission.problem_id,
            ProblemTemplate.language == "python"
        )
        py_tpl_res = await session.execute(py_tpl_stmt)
        py_template_obj = py_tpl_res.scalar_one_or_none()
        python_template = py_template_obj.template_code if py_template_obj else None

        # Get Test Cases
        tc_stmt = select(TestCase).where(TestCase.problem_id == submission.problem_id).order_by(TestCase.order_index)
        if submission.run_samples_only:
            tc_stmt = tc_stmt.where(TestCase.is_sample == True)

        tc_res = await session.execute(tc_stmt)
        test_cases = list(tc_res.scalars().all())

        if not test_cases:
            await self._set_terminal_error(session, submission, SubmissionStatus.RUNTIME_ERROR, "No test cases found")
            return

        # Prepare for idempotency
        await SubmissionResultRepo.delete_by_submission_id(session, submission.id)
        submission.passed_count = 0
        submission.passed_weight = 0
        submission.total_count = len(test_cases)
        submission.total_weight = sum(tc.weight for tc in test_cases)
        submission.runtime_ms = None
        submission.memory_kb = None
        submission.error_message = None
        await session.flush()

        results = []
        max_runtime = 0
        max_memory = 0
        terminal_status = None
        has_comparison_failure = False

        # Wrap code once
        from app.core.config import get_settings
        debug_mode = get_settings().is_development
        try:
            wrapped_code = CodeWrapperService.wrap_code(
                submission.language,
                submission.source_code,
                template.function_name,
                template.arg_style,
                python_template,
                debug_mode
            )
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            err_msg = f"Wrapper Generation Failed:\nLanguage: {submission.language}\nException: {str(e)}\nTraceback:\n{tb}"
            await self._set_terminal_error(session, submission, SubmissionStatus.COMPILE_ERROR, err_msg)
            return

        import asyncio
        import httpx

        # We will reuse a single AsyncClient connection pool for executing all test cases
        async with httpx.AsyncClient() as client:
            async def run_tc(tc):
                try:
                    res = await self.judge0_client.execute(
                        language=submission.language,
                        source_code=wrapped_code,
                        stdin=tc.input,
                        time_limit_ms=problem.time_limit_ms,
                        memory_limit_kb=problem.memory_limit_kb,
                        client=client
                    )
                    return tc, res, None
                except Exception as exc:
                    return tc, None, exc

            tasks = [run_tc(tc) for tc in test_cases]
            executed_results = await asyncio.gather(*tasks)

        # Process results
        for tc, judge_res, exc in executed_results:
            if exc:
                import traceback
                import sys
                tb = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
                try:
                    sys.stdout.buffer.write(f"DEBUG EXCEPTION IN JUDGE SERVICE:\n{tb}\n".encode('utf-8'))
                    sys.stdout.flush()
                except Exception:
                    pass
                await self._set_terminal_error(session, submission, SubmissionStatus.RUNTIME_ERROR, f"Judge unavailable: {repr(exc)}\n{tb}")
                return

            status_id = judge_res.get("status", {}).get("id", 13)
            time_str = judge_res.get("time") or "0"
            memory_val = judge_res.get("memory") or 0

            try:
                rt = int(float(time_str) * 1000)
            except ValueError:
                rt = 0

            mem = int(memory_val)
            max_runtime = max(max_runtime, rt)
            max_memory = max(max_memory, mem)

            is_passed = False
            tc_status = None
            stderr = judge_res.get("stderr") or judge_res.get("compile_output") or ""
            stdout = judge_res.get("stdout") or ""

            if "[WRAPPER_EXCEPTION]" in stderr:
                err_msg = f"Wrapper Runtime Failed:\nLanguage: {submission.language}\nTraceback:\n{stderr.strip()}"
                await self._set_terminal_error(session, submission, SubmissionStatus.RUNTIME_ERROR, err_msg)
                return

            if status_id == 3: # Accepted by Judge0 (ran successfully)
                is_passed = OutputCompareService.compare(tc.expected_output, stdout, problem.slug, getattr(problem, 'comparison_mode', None))
                if not is_passed:
                    has_comparison_failure = True
            elif status_id == 5:
                tc_status = SubmissionStatus.TIME_LIMIT
            elif status_id == 6:
                tc_status = SubmissionStatus.COMPILE_ERROR
            elif status_id in (7, 8, 9, 10, 11, 12, 13, 14):
                tc_status = SubmissionStatus.RUNTIME_ERROR
                # Map interpreted language syntax/indentation errors to COMPILE_ERROR
                if submission.language == "python":
                    for marker in ("SyntaxError:", "IndentationError:", "TabError:"):
                        if marker in (stderr or ""):
                            tc_status = SubmissionStatus.COMPILE_ERROR
                            break
                elif submission.language in ("javascript", "js"):
                    if "SyntaxError:" in (stderr or ""):
                        tc_status = SubmissionStatus.COMPILE_ERROR

                if tc_status == SubmissionStatus.RUNTIME_ERROR:
                    # If memory is high, we might map to MEMORY_LIMIT, but Judge0 CE often returns SIGKILL for MLE
                    if "memory" in (judge_res.get("status", {}).get("description", "").lower()):
                        tc_status = SubmissionStatus.MEMORY_LIMIT
            else:
                tc_status = SubmissionStatus.RUNTIME_ERROR

            if tc_status and not terminal_status:
                # Priority: Compile (6) > Runtime > TLE > MLE.
                terminal_status = tc_status
                # Save the first error's stderr as the submission error_message
                if stderr.strip():
                    submission.error_message = stderr.strip()[:4000]

            if is_passed:
                submission.passed_count += 1
                submission.passed_weight += tc.weight

            results.append(SubmissionResult(
                submission_id=submission.id,
                test_case_id=tc.id,
                passed=is_passed,
                stdout=stdout,
                stderr=stderr,
                runtime_ms=rt,
                memory_kb=mem
            ))

        # Save results
        await SubmissionResultRepo.bulk_insert(session, results)

        # Set final status
        if not terminal_status:
            if has_comparison_failure:
                terminal_status = SubmissionStatus.WRONG_ANSWER
            else:
                if submission.run_samples_only:
                    terminal_status = SubmissionStatus.SAMPLE_PASSED
                else:
                    terminal_status = SubmissionStatus.ACCEPTED

        submission.status = terminal_status
        submission.runtime_ms = max_runtime
        submission.memory_kb = max_memory
        submission.updated_at = datetime.now(timezone.utc)
        await session.flush()

    async def _set_terminal_error(self, session: AsyncSession, submission: Submission, status: SubmissionStatus, message: str) -> None:
        submission.status = status
        submission.error_message = message
        submission.updated_at = datetime.now(timezone.utc)
        await session.flush()
