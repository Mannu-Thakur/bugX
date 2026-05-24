import uuid
from sqlalchemy import update, select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.problem import Problem
from app.models.submission import Submission, SubmissionStatus

class ProblemRepo:
    @staticmethod
    async def update_acceptance_rate(session: AsyncSession, problem_id: uuid.UUID) -> None:
        # Get count of qualifying ACCEPTED
        ac_stmt = select(func.count(Submission.id)).where(
            Submission.problem_id == problem_id,
            Submission.status == SubmissionStatus.ACCEPTED,
            Submission.run_samples_only == False
        )
        ac_result = await session.execute(ac_stmt)
        ac_count = ac_result.scalar() or 0

        # Get total qualifying attempts
        total_stmt = select(func.count(Submission.id)).where(
            Submission.problem_id == problem_id,
            Submission.run_samples_only == False
        )
        total_result = await session.execute(total_stmt)
        total_count = total_result.scalar() or 0

        if total_count > 0:
            acceptance_rate = round(100.0 * ac_count / total_count, 2)
        else:
            acceptance_rate = None

        upd_stmt = (
            update(Problem)
            .where(Problem.id == problem_id)
            .values(acceptance_rate=acceptance_rate)
        )
        await session.execute(upd_stmt)
