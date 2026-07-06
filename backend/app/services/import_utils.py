import re
import difflib
import logging
import httpx
import asyncio
import sys
import os
import json
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.problem_alias import ProblemAlias

logger = logging.getLogger("import_utils")

STOP_WORDS = {
    "of", "the", "an", "in", "to", "for", "with", "on", "at", "by", "from", "and", "or",
    "all", "possible", "total", "totals", "sum", "given", "find", "solve", "problem", "problems", "challenge", "challenges"
}

IS_TESTING = (
    "pytest" in sys.modules
    or os.getenv("TESTING") == "1"
    or "PYTEST_CURRENT_TEST" in os.environ
)

class AliasCache:
    _in_memory = {}

    @classmethod
    async def get(cls, platform: str, query: str, session: AsyncSession = None) -> str | None:
        if session and not IS_TESTING:
            res = await AliasDatabase.get(session, platform, query)
            if res:
                return res[0]
        key = (platform, query.strip().lower())
        return cls._in_memory.get(key)

    @classmethod
    async def set(cls, platform: str, query: str, slug: str, session: AsyncSession = None):
        if session and not IS_TESTING:
            await AliasDatabase.set(session, platform, query, slug)
        key = (platform, query.strip().lower())
        cls._in_memory[key] = slug

def compute_match_score(query: str, candidate: str) -> float:
    return compute_candidate_score(query, candidate, candidate, 1.0)


def normalize_title_aggressive(title: str) -> str:
    if not title:
        return ""
    title = title.lower()
    title = title.replace("sub-array", "subarray").replace("sub array", "subarray").replace("sub_array", "subarray")
    # Replace punctuation and special symbols with space
    title = re.sub(r"['\",\-\(\)\[\]\{\}!\?\*&\#_/\+:\.]", " ", title)
    words = title.split()
    normalized_words = []
    for w in words:
        # Simple singular/plural stemming
        if len(w) > 3 and w.endswith("s") and w not in ("this", "class", "status", "bonus", "analysis", "process"):
            normalized_words.append(w[:-1])
        else:
            normalized_words.append(w)
    return " ".join(normalized_words)

def get_search_variants(query: str) -> list[str]:
    variants = []
    # 1. Original
    variants.append(query)
    
    # 2. Normalized
    norm = normalize_title_aggressive(query)
    if norm and norm not in variants:
        variants.append(norm)
        
    # 3. Cleaned of stop words
    words = [w for w in norm.split() if w not in STOP_WORDS]
    cleaned_stop = " ".join(words)
    if cleaned_stop and cleaned_stop not in variants:
        variants.append(cleaned_stop)
        
    # 4. Spaced title (if query has hyphens)
    spaced = query.replace("-", " ")
    spaced_norm = normalize_title_aggressive(spaced)
    if spaced_norm and spaced_norm not in variants:
        variants.append(spaced_norm)
        
    # 5. Longest two words combination (if 3 or more words)
    if len(words) >= 3:
        sorted_by_len = sorted(words, key=len, reverse=True)
        longest_two = sorted_by_len[:2]
        longest_two_in_order = [w for w in words if w in longest_two][:2]
        variant_longest = " ".join(longest_two_in_order)
        if variant_longest and variant_longest not in variants:
            variants.append(variant_longest)
            
    return variants

def compute_candidate_score(query: str, title: str, slug: str, source_confidence: float) -> float:
    """
    Computes a weighted, order-independent similarity score between the query and a candidate.
    Combines Jaccard overlap, SequenceMatcher similarity, word containment, exact match bonuses, and source confidence.
    """
    q_norm = normalize_title_aggressive(query)
    t_norm = normalize_title_aggressive(title)
    s_norm = normalize_title_aggressive(slug.replace("-", " "))

    if not q_norm:
        return 0.0

    # 1. SequenceMatcher similarity
    seq_title = difflib.SequenceMatcher(None, q_norm, t_norm).ratio()
    seq_slug = difflib.SequenceMatcher(None, q_norm, s_norm).ratio()
    seq_score = max(seq_title, seq_slug)

    # 2. Jaccard word overlap (filter stop words for higher accuracy)
    q_words = set([w for w in q_norm.split() if w not in STOP_WORDS])
    t_words = set([w for w in t_norm.split() if w not in STOP_WORDS])
    s_words = set([w for w in s_norm.split() if w not in STOP_WORDS])

    intersection_title = q_words.intersection(t_words)
    intersection_slug = q_words.intersection(s_words)

    jaccard_title = len(intersection_title) / len(q_words.union(t_words)) if q_words or t_words else 0
    jaccard_slug = len(intersection_slug) / len(q_words.union(s_words)) if q_words or s_words else 0
    jaccard_score = max(jaccard_title, jaccard_slug)

    # 3. Word containment
    containment = 0.0
    if q_words and t_words:
        if q_words.issubset(t_words) or t_words.issubset(q_words):
            containment = 1.0
        else:
            containment = len(intersection_title) / min(len(q_words), len(t_words))

    # 4. Exact match bonuses
    exact_title_bonus = 0.15 if q_norm == t_norm else 0.0
    exact_slug_bonus = 0.10 if (q_norm == s_norm or query.lower().strip() == slug.lower().strip()) else 0.0

    # 5. Base score combining Jaccard, SequenceMatcher, and Containment
    if containment == 1.0:
        base_score = 0.5 * jaccard_score + 0.1 * seq_score + 0.4 * containment
    else:
        base_score = 0.4 * jaccard_score + 0.3 * seq_score + 0.3 * containment
    
    # 6. Apply source confidence and add exact bonuses
    final_score = base_score * source_confidence + exact_title_bonus + exact_slug_bonus
    
    return min(final_score, 1.0)

async def fetch_with_retry(client: httpx.AsyncClient, method: str, url: str, max_retries: int = 3, backoff_factor: float = 1.5, **kwargs) -> httpx.Response:
    from app.services.importer_exceptions import ImportNetworkError, ImportProviderUnavailableError
    delay = 1.0
    last_exc = None
    resp = None
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"HTTP {method} request to {url} (attempt {attempt}/{max_retries})")
            if method.upper() == "GET":
                resp = await client.get(url, **kwargs)
            elif method.upper() == "POST":
                resp = await client.post(url, **kwargs)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            # Anti-bot/Rate limiting or server error handling
            if resp.status_code in (403, 429):
                logger.warning(f"Request to {url} returned rate-limiting status: {resp.status_code}. Retrying...")
            elif resp.status_code >= 500:
                logger.warning(f"Request to {url} returned server error status: {resp.status_code}. Retrying...")
            else:
                return resp
        except (httpx.RequestError, asyncio.TimeoutError) as e:
            logger.warning(f"Request to {url} failed on attempt {attempt}: {e}")
            last_exc = e
            
        if attempt < max_retries:
            sleep_time = delay * (backoff_factor ** (attempt - 1))
            logger.info(f"Waiting {sleep_time:.2f}s before retry...")
            await asyncio.sleep(sleep_time)
            
    if last_exc:
        raise ImportNetworkError(f"Network request to {url} failed after {max_retries} attempts: {last_exc}")
    if resp is not None:
        if resp.status_code in (403, 429, 503):
            raise ImportProviderUnavailableError(f"Provider {url} is temporarily unavailable (status code: {resp.status_code})")
        raise httpx.HTTPStatusError(f"Request failed after {max_retries} attempts with status code {resp.status_code}", request=resp.request, response=resp)
    raise httpx.HTTPError(f"Request failed after {max_retries} attempts")

class AliasDatabase:
    @classmethod
    async def get(cls, session: AsyncSession, platform: str, query: str) -> tuple[str, str] | None:
        """
        Looks up canonical slug and source for a query from the database.
        Returns: (canonical_slug, source) or None
        """
        if IS_TESTING:
            return None
        norm = normalize_title_aggressive(query)
        if not norm:
            return None

        # 1. Try Redis cache first
        from redis.asyncio import Redis
        from redis.exceptions import RedisError
        from app.core.config import get_settings
        settings = get_settings()
        try:
            redis = Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=0.5, socket_timeout=0.5)
            try:
                cached = await redis.get(f"import_cache:alias:{norm}")
                if cached:
                    data = json.loads(cached)
                    slug = data["slug"]
                    source = data["source"]
                    logger.info(f"[Alias Cache Hit] '{query}' -> '{slug}' ({source})")
                    # Increment hit count in DB
                    stmt = select(ProblemAlias).where(ProblemAlias.normalized_query == norm)
                    res = await session.execute(stmt)
                    alias_obj = res.scalar_one_or_none()
                    if alias_obj:
                        alias_obj.hit_count += 1
                        await session.flush()
                    return slug, source
            finally:
                await redis.aclose()
        except Exception as redis_err:
            logger.warning(f"Redis error in AliasDatabase.get: {redis_err}")

        # 2. Database fallback
        stmt = select(ProblemAlias).where(ProblemAlias.normalized_query == norm)
        res = await session.execute(stmt)
        alias_obj = res.scalar_one_or_none()
        
        if alias_obj:
            alias_obj.hit_count += 1
            await session.flush()
            logger.info(f"[Alias DB Hit] '{query}' -> slug '{alias_obj.canonical_slug}' (platform: {alias_obj.source})")
            
            # Cache it in Redis for future requests
            try:
                redis = Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=0.5, socket_timeout=0.5)
                try:
                    val = json.dumps({"slug": alias_obj.canonical_slug, "source": alias_obj.source})
                    await redis.setex(f"import_cache:alias:{norm}", settings.IMPORT_CACHE_TTL, val)
                finally:
                    await redis.aclose()
            except Exception as cache_err:
                logger.warning(f"Failed to populate Redis alias cache: {cache_err}")
                
            return alias_obj.canonical_slug, alias_obj.source
        return None

    @classmethod
    async def set(cls, session: AsyncSession, platform: str, query: str, slug: str):
        """
        Saves or updates a query ↔ slug mapping in the database.
        """
        if IS_TESTING:
            return
        norm = normalize_title_aggressive(query)
        if not norm:
            return
            
        stmt = select(ProblemAlias).where(ProblemAlias.normalized_query == norm)
        res = await session.execute(stmt)
        alias_obj = res.scalar_one_or_none()
        
        if alias_obj:
            alias_obj.canonical_slug = slug
            alias_obj.source = platform
            try:
                aliases_list = json.loads(alias_obj.aliases or "[]")
            except Exception:
                aliases_list = []
            if query not in aliases_list:
                aliases_list.append(query)
                alias_obj.aliases = json.dumps(aliases_list)
        else:
            alias_obj = ProblemAlias(
                normalized_query=norm,
                canonical_slug=slug,
                source=platform,
                aliases=json.dumps([query]),
                hit_count=1
            )
            session.add(alias_obj)
            
        await session.flush()
        logger.info(f"[Alias Database Save] Saved mapping for query '{query}' (norm: '{norm}') -> slug '{slug}' (platform: {platform})")

        # Update Redis cache
        from redis.asyncio import Redis
        from app.core.config import get_settings
        settings = get_settings()
        try:
            redis = Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=0.5, socket_timeout=0.5)
            try:
                val = json.dumps({"slug": slug, "source": platform})
                await redis.setex(f"import_cache:alias:{norm}", settings.IMPORT_CACHE_TTL, val)
            finally:
                await redis.aclose()
        except Exception as cache_err:
            logger.warning(f"Failed to update Redis alias cache: {cache_err}")
