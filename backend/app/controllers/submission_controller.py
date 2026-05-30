import json
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.problem import Problem
from app.models.problem_template import ProblemTemplate
from app.models.submission import Submission
from app.models.user import User
from app.repositories.submission_repo import SubmissionRepo
from app.schemas.submission import SubmissionCreate
from app.services.rate_limit_service import RateLimitService
from app.services.scoring_service import ScoringService
from app.core.config import get_settings
from redis.asyncio import Redis

class SubmissionController:
    @staticmethod
    async def create(
        session: AsyncSession, 
        redis_client: Redis, 
        user: User, 
        payload: SubmissionCreate
    ) -> dict:
        settings = get_settings()

        # Check rate limit
        rate_limiter = RateLimitService(settings.REDIS_URL) # Alternatively use dependency injected Redis, but Service instantiates it
        # Actually RateLimitService takes redis_url, but we have redis_client in deps... let's just use it
        is_allowed = await rate_limiter.check_submit(str(user.id), settings.MAX_SUBMISSIONS_PER_MINUTE)
        await rate_limiter.close()
        
        if not is_allowed:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")

        if len(payload.source_code.encode('utf-8')) > settings.MAX_SOURCE_BYTES:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Source code too large")

        # Validate Problem
        prob_stmt = select(Problem).where(Problem.id == payload.problem_id, Problem.is_published == True)
        problem = (await session.execute(prob_stmt)).scalar_one_or_none()
        if not problem:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")

        # Validate Template
        tpl_stmt = select(ProblemTemplate).where(
            ProblemTemplate.problem_id == payload.problem_id, 
            ProblemTemplate.language == payload.language
        )
        template = (await session.execute(tpl_stmt)).scalar_one_or_none()
        if not template:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Language not supported for this problem")

        # Admin guard for javascript kwargs
        if payload.language == "javascript" and template.arg_style == "kwargs":
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="javascript kwargs not supported")

        # Create row
        submission = await SubmissionRepo.create(
            session,
            user_id=user.id,
            problem_id=payload.problem_id,
            language=payload.language,
            source_code=payload.source_code,
            run_samples_only=payload.run_samples_only
        )
        await session.commit()

        # Enqueue in Redis
        queue_payload = json.dumps({"submission_id": str(submission.id)})
        try:
            await redis_client.lpush("submission_queue", queue_payload)
        except Exception as queue_err:
            # Redis is offline — run judging as a background asyncio task so
            # the endpoint returns 202 immediately and the frontend can poll.
            print(f"[Redis Fallback] Redis lpush failed: {queue_err}. Spawning background judge task.")

            sub_id = submission.id  # capture before session closes

            async def _run_offline(submission_id):
                """Background task: open own DB session, judge, then score."""
                from app.core.database import AsyncSessionLocal
                from app.services.judge0_client import Judge0Client
                from app.services.judge_service import JudgeService
                from app.models.submission import SubmissionStatus

                async with AsyncSessionLocal() as bg_session:
                    try:
                        # Mark RUNNING
                        sub_row = await SubmissionRepo.get_by_id(bg_session, submission_id)
                        if sub_row:
                            sub_row.status = SubmissionStatus.RUNNING
                            await bg_session.flush()

                        judge_client = Judge0Client(settings.JUDGE0_URL)
                        judge_service = JudgeService(judge_client)
                        await judge_service.run(bg_session, submission_id)
                        await bg_session.commit()

                        # Score
                        fresh_sub = await SubmissionRepo.get_by_id(bg_session, submission_id)
                        if fresh_sub:
                            scoring_service = ScoringService(redis=None)
                            await scoring_service.on_submission_complete(bg_session, fresh_sub)
                            await bg_session.commit()
                    except Exception as err:
                        print(f"[Redis Fallback] Background judge/score failed: {err}")
                        await bg_session.rollback()

            import asyncio as _asyncio
            _asyncio.create_task(_run_offline(sub_id))

        return {"id": submission.id, "status": submission.status}


    @staticmethod
    async def get_by_id(session: AsyncSession, submission_id: UUID, user: User) -> Submission:
        submission = await SubmissionRepo.get_by_id(session, submission_id)
        if not submission:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        if submission.user_id != user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        return submission

    @staticmethod
    async def get_results(session: AsyncSession, submission_id: UUID, user: User) -> list:
        # First authorize
        submission = await SubmissionRepo.get_by_id(session, submission_id)
        if not submission or submission.user_id != user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

        from app.repositories.submission_result_repo import SubmissionResultRepo
        from app.models.test_case import TestCase
        
        results = await SubmissionResultRepo.get_by_submission_id(session, submission_id)
        
        # Fetch test cases to attach input/expected if samples
        # And return them
        stmt = select(TestCase).where(TestCase.problem_id == submission.problem_id)
        tcs = (await session.execute(stmt)).scalars().all()
        tc_map = {tc.id: tc for tc in tcs}
        
        # Find the first failing hidden case so we can reveal its details
        first_failing_hidden_id = None
        for r in results:
            if not r.passed:
                tc = tc_map.get(r.test_case_id)
                if tc and not tc.is_sample:
                    first_failing_hidden_id = r.test_case_id
                    break

        out = []
        for r in results:
            tc = tc_map.get(r.test_case_id)
            is_sample = tc.is_sample if tc else False
            # Reveal details for samples AND the first failing hidden case
            reveal = is_sample or (r.test_case_id == first_failing_hidden_id)
            out.append({
                "id": r.id,
                "test_case_id": r.test_case_id,
                "passed": r.passed,
                "runtime_ms": r.runtime_ms,
                "memory_kb": r.memory_kb,
                "test_case_input": tc.input if reveal and tc else None,
                "expected_output": tc.expected_output if reveal and tc else None,
                "stdout": r.stdout if reveal else None,
                "stderr": r.stderr if reveal else None,
                "is_sample": is_sample,
                "is_first_failing_hidden": r.test_case_id == first_failing_hidden_id,
            })
        return out
