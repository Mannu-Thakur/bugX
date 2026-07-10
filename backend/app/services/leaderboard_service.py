import json
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis

class LeaderboardService:
    def __init__(self, redis: Redis):
        self.redis = redis

    async def _cache_get(self, key: str):
        try:
            return await self.redis.get(key)
        except Exception:
            return None

    async def _cache_setex(self, key: str, ttl: int, value: str):
        try:
            await self.redis.set(key, value, ex=ttl)
        except Exception:
            return None

    async def get_all_time_leaderboard(self, session: AsyncSession, limit: int = 50):
        # Check cache
        cached = await self._cache_get("leaderboard:all")
        if cached:
            return json.loads(cached)

        query = text("""
            SELECT u.username, s.total_score, s.total_solved,
                   RANK() OVER (ORDER BY s.total_score DESC, s.total_solved DESC) AS rank
            FROM user_stats s
            JOIN users u ON u.id = s.user_id
            WHERE u.is_active = true
              AND u.username NOT LIKE 'cert_user_%'
              AND u.username NOT LIKE 'oauth_link_%'
              AND u.username NOT LIKE 'host_%'
              AND u.username NOT LIKE 'guest_%'
            ORDER BY rank
            LIMIT :limit
        """)
        result = await session.execute(query, {"limit": limit})
        rows = result.fetchall()
        
        data = []
        for row in rows:
            data.append({
                "username": row.username,
                "total_score": row.total_score,
                "total_solved": row.total_solved,
                "rank": row.rank
            })

        await self._cache_setex("leaderboard:all", 60, json.dumps(data))
        return data

    async def get_weekly_leaderboard(self, session: AsyncSession, limit: int = 50):
        # Check cache
        cached = await self._cache_get("leaderboard:week")
        if cached:
            return json.loads(cached)

        week_start = datetime.now(timezone.utc) - timedelta(days=7)
        
        query = text("""
            WITH bests AS (
                SELECT user_id, problem_id, MAX(score) AS best_score
                FROM submissions
                WHERE status = 'ACCEPTED'
                  AND run_samples_only = false
                  AND created_at >= :week_start
                GROUP BY user_id, problem_id
            )
            SELECT u.username, SUM(b.best_score) AS weekly_score,
                   COUNT(*) AS weekly_solved,
                   RANK() OVER (ORDER BY SUM(b.best_score) DESC) AS rank
            FROM bests b
            JOIN users u ON u.id = b.user_id
            WHERE u.is_active = true
              AND u.username NOT LIKE 'cert_user_%'
              AND u.username NOT LIKE 'oauth_link_%'
              AND u.username NOT LIKE 'host_%'
              AND u.username NOT LIKE 'guest_%'
            GROUP BY u.id, u.username
            ORDER BY rank
            LIMIT :limit
        """)
        result = await session.execute(query, {"limit": limit, "week_start": week_start})
        rows = result.fetchall()
        
        data = []
        for row in rows:
            data.append({
                "username": row.username,
                "weekly_score": int(row.weekly_score) if row.weekly_score else 0,
                "weekly_solved": row.weekly_solved,
                "rank": row.rank
            })

        await self._cache_setex("leaderboard:week", 60, json.dumps(data))
        return data
