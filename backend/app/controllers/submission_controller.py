import json
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.problem import Problem, user_problems
from app.models.problem_template import ProblemTemplate
from app.models.submission import Submission
from app.models.user import User
from app.repositories.submission_repo import SubmissionRepo
from app.schemas.submission import SubmissionCreate
from app.services.rate_limit_service import RateLimitService
from app.core.config import get_settings
from redis.asyncio import Redis
from app.models.submission import SubmissionStatus

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
        rate_limiter = RateLimitService(redis_client=redis_client)
        is_allowed = await rate_limiter.check_submit(str(user.id), settings.MAX_SUBMISSIONS_PER_MINUTE)

        if not is_allowed:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")

        try:
            source_size = len(payload.source_code.encode('utf-8'))
        except UnicodeEncodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Source code contains invalid Unicode characters",
            ) from exc
        if source_size > settings.MAX_SOURCE_BYTES:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Source code too large")

        # Spectator / participant check if battle_id is present
        is_battle_submission = False
        if payload.battle_id:
            from app.models.battle import Battle
            from app.models.battle_player import BattlePlayer
            
            battle_stmt = select(Battle).where(Battle.id == payload.battle_id).with_for_update()
            battle = (await session.execute(battle_stmt)).scalar_one_or_none()
            if not battle:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Battle not found"
                )
            if battle.status != "active":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Battle is not active"
                )
            if battle.start_time:
                from datetime import datetime, timezone
                started = battle.start_time
                if started.tzinfo is None:
                    started = started.replace(tzinfo=timezone.utc)
                if (datetime.now(timezone.utc) - started).total_seconds() >= battle.time_limit * 60:
                    from app.services.scoring_service import ScoringService
                    await ScoringService.finish_battle(session, battle.id)
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Battle time has expired"
                    )
            if battle.problem_ids:
                try:
                    battle_problem_ids = {str(value) for value in json.loads(battle.problem_ids)}
                except (TypeError, ValueError):
                    battle_problem_ids = {str(battle.problem_id)} if battle.problem_id else set()
            else:
                battle_problem_ids = {str(battle.problem_id)} if battle.problem_id else set()
            if str(payload.problem_id) not in battle_problem_ids:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Problem is not part of this battle",
                )

            player_stmt = select(BattlePlayer).where(
                BattlePlayer.battle_id == payload.battle_id,
                BattlePlayer.username == user.username
            )
            player = (await session.execute(player_stmt)).scalar_one_or_none()
            if not player:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Forbidden: You are not a registered participant in this battle"
                )
            if player.forfeited:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="You forfeited this battle and cannot submit more solutions",
                )
            is_battle_submission = True

        # Validate Problem
        if is_battle_submission:
            prob_stmt = select(Problem).where(Problem.id == payload.problem_id)
        else:
            prob_stmt = select(Problem).where(Problem.id == payload.problem_id, Problem.is_published == True)
        problem = (await session.execute(prob_stmt)).scalar_one_or_none()
        if not problem:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")

        # Verify access visibility
        if not problem.is_public and user.role.value != "ADMIN":
            assoc_stmt = select(user_problems).where(
                user_problems.c.user_id == user.id,
                user_problems.c.problem_id == problem.id
            )
            assoc_res = await session.execute(assoc_stmt)
            if not assoc_res.first():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")

        # Validate Template
        tpl_stmt = select(ProblemTemplate).where(
            ProblemTemplate.problem_id == payload.problem_id,
            ProblemTemplate.language == payload.language
        )
        template = (await session.execute(tpl_stmt)).scalar_one_or_none()
        if not template:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Language not supported for this problem")

        # Admin guard for javascript kwargs
        if payload.language == "javascript" and template.arg_style == "kwargs":
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="javascript kwargs not supported")

        # Create row
        submission = await SubmissionRepo.create(
            session,
            user_id=user.id,
            problem_id=payload.problem_id,
            language=payload.language,
            source_code=payload.source_code,
            run_samples_only=payload.run_samples_only,
            battle_id=payload.battle_id
        )
        await session.commit()

        # Enqueue in Redis
        queue_payload = json.dumps({"submission_id": str(submission.id)})
        try:
            await redis_client.lpush("submission_queue", queue_payload)
        except Exception as queue_err:
            # The row is durable in Postgres, but there is no reliable worker
            # path while Redis is unavailable. Mark it terminal instead of
            # returning a job that may remain PENDING forever.
            submission.status = SubmissionStatus.RUNTIME_ERROR
            submission.error_message = "Submission queue unavailable. Please retry shortly."
            await session.commit()
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Submission queue is temporarily unavailable. Please retry shortly.",
            ) from queue_err

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

        # Identify a hidden failure for the UI without disclosing its data.
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
            reveal = is_sample
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
