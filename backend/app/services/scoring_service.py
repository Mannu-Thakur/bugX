import uuid
import logging
from typing import Any
from datetime import datetime, timedelta, timezone
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

    @staticmethod
    def _rank_players(players, accepted_subs, username_to_user_id):
        return sorted(players, key=lambda p: (
            p.forfeited,
            0 if p.solved else 1,
            -p.score,
            min(
                [
                    s.runtime_ms for s in accepted_subs
                    if s.user_id == username_to_user_id.get(p.username) and s.runtime_ms is not None
                ],
                default=999999,
            ),
            p.solved_at.replace(tzinfo=timezone.utc) if p.solved_at and p.solved_at.tzinfo is None else (p.solved_at or datetime.max.replace(tzinfo=timezone.utc)),
            p.player_index,
        ))

    @staticmethod
    def _winner_from_ranked(players):
        if not players:
            return None
        active_players = [player for player in players if not player.forfeited]
        if any(player.forfeited for player in players) and len(active_players) == 1:
            return active_players[0]
        top = players[0]
        return top if not top.forfeited and (top.solved or top.score > 0) else None

    @staticmethod
    def _as_utc(value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)

    @classmethod
    def _before_battle_deadline(cls, battle, submission: Submission) -> bool:
        if not battle.start_time:
            return True
        deadline = cls._as_utc(battle.start_time) + timedelta(minutes=battle.time_limit)
        return cls._as_utc(submission.created_at) <= deadline

    @classmethod
    async def _rebuild_battle_player_state(
        cls,
        session: AsyncSession,
        battle,
        player,
        user_id: uuid.UUID,
        current_submission: Submission | None,
    ) -> dict | None:
        """Rebuild trusted score/solve fields from submitted rows, never client JSON."""
        import json

        try:
            problem_ids = [str(value) for value in json.loads(battle.problem_ids)] if battle.problem_ids else []
        except (TypeError, ValueError):
            problem_ids = []
        if not problem_ids:
            fallback_problem_id = battle.problem_id or (
                current_submission.problem_id if current_submission else None
            )
            if fallback_problem_id is None:
                return None
            problem_ids = [str(fallback_problem_id)]
        problem_index = {problem_id: index for index, problem_id in enumerate(problem_ids)}
        current_problem_index = (
            problem_index.get(str(current_submission.problem_id)) if current_submission else None
        )
        if current_submission and current_problem_index is None:
            return None

        stored_progress = {}
        if player.progress:
            try:
                decoded = json.loads(player.progress)
                if isinstance(decoded, dict):
                    stored_progress = decoded
            except (TypeError, ValueError):
                pass

        progress = {}
        valid_languages = {"python", "javascript", "cpp", "java"}
        for index, problem_id in enumerate(problem_ids):
            previous = stored_progress.get(str(index), {})
            if not isinstance(previous, dict):
                previous = {}
            code = previous.get("code", "")
            lang = previous.get("lang", "javascript")
            if not isinstance(code, str) or len(code.encode("utf-8")) > 65536:
                code = ""
            if not isinstance(lang, str) or lang.lower() not in valid_languages:
                lang = "javascript"
            progress[str(index)] = {
                "code": code,
                "lang": lang.lower(),
                "solved": False,
                "solved_at": None,
                "attempts": 0,
                "score": 0,
            }

        problem_uuid_ids = []
        for problem_id in problem_ids:
            try:
                problem_uuid_ids.append(uuid.UUID(problem_id))
            except ValueError:
                continue
        problem_result = await session.execute(select(Problem).where(Problem.id.in_(problem_uuid_ids)))
        problems_by_id = {str(problem.id): problem for problem in problem_result.scalars().all()}

        submission_result = await session.execute(
            select(Submission)
            .where(
                Submission.battle_id == battle.id,
                Submission.user_id == user_id,
                Submission.run_samples_only == False,
            )
            .order_by(Submission.created_at, Submission.id)
        )
        player_submissions = list(submission_result.scalars().all())
        by_problem: dict[str, list[Submission]] = {problem_id: [] for problem_id in problem_ids}
        for row in player_submissions:
            by_problem.setdefault(str(row.problem_id), []).append(row)

        new_solve = False
        for problem_id, index in problem_index.items():
            rows = by_problem.get(problem_id, [])
            entry = progress[str(index)]
            entry["attempts"] = len(rows)

            accepted = [
                row for row in rows
                if row.status == SubmissionStatus.ACCEPTED and cls._before_battle_deadline(battle, row)
            ]
            if not accepted:
                continue

            first_accepted = accepted[0]
            entry["solved"] = True
            entry["solved_at"] = cls._as_utc(first_accepted.created_at).isoformat()
            attempts_to_acceptance = next(
                (attempt_index for attempt_index, row in enumerate(rows, start=1) if row.id == first_accepted.id),
                len(rows),
            )
            total_time = max(1, battle.time_limit * 60)
            battle_start = cls._as_utc(battle.start_time) if battle.start_time else cls._as_utc(first_accepted.created_at)
            elapsed = max(0.0, (cls._as_utc(first_accepted.created_at) - battle_start).total_seconds())
            time_left = max(0.0, total_time - elapsed)
            speed_bonus = (time_left / total_time) * 50
            penalty = max(0.2, 1.0 - 0.1 * (attempts_to_acceptance - 1))
            problem = problems_by_id.get(problem_id)
            entry["score"] = int(((problem.points or 0) if problem else 0) + speed_bonus * penalty)
            if current_submission and first_accepted.id == current_submission.id:
                new_solve = True

        if current_submission and current_problem_index is not None:
            current_entry = progress[str(current_problem_index)]
            current_entry["code"] = current_submission.source_code
            current_entry["lang"] = current_submission.language
        player.score = sum(entry["score"] for entry in progress.values())
        player.solved = all(entry["solved"] for entry in progress.values())
        solved_times = [
            datetime.fromisoformat(entry["solved_at"])
            for entry in progress.values()
            if entry["solved_at"]
        ]
        player.solved_at = max(solved_times) if player.solved and solved_times else None
        player.attempts = progress.get("0", {}).get("attempts", 0)
        if current_submission and current_problem_index == 0:
            player.code = current_submission.source_code
            player.lang = current_submission.language
        player.progress = json.dumps(progress)
        return {
            "progress": progress,
            "problem_index": current_problem_index,
            "new_solve": new_solve,
        }

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

                if battle and battle.status != "finished":
                    # Rebuild every participant from persisted, server-judged
                    # submissions so state saved by older client versions is
                    # never treated as a score or solve source.
                    from app.models.user import User
                    player_user_result = await session.execute(
                        select(User).where(User.username.in_([p.username for p in battle.players]))
                    )
                    player_user_ids = {user.username: user.id for user in player_user_result.scalars().all()}
                    player = next(
                        (p for p in battle.players if player_user_ids.get(p.username) == submission.user_id),
                        None,
                    )
                    current_state = None
                    for battle_player in battle.players:
                        user_id = player_user_ids.get(battle_player.username)
                        if user_id is None:
                            continue
                        state = await self._rebuild_battle_player_state(
                            session,
                            battle,
                            battle_player,
                            user_id,
                            submission if battle_player is player else None,
                        )
                        if battle_player is player:
                            current_state = state

                    if player and current_state:
                        progress_dict = current_state["progress"]
                        prob_idx = current_state["problem_index"]
                        q_idx = str(prob_idx)
                        if current_state["new_solve"]:
                            win_event = {
                                "type": "win_event",
                                "battle_id": str(battle.id),
                                "winner_index": player.player_index,
                                "score": player.score,
                                "problem_index": prob_idx,
                            }

                        if len(battle.players) <= 2:
                            should_finish = any(p.solved or p.forfeited for p in battle.players)
                        else:
                            should_finish = all(p.solved or p.forfeited for p in battle.players)

                        if should_finish and battle.status != "finished":
                            battle.status = "finished"
                            battle_finished = True
                            await self.persist_battle_history(session, battle, datetime.now(timezone.utc))

                        session.add(battle)
                        # Prepare state_update event from the rebuilt server state.
                        state_update_event = {
                            "type": "state_update",
                            "battle_id": str(battle.id),
                            "player_index": player.player_index,
                            "score": player.score,
                            "solved": player.solved,
                            "forfeited": player.forfeited,
                            "attempts": progress_dict[q_idx]["attempts"],
                            "code": submission.source_code,
                            "lang": submission.language,
                            "problem_index": prob_idx,
                            "progress": progress_dict,
                        }

                        if battle_finished:
                            # Query accepted submissions for ranking.
                            sub_stmt = select(Submission).where(
                                Submission.battle_id == battle.id,
                                Submission.status == SubmissionStatus.ACCEPTED
                            )
                            sub_res = await session.execute(sub_stmt)
                            accepted_subs = [
                                row for row in sub_res.scalars().all()
                                if self._before_battle_deadline(battle, row)
                            ]

                            user_stmt2 = select(User).where(User.username.in_([p.username for p in battle.players]))
                            user_res2 = await session.execute(user_stmt2)
                            users2 = user_res2.scalars().all()
                            uname_to_uid = {u.username: u.id for u in users2}

                            sorted_players = self._rank_players(battle.players, accepted_subs, uname_to_uid)
                            winner = self._winner_from_ranked(sorted_players)

                            battle_event = {
                                "type": "battle_finished",
                                "battle_id": str(battle.id),
                                "winner_username": winner.username if winner else None,
                                "winner_index": winner.player_index if winner else -1,
                                "players": [
                                    {
                                        "player_index": p.player_index,
                                        "username": p.username,
                                        "score": p.score,
                                        "solved": p.solved,
                                        "forfeited": p.forfeited,
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

        # Reconcile state before writing history, including stale values saved
        # by clients running older battle code.
        user_result = await db.execute(select(User).where(User.username.in_([p.username for p in battle.players])))
        user_ids = {user.username: user.id for user in user_result.scalars().all()}
        for player in battle.players:
            user_id = user_ids.get(player.username)
            if user_id is not None:
                await cls._rebuild_battle_player_state(db, battle, player, user_id, None)

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
        accepted_subs = [
            row for row in sub_res.scalars().all()
            if cls._before_battle_deadline(battle, row)
        ]

        # Fetch user IDs for usernames
        user_stmt2 = select(User).where(User.username.in_([p.username for p in battle.players]))
        user_res2 = await db.execute(user_stmt2)
        users2 = user_res2.scalars().all()
        uname_to_uid = {u.username: u.id for u in users2}

        # Sort players deterministically
        sorted_players = cls._rank_players(battle.players, accepted_subs, uname_to_uid)

        winner = cls._winner_from_ranked(sorted_players)
        winner_username = winner.username if winner else None
        winner_index = winner.player_index if winner else -1

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
                    "forfeited": p.forfeited,
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
                    await redis_client.aclose()
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
        accepted_subs = [
            row for row in sub_res.scalars().all()
            if cls._before_battle_deadline(battle, row)
        ]

        # Fetch user IDs for usernames
        user_stmt2 = select(User).where(User.username.in_([p.username for p in battle.players]))
        user_res2 = await session.execute(user_stmt2)
        users2 = user_res2.scalars().all()
        uname_to_uid = {u.username: u.id for u in users2}

        # Sort players deterministically
        sorted_players = cls._rank_players(battle.players, accepted_subs, uname_to_uid)

        winner = cls._winner_from_ranked(sorted_players)
        winner_username = winner.username if winner else None
        winner_val = winner_username if winner_username else "Tie Match"

        start_time_val = battle.start_time
        end_time_val = now
        duration_val = 0
        if start_time_val:
            start_aware = start_time_val.replace(tzinfo=timezone.utc) if start_time_val.tzinfo is None else start_time_val
            end_aware = end_time_val.replace(tzinfo=timezone.utc) if end_time_val.tzinfo is None else end_time_val
            duration_val = int((end_aware - start_aware).total_seconds())

        try:
            problem_ids = [str(value) for value in json.loads(battle.problem_ids)] if battle.problem_ids else []
        except (TypeError, ValueError):
            problem_ids = []
        if not problem_ids and battle.problem_id:
            problem_ids = [str(battle.problem_id)]
        problem_uuids = []
        for problem_id in problem_ids:
            try:
                problem_uuids.append(uuid.UUID(problem_id))
            except ValueError:
                continue
        problem_points_result = await session.execute(
            select(Problem.id, Problem.points).where(Problem.id.in_(problem_uuids))
        )
        problem_points = {str(problem_id): int(points or 0) for problem_id, points in problem_points_result.all()}

        points_earned_dict = {}
        attempts_dict = {}
        for player in battle.players:
            try:
                progress = json.loads(player.progress) if player.progress else {}
            except (TypeError, ValueError):
                progress = {}
            if isinstance(progress, dict) and progress:
                points_earned_dict[player.username] = sum(
                    problem_points.get(problem_id, 0)
                    for index, problem_id in enumerate(problem_ids)
                    if isinstance(progress.get(str(index)), dict)
                    and progress[str(index)].get("solved") is True
                )
                attempts_dict[player.username] = sum(
                    max(0, int(item.get("attempts", 0) or 0))
                    for item in progress.values()
                    if isinstance(item, dict)
                )
            else:
                points_earned_dict[player.username] = int(battle.problem.points or 0) if player.solved and battle.problem else 0
                attempts_dict[player.username] = player.attempts

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

