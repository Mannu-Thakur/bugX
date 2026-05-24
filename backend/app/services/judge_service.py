import uuid
from typing import Optional
from datetime import datetime
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

        for tc in test_cases:
            # Wrap code
            try:
                wrapped_code = CodeWrapperService.wrap_code(
                    submission.language, 
                    submission.source_code, 
                    template.function_name, 
                    template.arg_style
                )
            except Exception as e:
                await self._set_terminal_error(session, submission, SubmissionStatus.RUNTIME_ERROR, f"Wrapper error: {str(e)}")
                return

            # Execute
            try:
                judge_res = await self.judge0_client.execute(
                    language=submission.language,
                    source_code=wrapped_code,
                    stdin=tc.input,
                    time_limit_ms=problem.time_limit_ms,
                    memory_limit_kb=problem.memory_limit_kb
                )
            except Exception as e:
                await self._set_terminal_error(session, submission, SubmissionStatus.RUNTIME_ERROR, f"Judge unavailable: {str(e)}")
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

            if status_id == 3: # Accepted by Judge0 (ran successfully)
                is_passed = OutputCompareService.compare(tc.expected_output, stdout)
                if not is_passed:
                    has_comparison_failure = True
            elif status_id == 5:
                tc_status = SubmissionStatus.TIME_LIMIT
            elif status_id == 6:
                tc_status = SubmissionStatus.COMPILE_ERROR
            elif status_id in (7, 8, 9, 10, 11, 12, 13, 14):
                tc_status = SubmissionStatus.RUNTIME_ERROR
                # If memory is high, we might map to MEMORY_LIMIT, but Judge0 CE often returns SIGKILL for MLE
                if "memory" in (judge_res.get("status", {}).get("description", "").lower()):
                    tc_status = SubmissionStatus.MEMORY_LIMIT
            else:
                tc_status = SubmissionStatus.RUNTIME_ERROR

            if tc_status and not terminal_status:
                # Priority: Compile > Runtime > TLE > MLE > WA
                # We just take the first error for terminal status in v1 (since we don't early exit, but worst outcome wins)
                # Actually, worst outcome priority: Compile (6) > Runtime > TLE > MLE.
                terminal_status = tc_status

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
        submission.updated_at = datetime.utcnow()
        await session.flush()

    async def _set_terminal_error(self, session: AsyncSession, submission: Submission, status: SubmissionStatus, message: str) -> None:
        submission.status = status
        submission.error_message = message
        submission.updated_at = datetime.utcnow()
        await session.flush()
