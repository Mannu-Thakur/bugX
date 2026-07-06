import uuid
import logging
from typing import Any
from datetime import datetime
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
        difficulty: DifficultyEnum | str,
    ) -> int:
        if status != "ACCEPTED" or passed_weight < total_weight or total_weight == 0:
            return 0
        diff_str = difficulty.value if hasattr(difficulty, "value") else str(difficulty)
        diff_str = diff_str.upper()
        if diff_str == "EASY":
            return 3
        elif diff_str == "MEDIUM":
            return 6
        elif diff_str == "HARD":
            return 10
        return 0

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
            difficulty=problem.difficulty,
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
                    # Recompute total_score and solved counts idempotently from all qualifying bests
                    await stats_repo.recompute_total_score(submission.user_id)

                    # Update streak
                    StatsService.update_streak_on_locked(user_stats)

            if not submission.run_samples_only:
                from app.services.progress_service import ProgressService
                await ProgressService.upsert_progress(
                    session=session,
                    user_id=submission.user_id,
                    problem_id=submission.problem_id,
                    solved=(submission.status == SubmissionStatus.ACCEPTED),
                    submission=submission
                )

            # 2. Update acceptance rate for every full (non-sample) submit
            await StatsService.update_acceptance_rate(session, submission.problem_id)

            # 3. Battle Arena scoring integration
            if submission.battle_id:
                from app.models.battle import Battle
                from app.models.battle_player import BattlePlayer
                from sqlalchemy.orm import selectinload
                from datetime import timezone, datetime

                battle_stmt = select(Battle).where(Battle.id == submission.battle_id).options(selectinload(Battle.players)).with_for_update()
                battle_res = await session.execute(battle_stmt)
                battle = battle_res.scalar_one_or_none()

                if battle:
                    if battle.status == "finished":
                        return
                    # Fetch user to match by username
                    from app.models.user import User
                    user_stmt = select(User).where(User.id == submission.user_id)
                    user_res = await session.execute(user_stmt)
                    user_obj = user_res.scalar_one_or_none()

                    if user_obj:
                        player = next((p for p in battle.players if p.username == user_obj.username), None)
                        if player:
                            import json
                            prob_idx = 0
                            pids_len = 1
                            if battle.problem_ids:
                                try:
                                    pids = json.loads(battle.problem_ids)
                                    pids_len = len(pids)
                                    if str(submission.problem_id) in pids:
                                        prob_idx = pids.index(str(submission.problem_id))
                                except Exception:
                                    pass

                            progress_dict = {}
                            if player.progress:
                                try:
                                    progress_dict = json.loads(player.progress)
                                except Exception:
                                    pass

                            if not progress_dict:
                                progress_dict["0"] = {
                                    "code": player.code or "",
                                    "lang": player.lang or "javascript",
                                    "solved": player.solved or False,
                                    "solved_at": player.solved_at.isoformat() if player.solved_at else None,
                                    "attempts": player.attempts or 0,
                                    "score": player.score or 0
                                }

                            q_idx = str(prob_idx)
                            if q_idx not in progress_dict:
                                progress_dict[q_idx] = {
                                    "code": "",
                                    "lang": "javascript",
                                    "solved": False,
                                    "solved_at": None,
                                    "attempts": 0,
                                    "score": 0
                                }

                            # Increment attempts for this problem
                            progress_dict[q_idx]["attempts"] += 1
                            progress_dict[q_idx]["code"] = submission.source_code
                            progress_dict[q_idx]["lang"] = submission.language

                            # Sync base attributes for problem 0
                            if q_idx == "0":
                                player.attempts = progress_dict[q_idx]["attempts"]
                                player.code = submission.source_code
                                player.lang = submission.language

                            is_accepted = submission.status == SubmissionStatus.ACCEPTED
                            if is_accepted and not progress_dict[q_idx]["solved"]:
                                progress_dict[q_idx]["solved"] = True
                                progress_dict[q_idx]["solved_at"] = submission.created_at.isoformat()

                                # Calculate speed bonus
                                total_time = battle.time_limit * 60
                                battle_start = battle.start_time.replace(tzinfo=timezone.utc) if battle.start_time.tzinfo is None else battle.start_time
                                sub_created = submission.created_at.replace(tzinfo=timezone.utc) if submission.created_at.tzinfo is None else submission.created_at

                                elapsed = (sub_created - battle_start).total_seconds()
                                time_left = max(0.0, total_time - elapsed)

                                speed_bonus = (time_left / total_time) * 50
                                penalty = max(0.2, 1.0 - 0.1 * (progress_dict[q_idx]["attempts"] - 1))

                                progress_dict[q_idx]["score"] = int(problem.points + speed_bonus * penalty)

                                # Prepare win_event
                                win_event = {
                                    "type": "win_event",
                                    "battle_id": str(battle.id),
                                    "winner_index": player.player_index,
                                    "score": sum(int(item.get("score", 0)) for item in progress_dict.values()),
                                    "problem_index": prob_idx,
                                }

                            # Update player score/solved
                            player.score = sum(int(item.get("score", 0)) for item in progress_dict.values())
                            all_solved = len([k for k, v in progress_dict.items() if v.get("solved")]) >= pids_len
                            player.solved = all_solved
                            if all_solved and not player.solved_at:
                                player.solved_at = submission.created_at

                            player.progress = json.dumps(progress_dict)

                            # Check if battle should finish (ends on 1st solved for <= 2 players, or all solved for > 2 players)
                            should_finish = False
                            if len(battle.players) <= 2:
                                if any(p.solved for p in battle.players):
                                    should_finish = True
                            else:
                                if all(p.solved for p in battle.players):
                                    should_finish = True

                            if should_finish and battle.status != "finished":
                                battle.status = "finished"
                                battle_finished = True
                                from datetime import timezone, datetime
                                await self.persist_battle_history(session, battle, datetime.now(timezone.utc))

                            session.add(player)
                            session.add(battle)

                            # Prepare state_update event
                            state_update_event = {
                                "type": "state_update",
                                "battle_id": str(battle.id),
                                "player_index": player.player_index,
                                "score": player.score,
                                "solved": player.solved,
                                "attempts": progress_dict[q_idx]["attempts"],
                                "code": submission.source_code,
                                "lang": submission.language,
                                "problem_index": prob_idx,
                                "progress": progress_dict,
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
                                    p.solved_at.replace(tzinfo=timezone.utc) if p.solved_at else datetime.max.replace(tzinfo=timezone.utc),
                                    p.player_index
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
                                        for p in sorted_players
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

    @classmethod
    async def finish_battle(cls, db: AsyncSession, battle_id: uuid.UUID, redis_client=None) -> None:
        from app.models.battle import Battle
        from app.models.user import User
        from sqlalchemy.orm import selectinload
        from datetime import datetime, timezone
        from app.core.config import get_settings

        stmt = (
            select(Battle)
            .where(Battle.id == battle_id)
            .options(selectinload(Battle.players), selectinload(Battle.problem))
            .with_for_update()
        )
        res = await db.execute(stmt)
        battle = res.scalars().first()
        if not battle or battle.status == "finished":
            return

        battle.status = "finished"
        db.add(battle)
        
        # Persist battle history
        await cls.persist_battle_history(db, battle, datetime.now(timezone.utc))
        await db.commit()

        # Query all accepted submissions in this battle
        sub_stmt = select(Submission).where(
            Submission.battle_id == battle.id,
            Submission.status == SubmissionStatus.ACCEPTED
        )
        sub_res = await db.execute(sub_stmt)
        accepted_subs = sub_res.scalars().all()

        # Fetch user IDs for usernames
        user_stmt2 = select(User).where(User.username.in_([p.username for p in battle.players]))
        user_res2 = await db.execute(user_stmt2)
        users2 = user_res2.scalars().all()
        uname_to_uid = {u.username: u.id for u in users2}

        # Sort players deterministically
        sorted_players = sorted(battle.players, key=lambda p: (
            0 if p.solved else 1,
            -p.score,
            min([s.runtime_ms for s in accepted_subs if s.user_id == uname_to_uid.get(p.username) and s.runtime_ms is not None], default=999999),
            p.solved_at.replace(tzinfo=timezone.utc) if p.solved_at else datetime.max.replace(tzinfo=timezone.utc),
            p.player_index
        ))

        winner = sorted_players[0] if sorted_players else None
        winner_username = winner.username if (winner and (winner.solved or winner.score > 0)) else None
        winner_index = winner.player_index if (winner and (winner.solved or winner.score > 0)) else -1

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
                for p in sorted_players
            ]
        }

        # Broadcast the event
        settings = get_settings()
        local_redis = False
        if redis_client is None and settings.REDIS_URL:
            try:
                import redis.asyncio as aioredis
                redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
                local_redis = True
            except Exception:
                pass

        if redis_client is not None:
            import json
            try:
                await redis_client.delete("leaderboard:all", "leaderboard:week")
                await redis_client.publish("battle_events", json.dumps(battle_event))
            except Exception as e:
                logger.error(f"Failed to publish battle_finished to Redis: {e}")
            finally:
                if local_redis:
                    await redis_client.close()
        else:
            try:
                from app.routers.battle import manager
                await manager.broadcast(str(battle.id), battle_event)
            except Exception as e:
                logger.error(f"Failed to broadcast battle_finished: {e}")

    @classmethod
    async def persist_battle_history(cls, session: AsyncSession, battle: Any, now: datetime) -> None:
        from sqlalchemy import select
        from app.models.battle import BattleHistory, Battle
        from app.models.submission import Submission, SubmissionStatus
        from app.models.user import User
        from sqlalchemy.orm import selectinload
        import json
        from datetime import timezone

        if not battle.players or not battle.problem:
            stmt = (
                select(Battle)
                .where(Battle.id == battle.id)
                .options(selectinload(Battle.players), selectinload(Battle.problem))
            )
            res = await session.execute(stmt)
            battle = res.scalar_one_or_none()
            if not battle:
                return

        # Check if already exists
        history_stmt = select(BattleHistory).where(BattleHistory.battle_id == battle.id)
        history_res = await session.execute(history_stmt)
        existing_history = history_res.scalar_one_or_none()
        if existing_history:
            return

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
            p.solved_at.replace(tzinfo=timezone.utc) if p.solved_at else datetime.max.replace(tzinfo=timezone.utc),
            p.player_index
        ))

        winner = sorted_players[0] if sorted_players else None
        winner_username = winner.username if (winner and (winner.solved or winner.score > 0)) else None
        winner_val = winner_username if winner_username else "Tie Match"

        start_time_val = battle.start_time
        end_time_val = now
        duration_val = 0
        if start_time_val:
            start_aware = start_time_val.replace(tzinfo=timezone.utc) if start_time_val.tzinfo is None else start_time_val
            end_aware = end_time_val.replace(tzinfo=timezone.utc) if end_time_val.tzinfo is None else end_time_val
            duration_val = int((end_aware - start_aware).total_seconds())

        points_earned_dict = {}
        for p in battle.players:
            pts = 0
            if p.solved and battle.problem:
                pts = battle.problem.points
            points_earned_dict[p.username] = pts

        attempts_dict = {p.username: p.attempts for p in battle.players}

        history = BattleHistory(
            battle_id=battle.id,
            problem_title=battle.problem.title if battle.problem else "Arena Challenge",
            participants=json.dumps([p.username for p in battle.players]),
            winner=winner_val,
            final_scores=json.dumps({p.username: p.score for p in battle.players}),
            problems_solved=json.dumps({p.username: p.solved for p in battle.players}),
            points_earned=json.dumps(points_earned_dict),
            attempts=json.dumps(attempts_dict),
            start_time=start_time_val,
            end_time=end_time_val,
            duration=duration_val,
            status="finished"
        )
        session.add(history)
        await session.flush()

