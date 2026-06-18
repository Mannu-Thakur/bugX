import uuid
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
from app.models.submission import Submission, SubmissionStatus
from app.models.problem import Problem, DifficultyEnum
from app.repositories.submission_repo import SubmissionRepo
from app.repositories.user_stats_repo import UserStatsRepo
from app.services.stats_service import StatsService

logger = logging.getLogger("scoring_service")


class ScoringService:
    def __init__(self, redis: Redis):
        self.redis = redis

    @staticmethod
    def calculate_score(
        status: str,
        passed_weight: int,
        total_weight: int,
        runtime_ms: int | None,
        time_limit_ms: int,
        score_base: int,
        bonus_max: int,
    ) -> int:
        if status != "ACCEPTED" or passed_weight < total_weight or total_weight == 0:
            return 0
        if score_base <= 0 or bonus_max < 0 or time_limit_ms <= 0:
            raise ValueError("Invalid scoring configuration")
        base = score_base
        if runtime_ms is None:
            return base
        ratio = min(runtime_ms / time_limit_ms, 1.0)
        bonus = int(bonus_max * (1 - ratio))
        return min(base + bonus, score_base + bonus_max)

    async def on_submission_complete(self, session: AsyncSession, submission: Submission) -> None:
        if submission.run_samples_only:
            return

        # Fetch problem scoring configuration
        problem_stmt = select(Problem).where(Problem.id == submission.problem_id)
        result = await session.execute(problem_stmt)
        problem = result.scalar_one_or_none()
        if not problem:
            logger.error(f"Problem {submission.problem_id} not found for scoring")
            return

        score = self.calculate_score(
            status=submission.status.value,
            passed_weight=submission.passed_weight,
            total_weight=submission.total_weight,
            runtime_ms=submission.runtime_ms,
            time_limit_ms=problem.time_limit_ms,
            score_base=problem.score_base,
            bonus_max=problem.runtime_bonus_max,
        )

        battle_finished = False
        battle_event = None
        win_event = None
        state_update_event = None

        # Run all stat updates in a nested savepoint transaction
        async with session.begin_nested():
            # 1. Persist score on submission
            await SubmissionRepo.set_score(session, submission.id, score)

            if submission.status == SubmissionStatus.ACCEPTED:
                stats_repo = UserStatsRepo(session)

                # Lock the user_stats row for this user — must happen FIRST
                user_stats = await stats_repo.lock_for_update(submission.user_id)

                if user_stats is not None:
                    # Check for a PRIOR qualifying AC for this problem (excluding current submission)
                    had_prior_ac = await stats_repo.has_prior_ac_excluding(
                        submission.user_id, submission.problem_id, submission.id
                    )

                    # Increment solve counts only on first AC for this problem
                    if not had_prior_ac:
                        user_stats.total_solved += 1
                        if problem.difficulty == DifficultyEnum.EASY:
                            user_stats.easy_solved += 1
                        elif problem.difficulty == DifficultyEnum.MEDIUM:
                            user_stats.medium_solved += 1
                        elif problem.difficulty == DifficultyEnum.HARD:
                            user_stats.hard_solved += 1

                    # Recompute total_score idempotently from all qualifying bests
                    await stats_repo.recompute_total_score(submission.user_id)

                    # Update streak
                    StatsService.update_streak_on_locked(user_stats)

            # 2. Update acceptance rate for every full (non-sample) submit
            await StatsService.update_acceptance_rate(session, submission.problem_id)

            # 3. Battle Arena scoring integration
            if submission.battle_id:
                from app.models.battle import Battle
                from app.models.battle_player import BattlePlayer
                from sqlalchemy.orm import selectinload
                from datetime import timezone, datetime

                battle_stmt = select(Battle).where(Battle.id == submission.battle_id).options(selectinload(Battle.players))
                battle_res = await session.execute(battle_stmt)
                battle = battle_res.scalar_one_or_none()

                if battle:
                    # Fetch user to match by username
                    from app.models.user import User
                    user_stmt = select(User).where(User.id == submission.user_id)
                    user_res = await session.execute(user_stmt)
                    user_obj = user_res.scalar_one_or_none()

                    if user_obj:
                        player = next((p for p in battle.players if p.username == user_obj.username), None)
                        if player:
                            # Increment attempts
                            player.attempts += 1

                            is_accepted = submission.status == SubmissionStatus.ACCEPTED
                            if is_accepted and not player.solved:
                                player.solved = True
                                player.solved_at = submission.created_at

                                # Calculate speed bonus
                                total_time = battle.time_limit * 60
                                battle_start = battle.start_time.replace(tzinfo=timezone.utc) if battle.start_time.tzinfo is None else battle.start_time
                                sub_created = submission.created_at.replace(tzinfo=timezone.utc) if submission.created_at.tzinfo is None else submission.created_at

                                elapsed = (sub_created - battle_start).total_seconds()
                                time_left = max(0.0, total_time - elapsed)

                                speed_bonus = (time_left / total_time) * 50
                                penalty = max(0.2, 1.0 - 0.1 * (player.attempts - 1))

                                player.score = int(problem.score_base + speed_bonus * penalty)

                                # Prepare win_event
                                win_event = {
                                    "type": "win_event",
                                    "battle_id": str(battle.id),
                                    "winner_index": player.player_index,
                                    "score": player.score,
                                }

                            # Check if all players solved
                            all_solved = all(p.solved for p in battle.players)
                            if all_solved and battle.status != "finished":
                                battle.status = "finished"
                                battle_finished = True

                            session.add(player)
                            session.add(battle)

                            # Prepare state_update event
                            state_update_event = {
                                "type": "state_update",
                                "battle_id": str(battle.id),
                                "player_index": player.player_index,
                                "score": player.score,
                                "solved": player.solved,
                                "attempts": player.attempts,
                                "code": submission.source_code,
                                "lang": submission.language,
                            }

                            if battle_finished:
                                # Query all accepted submissions in this battle
                                sub_stmt = select(Submission).where(
                                    Submission.battle_id == battle.id,
                                    Submission.status == SubmissionStatus.ACCEPTED
                                )
                                sub_res = await session.execute(sub_stmt)
                                accepted_subs = sub_res.scalars().all()

                                # Fetch user IDs for usernames
                                user_stmt2 = select(User).where(User.username.in_([p.username for p in battle.players]))
                                user_res2 = await session.execute(user_stmt2)
                                users2 = user_res2.scalars().all()
                                uname_to_uid = {u.username: u.id for u in users2}

                                # Sort players deterministically
                                sorted_players = sorted(battle.players, key=lambda p: (
                                    0 if p.solved else 1,
                                    -p.score,
                                    min([s.runtime_ms for s in accepted_subs if s.user_id == uname_to_uid.get(p.username) and s.runtime_ms is not None], default=999999),
                                    p.solved_at.replace(tzinfo=timezone.utc) if p.solved_at else datetime.max.replace(tzinfo=timezone.utc)
                                ))

                                winner = sorted_players[0] if sorted_players else None
                                winner_username = winner.username if (winner and (winner.solved or winner.score > 0)) else None
                                winner_index = winner.player_index if (winner and (winner.solved or winner.score > 0)) else -1

                                # Prepare battle_finished event
                                battle_event = {
                                    "type": "battle_finished",
                                    "battle_id": str(battle.id),
                                    "winner_username": winner_username,
                                    "winner_index": winner_index,
                                    "players": [
                                        {
                                            "player_index": p.player_index,
                                            "username": p.username,
                                            "score": p.score,
                                            "solved": p.solved,
                                            "solved_at": p.solved_at.isoformat() if p.solved_at else None,
                                            "attempts": p.attempts
                                        }
                                        for p in battle.players
                                    ]
                                }

        # After DB transaction committed, clear leaderboard cache and broadcast events
        if self.redis is not None:
            import json
            try:
                await self.redis.delete("leaderboard:all", "leaderboard:week")
            except Exception as e:
                logger.error(f"Redis cache invalidation failed: {e}")

            try:
                if state_update_event:
                    await self.redis.publish("battle_events", json.dumps(state_update_event))
                if win_event:
                    await self.redis.publish("battle_events", json.dumps(win_event))
                if battle_event:
                    await self.redis.publish("battle_events", json.dumps(battle_event))
            except Exception as pub_err:
                logger.error(f"Failed to publish battle event to Redis: {pub_err}")
        else:
            # Broadcast directly via Websocket connection manager in the same process
            try:
                from app.routers.battle import manager
                if state_update_event:
                    await manager.broadcast(str(submission.battle_id), state_update_event)
                if win_event:
                    await manager.broadcast(str(submission.battle_id), win_event)
                if battle_event:
                    await manager.broadcast(str(submission.battle_id), battle_event)
            except Exception as ws_err:
                logger.error(f"Failed to broadcast battle event directly: {ws_err}")

