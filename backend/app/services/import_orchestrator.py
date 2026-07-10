import time
import re
import asyncio
import logging
import json
import httpx
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert

from app.models.problem import Problem, DifficultyEnum
from app.models.tag import Tag
from app.models.problem_template import ProblemTemplate, ArgStyleEnum
from app.models.test_case import TestCase

from app.services.import_utils import (
    normalize_title_aggressive,
    get_search_variants,
    compute_candidate_score,
    AliasDatabase,
    AliasCache,
    IS_TESTING
)
from app.services.importer_exceptions import (
    ImportNetworkError,
    ImportProviderUnavailableError,
    ImportParserError,
    ImportValidationError,
    ImportDatabaseError,
    ImportNotFoundError,
    AmbiguousProblemException
)
from app.services.parsers.leetcode_parser import LeetCodeParser
from app.services.parsers.gfg_parser import GFGParser
from app.services.leetcode_importer import LeetCodeImporter
from app.services.gfg_importer import GFGImporter
from app.services.problem_import_validation_service import ProblemImportValidationService, ProblemImportValidationError

logger = logging.getLogger("import_orchestrator")

# In-memory metrics fallback
METRICS = {
    "successful_imports": 0,
    "failed_imports": 0,
    "not_found_count": 0,
    "parser_failures": 0,
    "cache_hits": 0,
    "cache_misses": 0,
    "total_import_time_s": 0.0,
    "source_distribution": {
        "leetcode": 0,
        "gfg": 0
    }
}
metrics_lock = asyncio.Lock()

async def record_metric(name: str, value: any = 1, increment_dict: str = None):
    # Update local fallback METRICS
    async with metrics_lock:
        if increment_dict:
            dict_ref = METRICS.setdefault(increment_dict, {})
            dict_ref[name] = dict_ref.get(name, 0) + value
        else:
            if isinstance(value, (int, float)):
                METRICS[name] = METRICS.get(name, 0) + value
            else:
                METRICS[name] = value

    # Update Redis metrics
    if not IS_TESTING:
        try:
            from redis.asyncio import Redis
            from app.core.config import get_settings
            settings = get_settings()
            redis = Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=0.5, socket_timeout=0.5)
            try:
                if increment_dict:
                    await redis.incrby(f"metrics:{increment_dict}:{name}", value)
                else:
                    if isinstance(value, float):
                        await redis.incrbyfloat(f"metrics:{name}", value)
                    elif isinstance(value, int):
                        await redis.incrby(f"metrics:{name}", value)
            finally:
                await redis.aclose()
        except Exception as redis_err:
            logger.debug(f"Redis record_metric failed: {redis_err}")

async def record_metric_latency(latency_s: float):
    # Determine bucket
    buckets = [0.5, 1.0, 2.5, 5.0, 10.0, 30.0]
    chosen_bucket = "inf"
    for b in buckets:
        if latency_s <= b:
            chosen_bucket = str(b)
            break
            
    if not IS_TESTING:
        try:
            from redis.asyncio import Redis
            from app.core.config import get_settings
            settings = get_settings()
            redis = Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=0.5, socket_timeout=0.5)
            try:
                await redis.hincrby("metrics:latency_histogram", chosen_bucket, 1)
            finally:
                await redis.aclose()
        except Exception as redis_err:
            logger.debug(f"Redis record_metric_latency failed: {redis_err}")

async def record_failure_category(error_type: str):
    if not IS_TESTING:
        try:
            from redis.asyncio import Redis
            from app.core.config import get_settings
            settings = get_settings()
            redis = Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=0.5, socket_timeout=0.5)
            try:
                await redis.hincrby("metrics:failure_categories", error_type, 1)
            finally:
                await redis.aclose()
        except Exception as redis_err:
            logger.debug(f"Redis record_failure_category failed: {redis_err}")

async def record_provider_call(provider: str, latency_ms: float, success: bool, is_timeout: bool = False):
    if not IS_TESTING:
        try:
            from redis.asyncio import Redis
            from app.core.config import get_settings
            settings = get_settings()
            redis = Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=0.5, socket_timeout=0.5)
            try:
                await redis.incr(f"health:{provider}:total_calls")
                await redis.incrbyfloat(f"health:{provider}:total_time_ms", latency_ms)
                if not success:
                    await redis.incr(f"health:{provider}:failures")
                    if is_timeout:
                        await redis.incr(f"health:{provider}:timeouts")
            finally:
                await redis.aclose()
        except Exception as redis_err:
            logger.debug(f"Redis record_provider_call failed: {redis_err}")

async def record_ranking_decision(query: str, candidates: list, decision: str):
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "query": query,
        "decision": decision,
        "candidates": [
            {
                "title": c.get("title", ""),
                "slug": c.get("slug", ""),
                "source": c.get("source", ""),
                "score": round(c.get("score", 0.0), 3),
                "direct": c.get("direct", False)
            }
            for c in candidates
        ]
    }
    
    # Python logger output (Confidence Analytics)
    logger.info(f"[CONFIDENCE_ANALYTICS] Query: '{query}' | Decision: {decision} | Candidates: "
                f"{json.dumps(log_entry['candidates'])}")
                
    if not IS_TESTING:
        try:
            from redis.asyncio import Redis
            from app.core.config import get_settings
            settings = get_settings()
            redis = Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=0.5, socket_timeout=0.5)
            try:
                await redis.lpush("metrics:ranking_log", json.dumps(log_entry))
                await redis.ltrim("metrics:ranking_log", 0, 99)
            finally:
                await redis.aclose()
        except Exception as redis_err:
            logger.debug(f"Redis record_ranking_decision failed: {redis_err}")

async def get_metrics():
    if not IS_TESTING:
        try:
            from redis.asyncio import Redis
            from app.core.config import get_settings
            settings = get_settings()
            redis = Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=0.5, socket_timeout=0.5)
            try:
                success = int(await redis.get("metrics:successful_imports") or 0)
                failed = int(await redis.get("metrics:failed_imports") or 0)
                not_found = int(await redis.get("metrics:not_found_count") or 0)
                parser_fail = int(await redis.get("metrics:parser_failures") or 0)
                hits = int(await redis.get("metrics:cache_hits") or 0)
                misses = int(await redis.get("metrics:cache_misses") or 0)
                total_time = float(await redis.get("metrics:total_import_time_s") or 0.0)
                
                lc_usage = int(await redis.get("metrics:source_distribution:leetcode") or 0)
                gfg_usage = int(await redis.get("metrics:source_distribution:gfg") or 0)
                
                total_cache_lookups = hits + misses
                hit_rate = hits / total_cache_lookups if total_cache_lookups > 0 else 0.0
                avg_time = total_time / success if success > 0 else 0.0
                
                return {
                    "successful_imports": success,
                    "failed_imports": failed,
                    "not_found_count": not_found,
                    "parser_failures": parser_fail,
                    "cache_hit_rate": hit_rate,
                    "average_import_time_s": avg_time,
                    "source_distribution": {
                        "leetcode": lc_usage,
                        "gfg": gfg_usage
                    }
                }
            finally:
                await redis.aclose()
        except Exception as redis_err:
            logger.warning(f"Redis metrics retrieval failed: {redis_err}. Falling back to local stats.")

    # Local fallback
    async with metrics_lock:
        hits = METRICS["cache_hits"]
        misses = METRICS["cache_misses"]
        total_cache_lookups = hits + misses
        hit_rate = hits / total_cache_lookups if total_cache_lookups > 0 else 0.0
        success = METRICS["successful_imports"]
        avg_time = METRICS["total_import_time_s"] / success if success > 0 else 0.0
        return {
            "successful_imports": success,
            "failed_imports": METRICS["failed_imports"],
            "not_found_count": METRICS["not_found_count"],
            "parser_failures": METRICS["parser_failures"],
            "cache_hit_rate": hit_rate,
            "average_import_time_s": avg_time,
            "source_distribution": METRICS["source_distribution"].copy()
        }

class ImportOrchestrator:
    @classmethod
    async def import_problem(cls, session: AsyncSession, url_or_slug: str, job_id: str = None) -> Problem:
        start_time = time.time()
        logger.info(f"Starting import flow for: '{url_or_slug}' (Job ID: {job_id})")
        
        # Helper to update background progress safely
        async def update_job_progress(progress_val: int):
            if job_id:
                try:
                    from app.services.import_job_manager import ImportJobManager
                    await ImportJobManager.update_progress(job_id, progress_val)
                except Exception as err:
                    logger.debug(f"Failed to update progress: {err}")

        # 1. URL Detection & Platform Extraction
        # [URL_DETECTION]
        await update_job_progress(10)
        platform = None
        extracted_slug = None
        
        url_or_slug_clean = url_or_slug.strip()
        
        if "leetcode.com" in url_or_slug_clean:
            platform = "leetcode"
            extracted_slug = cls._parse_leetcode_slug(url_or_slug_clean)
            logger.info(f"[URL_DETECTION] Detected LeetCode URL. Slug: '{extracted_slug}'")
        elif "geeksforgeeks.org" in url_or_slug_clean:
            platform = "gfg"
            extracted_slug = cls._parse_gfg_slug(url_or_slug_clean)
            logger.info(f"[URL_DETECTION] Detected GeeksforGeeks URL. Slug: '{extracted_slug}'")
        else:
            if url_or_slug_clean.lower().startswith("leetcode:"):
                platform = "leetcode"
                extracted_slug = url_or_slug_clean[len("leetcode:"):].strip()
                logger.info(f"[URL_DETECTION] Prefix detected LeetCode. Slug/Query: '{extracted_slug}'")
            elif url_or_slug_clean.lower().startswith("gfg:"):
                platform = "gfg"
                extracted_slug = url_or_slug_clean[len("gfg:"):].strip()
                logger.info(f"[URL_DETECTION] Prefix detected GeeksforGeeks. Slug/Query: '{extracted_slug}'")
            else:
                logger.info("[URL_DETECTION] No URL or source prefix detected. Treating as query.")
                
        # 2. Direct Slug / URL Resolution & Alias Lookup
        await update_job_progress(20)
        candidates = []
        
        if platform and extracted_slug:
            extracted_slug = extracted_slug.split("/")[0]
            logger.info(f"[DIRECT_SLUG] Checking direct slug candidates for {platform}: '{extracted_slug}'")
            candidates.append({
                "title": extracted_slug.replace("-", " "),
                "slug": extracted_slug,
                "source": platform,
                "score": 1.0,
                "direct": True
            })

        # 3. Alias Lookup (check ProblemAlias cache in DB / Redis)
        # [ALIAS_LOOKUP]
        db_alias = None
        try:
            db_alias = await AliasDatabase.get(session, "leetcode", url_or_slug_clean)
            if not db_alias:
                db_alias = await AliasDatabase.get(session, "gfg", url_or_slug_clean)
                
            if db_alias:
                cached_slug, cached_source = db_alias
                logger.info(f"[ALIAS_LOOKUP] Cache hit for '{url_or_slug_clean}' -> '{cached_slug}' (source: {cached_source})")
                await record_metric("cache_hits")
                candidates.append({
                    "title": cached_slug.replace("-", " "),
                    "slug": cached_slug,
                    "source": cached_source,
                    "score": 1.0,
                    "direct": True
                })
            else:
                await record_metric("cache_misses")
        except Exception as cache_err:
            logger.warning(f"[ALIAS_LOOKUP] Database cache query failed: {cache_err}")

        # Check static SLUG_ALIASES and GOOGLE_ALIASES
        query_normalized = normalize_title_aggressive(url_or_slug_clean)
        from app.services.leetcode_importer import SLUG_ALIASES as LC_ALIASES
        alias_lc = LC_ALIASES.get(url_or_slug_clean.lower().replace(" ", "").replace("-", ""))
        if alias_lc:
            logger.info(f"[DIRECT_SLUG] Static LeetCode alias match: '{url_or_slug_clean}' -> '{alias_lc}'")
            candidates.append({
                "title": alias_lc.replace("-", " "),
                "slug": alias_lc,
                "source": "leetcode",
                "score": 1.0,
                "direct": True
            })
            
        from app.services.google_importer import GOOGLE_ALIASES as G_ALIASES
        alias_g = G_ALIASES.get(url_or_slug_clean.lower().replace(" ", "").replace("-", "")) or G_ALIASES.get(query_normalized)
        if alias_g:
            logger.info(f"[DIRECT_SLUG] Static Google alias match: '{url_or_slug_clean}' -> '{alias_g}'")
            candidates.append({
                "title": alias_g.replace("-", " "),
                "slug": alias_g,
                "source": "leetcode",
                "score": 1.0,
                "direct": True
            })

        # 3.5 Check Candidates Cache
        norm_q = normalize_title_aggressive(url_or_slug_clean)
        candidates_list = []
        candidates_cache_hit = False
        
        if norm_q and not IS_TESTING:
            try:
                from redis.asyncio import Redis
                from app.core.config import get_settings
                settings = get_settings()
                redis = Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=0.5, socket_timeout=0.5)
                try:
                    cached_cand = await redis.get(f"import_cache:candidates:{norm_q}")
                    if cached_cand:
                        candidates_list = json.loads(cached_cand)
                        logger.info(f"[Candidates Cache Hit] '{url_or_slug_clean}' -> {len(candidates_list)} candidates")
                        await record_metric("cache_hits")
                        candidates_cache_hit = True
                finally:
                    await redis.aclose()
            except Exception as redis_err:
                logger.warning(f"Redis error checking candidate cache: {redis_err}")

        if not candidates_cache_hit:
            await record_metric("cache_misses")
            # 4. Variant Expansion
            # [QUERY_VARIANT]
            await update_job_progress(40)
            variants = get_search_variants(url_or_slug_clean)
            logger.info(f"[QUERY_VARIANT] Generated search variants: {variants}")

            # 5. Parallel Source Search
            # [SEARCH_API]
            search_sources = ["leetcode", "gfg"]
            if platform:
                search_sources = [platform]

            lc_search_task = None
            gfg_search_tasks = []
            
            if "leetcode" in search_sources:
                lc_search_task = asyncio.create_task(cls._search_leetcode())
                
            if "gfg" in search_sources:
                for variant in variants:
                    gfg_search_tasks.append(asyncio.create_task(cls._search_gfg(variant)))

            lc_pairs = []
            gfg_problems = []
            
            if lc_search_task:
                try:
                    lc_pairs = await lc_search_task
                except Exception as e:
                    logger.warning(f"[SEARCH_API] LeetCode search failed: {e}")
                    
            if gfg_search_tasks:
                try:
                    gfg_results = await asyncio.gather(*gfg_search_tasks, return_exceptions=True)
                    for res in gfg_results:
                        if isinstance(res, list):
                            gfg_problems.extend(res)
                        elif isinstance(res, Exception):
                            logger.warning(f"[SEARCH_API] A GFG search task failed: {res}")
                except Exception as e:
                    logger.warning(f"[SEARCH_API] GFG parallel search failed: {e}")

            # 6. Candidate Collection
            # [CANDIDATE_COLLECTION]
            for pair in lc_pairs:
                stat = pair.get("stat", {})
                slug = stat.get("question__title_slug", "")
                title = stat.get("question__title", "")
                
                best_score = 0.0
                for variant in variants:
                    score = compute_candidate_score(variant, title, slug, 0.95)
                    if score > best_score:
                        best_score = score
                        
                if best_score >= 0.70:
                    candidates.append({
                        "title": title,
                        "slug": slug,
                        "source": "leetcode",
                        "score": best_score
                    })

            for p in gfg_problems:
                name = p.get("problem_name", "").strip()
                slug = p.get("slug") or cls._parse_gfg_slug(p.get("problem_url", ""))
                if not slug:
                    continue
                    
                best_score = 0.0
                for variant in variants:
                    score = compute_candidate_score(variant, name, slug, 0.90)
                    if score > best_score:
                        best_score = score
                        
                if best_score >= 0.70:
                    candidates.append({
                        "title": name,
                        "slug": slug,
                        "source": "gfg",
                        "score": best_score
                    })

            # Remove duplicate candidates
            unique_candidates = {}
            for c in candidates:
                key = (c["source"], c["slug"])
                if key not in unique_candidates:
                    unique_candidates[key] = c
                else:
                    existing = unique_candidates[key]
                    if c.get("direct") or c["score"] > existing["score"]:
                        unique_candidates[key] = c
                        
            candidates_list = list(unique_candidates.values())
            logger.info(f"[CANDIDATE_COLLECTION] Collected {len(candidates_list)} candidates.")

            # Save to Redis candidates cache
            if norm_q and not IS_TESTING and candidates_list:
                try:
                    from redis.asyncio import Redis
                    from app.core.config import get_settings
                    settings = get_settings()
                    redis = Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=0.5, socket_timeout=0.5)
                    try:
                        await redis.set(
                            f"import_cache:candidates:{norm_q}",
                            json.dumps(candidates_list),
                            ex=settings.IMPORT_CACHE_TTL
                        )
                    finally:
                        await redis.aclose()
                except Exception as redis_err:
                    logger.warning(f"Redis error setting candidate cache: {redis_err}")

        # 7. Candidate Ranking
        # [RANKING]
        await update_job_progress(60)
        if not candidates_list:
            logger.error("[RANKING] No candidates found.")
            await record_metric("not_found_count")
            await record_metric("failed_imports")
            await record_failure_category("not_found")
            if job_id:
                from app.services.import_job_manager import ImportJobManager
                await ImportJobManager.fail_job(job_id, f"Could not locate problem '{url_or_slug}' on any provider.")
            raise ImportNotFoundError(f"Could not locate problem '{url_or_slug}' on any provider.")
            
        candidates_list.sort(key=lambda x: (-x["score"], len(x["slug"])))
        best_cand = candidates_list[0]
        
        logger.info(f"[RANKING] Best candidate: '{best_cand['title']}' (slug: '{best_cand['slug']}', source: {best_cand['source']}, score: {best_cand['score']:.2f})")
        
        if best_cand["score"] < 0.80 and not best_cand.get("direct"):
            logger.error(f"[RANKING] Best candidate score {best_cand['score']:.2f} is below safety threshold 0.80.")
            await record_metric("not_found_count")
            await record_metric("failed_imports")
            await record_failure_category("not_found")
            if job_id:
                from app.services.import_job_manager import ImportJobManager
                await ImportJobManager.fail_job(job_id, f"Could not find a high-confidence match for '{url_or_slug}' online.")
            raise ImportNotFoundError(f"Could not find a high-confidence match for '{url_or_slug}' online.")
            
        if len(candidates_list) > 1 and not best_cand.get("direct"):
            sec_cand = candidates_list[1]
            # Verify if this is a real conflict before failing
            if sec_cand["score"] >= 0.75 and (best_cand["score"] - sec_cand["score"]) < 0.03:
                # If they both share the exact same normalized title or slug, they are not ambiguous conflicts (just minor spelling variants)
                if normalize_title_aggressive(best_cand["title"]) != normalize_title_aggressive(sec_cand["title"]):
                    logger.warning(f"[RANKING] Ambiguity detected between: '{best_cand['title']}' and '{sec_cand['title']}'")
                    await record_metric("failed_imports")
                    await record_failure_category("ambiguous_match")
                    if job_id:
                        from app.services.import_job_manager import ImportJobManager
                        await ImportJobManager.fail_job(job_id, f"Multiple potential matches found for '{url_or_slug}'.")
                    raise AmbiguousProblemException(
                        message=f"Multiple potential matches found for '{url_or_slug}'.",
                        candidates=[
                            {"title": c["title"], "slug": c["slug"], "platform": c["source"], "score": round(c["score"], 2)}
                            for c in candidates_list[:5]
                        ]
                    )

        # 8. Source-Specific Detail Fetch
        await update_job_progress(80)
        dto = None
        chosen_source = None
        
        # Parallel detail fetch validation check (conservative)
        use_parallel_fetch = False
        if len(candidates_list) >= 2 and len(candidates_list) <= 3:
            cand1 = candidates_list[0]
            cand2 = candidates_list[1]
            # Top two scores are close (diff <= 0.02), both exceed threshold (>= 0.80)
            if (cand1["score"] - cand2["score"]) <= 0.02 and cand1["score"] >= 0.80 and cand2["score"] >= 0.80:
                use_parallel_fetch = True
                
        if use_parallel_fetch:
            logger.info(f"[PARSER] Concurrently fetching details for {len(candidates_list)} candidates (close scores).")
            await record_ranking_decision(url_or_slug_clean, candidates_list, decision="PARALLEL_FETCH")
            
            # Start concurrent fetches without DB access
            tasks = []
            for cand in candidates_list:
                tasks.append(asyncio.create_task(cls._fetch_and_parse_candidate(cand)))
                
            valid_dto = None
            first_source = None
            
            try:
                for future in asyncio.as_completed(tasks):
                    try:
                        res = await future
                        if res:
                            valid_dto, first_source = res
                            # Cancel remaining tasks
                            for t in tasks:
                                if not t.done():
                                    t.cancel()
                            break
                    except Exception as parse_e:
                        logger.warning(f"[PARSER] Parallel fetch candidate failed: {parse_e}")
            except Exception as outer_e:
                logger.error(f"[PARSER] Parallel fetch outer failure: {outer_e}")
                
            if valid_dto:
                dto = valid_dto
                chosen_source = first_source
            else:
                await record_metric("failed_imports")
                await record_failure_category("not_found")
                if job_id:
                    from app.services.import_job_manager import ImportJobManager
                    await ImportJobManager.fail_job(job_id, f"Parallel fetch failed for all candidates: '{url_or_slug}'")
                raise ImportNotFoundError(f"Could not fetch data for candidates of query '{url_or_slug}'")
        else:
            # Sequential detail fetch
            await record_ranking_decision(url_or_slug_clean, candidates_list, decision="SEQUENTIAL_FETCH")
            try:
                dto, chosen_source = await cls._fetch_and_parse_candidate(best_cand)
            except Exception as e:
                await record_metric("failed_imports")
                if isinstance(e, ImportNotFoundError):
                    await record_metric("not_found_count")
                    await record_failure_category("not_found")
                elif isinstance(e, ImportProviderUnavailableError):
                    await record_failure_category("provider_unavailable")
                elif isinstance(e, ImportNetworkError):
                    await record_failure_category("network_error")
                elif isinstance(e, ImportParserError):
                    await record_failure_category("parser_error")
                elif isinstance(e, ImportValidationError):
                    await record_failure_category("validation_error")
                else:
                    await record_failure_category("unknown")
                
                if job_id:
                    from app.services.import_job_manager import ImportJobManager
                    await ImportJobManager.fail_job(job_id, str(e))
                raise

        # 11. Database Save
        # [DB_SAVE]
        await update_job_progress(95)
        logger.info(f"[DB_SAVE] Saving problem '{dto['slug']}' to database")
        try:
            # ── Title-based duplicate guard (catches cross-source duplicates) ──────
            # A problem imported from LeetCode and GFG can have different slugs but
            # the same title. Check by normalised title first so we never store two
            # records for the same logical problem.
            from sqlalchemy import func as _func
            title_stmt = select(Problem).where(
                _func.lower(Problem.title) == dto["title"].strip().lower()
            )
            title_res = await session.execute(title_stmt)
            title_existing = title_res.scalar_one_or_none()
            if title_existing:
                title_stale = False
                if title_existing.description:
                    desc_l = title_existing.description.lower()
                    if ("google-style problem placeholder" in desc_l or
                            "backup compiler engine" in desc_l or
                            "analyze the inputs to optimize both runtime" in desc_l):
                        title_stale = True
                if not title_stale:
                    logger.info(
                        f"[DB_SAVE] Problem with title '{dto['title']}' already exists "
                        f"(slug: '{title_existing.slug}'). Returning existing to avoid duplicate."
                    )
                    elapsed = time.time() - start_time
                    await record_metric("successful_imports")
                    await record_metric("total_import_time_s", elapsed)
                    await record_metric_latency(elapsed)
                    await record_metric(chosen_source, 1, "source_distribution")
                    try:
                        await AliasDatabase.set(session, chosen_source, url_or_slug_clean, title_existing.slug)
                    except Exception as cache_err:
                        logger.warning(f"Failed to cache alias: {cache_err}")
                    if job_id:
                        from app.services.import_job_manager import ImportJobManager
                        await ImportJobManager.complete_job(job_id, title_existing.slug, {
                            "title": title_existing.title,
                            "difficulty": title_existing.difficulty.name if hasattr(title_existing.difficulty, "name") else str(title_existing.difficulty),
                            "source": chosen_source
                        })
                    return title_existing
            # ─────────────────────────────────────────────────────────────────────

            exist_stmt = select(Problem).where(Problem.slug == dto["slug"])
            res = await session.execute(exist_stmt)
            existing = res.scalar_one_or_none()
            if existing:
                is_stale = False
                if existing.description:
                    desc_lower = existing.description.lower()
                    if "google-style problem placeholder" in desc_lower or \
                       "backup compiler engine" in desc_lower or \
                       "analyze the inputs to optimize both runtime" in desc_lower:
                        is_stale = True
                if not is_stale:
                    logger.info(f"Problem '{dto['slug']}' already exists. Returning existing.")
                    elapsed = time.time() - start_time
                    await record_metric("successful_imports")
                    await record_metric("total_import_time_s", elapsed)
                    await record_metric_latency(elapsed)
                    await record_metric(chosen_source, 1, "source_distribution")
                    
                    try:
                        await AliasDatabase.set(session, chosen_source, url_or_slug_clean, dto["slug"])
                    except Exception as cache_err:
                        logger.warning(f"Failed to cache alias: {cache_err}")
                        
                    if job_id:
                        from app.services.import_job_manager import ImportJobManager
                        await ImportJobManager.complete_job(job_id, dto["slug"], {
                            "title": dto["title"],
                            "difficulty": dto["difficulty"].name,
                            "source": chosen_source
                        })
                    return existing
                else:
                    logger.info(f"Purging stale placeholder problem '{dto['slug']}'...")
                    await session.delete(existing)
                    await session.flush()

            # Tags
            tags_list = []
            for tg_name in dto["tags"]:
                tag_stmt = select(Tag).where(Tag.name == tg_name)
                tag_res = await session.execute(tag_stmt)
                tag_obj = tag_res.scalar_one_or_none()
                if not tag_obj:
                    tag_obj = Tag(name=tg_name)
                    session.add(tag_obj)
                    await session.flush()
                tags_list.append(tag_obj)

            # Templates
            templates_list = []
            for tpl_data in dto["templates"]:
                templates_list.append(ProblemTemplate(
                    language=tpl_data["language"],
                    template_code=tpl_data["template_code"],
                    function_name=tpl_data["function_name"],
                    arg_style=ArgStyleEnum(tpl_data["arg_style"])
                ))

            # Test Cases
            test_cases_objs = []
            for tc_data in dto["test_cases"]:
                test_cases_objs.append(TestCase(
                    input=tc_data["input"],
                    expected_output=tc_data["expected_output"],
                    is_sample=tc_data["is_sample"],
                    order_index=tc_data["order_index"],
                    weight=tc_data["weight"]
                ))

            score_base = 100
            if dto["difficulty"] == DifficultyEnum.MEDIUM:
                score_base = 200
            elif dto["difficulty"] == DifficultyEnum.HARD:
                score_base = 400

            comp_mode = "order_agnostic" if any(kw in dto["slug"].lower() for kw in ["three-sum", "3sum", "3-sum", "two-sum", "group-anagrams"]) else "strict"

            problem = Problem(
                slug=dto["slug"],
                title=dto["title"],
                description=dto["description"],
                difficulty=dto["difficulty"],
                time_limit_ms=2000,
                memory_limit_kb=262144,
                score_base=score_base,
                runtime_bonus_max=20,
                hints=json.dumps(dto.get("hints", [])),
                is_published=True,
                tags=tags_list,
                templates=templates_list,
                test_cases=test_cases_objs,
                comparison_mode=comp_mode
            )

            session.add(problem)
            await session.flush()
            logger.info(f"[DB_SAVE] Successfully saved problem '{dto['slug']}'")
        except Exception as db_err:
            logger.error(f"[DB_SAVE] Database save failure: {db_err}")
            await record_metric("failed_imports")
            await record_failure_category("database_error")
            if job_id:
                from app.services.import_job_manager import ImportJobManager
                await ImportJobManager.fail_job(job_id, f"Database save failure: {db_err}")
            raise ImportDatabaseError(f"Database save failure: {db_err}")

        try:
            await AliasDatabase.set(session, chosen_source, url_or_slug_clean, dto["slug"])
        except Exception as cache_err:
            logger.warning(f"Failed to cache alias: {cache_err}")

        elapsed = time.time() - start_time
        await record_metric("successful_imports")
        await record_metric("total_import_time_s", elapsed)
        await record_metric_latency(elapsed)
        await record_metric(chosen_source, 1, "source_distribution")
        
        logger.info(f"Import flow completed successfully for '{dto['slug']}' in {elapsed:.2f}s")
        if job_id:
            from app.services.import_job_manager import ImportJobManager
            await ImportJobManager.complete_job(job_id, dto["slug"], {
                "title": dto["title"],
                "difficulty": dto["difficulty"].name,
                "source": chosen_source
            })
        return problem

    @classmethod
    async def _fetch_and_parse_candidate(cls, cand: dict) -> tuple[dict, str]:
        """
        Concurrently safe: does NOT touch the database session.
        Only fetches data from the provider, parses it to a DTO, and validates it.
        """
        chosen_source = cand["source"]
        chosen_slug = cand["slug"]
        
        # 1. Check Circuit Breaker
        from app.utils.circuit_breaker import RedisCircuitBreaker
        cb = RedisCircuitBreaker(chosen_source)
        if not await cb.check_allow_request():
            raise ImportProviderUnavailableError(f"Provider '{chosen_source}' is currently disabled by circuit breaker.")

        # 2. Fetch Details
        start_time = time.time()
        raw_data = None
        try:
            logger.info(f"[PARSER] Fetching details for '{chosen_slug}' from {chosen_source}")
            if chosen_source == "leetcode":
                raw_data = await LeetCodeImporter.fetch_question_data(chosen_slug)
            else:
                raw_data = await GFGImporter.fetch_question_data(chosen_slug)
            
            latency = (time.time() - start_time) * 1000  # ms
            await cb.record_success()
            await record_provider_call(chosen_source, latency, success=True)
            await record_metric(chosen_source, 1, "source_distribution")
        except Exception as fetch_exc:
            latency = (time.time() - start_time) * 1000  # ms
            await cb.record_failure()
            is_timeout = isinstance(fetch_exc, asyncio.TimeoutError) or "timeout" in str(fetch_exc).lower()
            await record_provider_call(chosen_source, latency, success=False, is_timeout=is_timeout)
            raise

        # 3. Parse DTO
        dto = None
        try:
            if chosen_source == "leetcode":
                dto = LeetCodeParser.parse_question_data(chosen_slug, raw_data)
            else:
                dto = GFGParser.parse_question_data(chosen_slug, raw_data)
        except Exception as parse_err:
            logger.error(f"[PARSER] Parser failure for '{chosen_slug}': {parse_err}")
            await record_metric("parser_failures")
            raise ImportParserError(f"Parser failure for '{chosen_slug}': {parse_err}")

        # 4. Validate DTO
        try:
            ProblemImportValidationService.validate_dto(dto)
        except ProblemImportValidationError as val_err:
            logger.error(f"[VALIDATION] Validation failure: {val_err.message}")
            raise ImportValidationError(val_err.message, errors=val_err.errors)
        except Exception as val_err:
            logger.error(f"[VALIDATION] Validation error: {val_err}")
            raise ImportValidationError(str(val_err))

        return dto, chosen_source

    @staticmethod
    def _parse_leetcode_slug(url: str) -> str:
        parts = [p for p in url.split("/") if p]
        if "problems" in parts:
            idx = parts.index("problems")
            if idx + 1 < len(parts):
                return parts[idx + 1]
        return parts[-1]

    @staticmethod
    def _parse_gfg_slug(url: str) -> str:
        url_clean = url.strip().lower()
        if "/" in url_clean:
            parts = [p for p in url_clean.split("/") if p]
            if "problems" in parts:
                idx = parts.index("problems")
                if idx + 1 < len(parts):
                    return parts[idx + 1]
            return parts[-1]
        slug = re.sub(r"[^a-z0-9-]", "", re.sub(r"\s+", "-", url_clean)).strip("-")
        return slug if slug else url_clean

    @staticmethod
    async def _search_leetcode() -> list:
        from app.utils.circuit_breaker import RedisCircuitBreaker
        cb = RedisCircuitBreaker("leetcode")
        if not await cb.check_allow_request():
            logger.warning("[SEARCH_API] LeetCode search skipped: circuit breaker is OPEN.")
            return []

        url = "https://leetcode.com/api/problems/algorithms/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
        
        start_time = time.time()
        try:
            async with httpx.AsyncClient() as client:
                from app.services.import_utils import fetch_with_retry
                resp = await fetch_with_retry(client, "GET", url, headers=headers, timeout=10.0)
                if resp.status_code == 200:
                    await cb.record_success()
                    data = resp.json()
                    return data.get("stat_status_pairs", [])
            return []
        except Exception as e:
            logger.warning(f"[SEARCH_API] LeetCode search failed: {e}")
            await cb.record_failure()
            # Still record calls
            latency = (time.time() - start_time) * 1000
            await record_provider_call("leetcode", latency, success=False)
            return []

    @staticmethod
    async def _search_gfg(query: str) -> list:
        from app.utils.circuit_breaker import RedisCircuitBreaker
        cb = RedisCircuitBreaker("gfg")
        if not await cb.check_allow_request():
            logger.warning(f"[SEARCH_API] GFG search for '{query}' skipped: circuit breaker is OPEN.")
            return []

        url = "https://practiceapi.geeksforgeeks.org/api/latest/problems/search/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "Referer": "https://www.geeksforgeeks.org/",
        }
        
        start_time = time.time()
        try:
            async with httpx.AsyncClient() as client:
                from app.services.import_utils import fetch_with_retry
                resp = await fetch_with_retry(client, "GET", url, params={"query": query}, headers=headers, timeout=8.0)
                if resp.status_code == 200:
                    await cb.record_success()
                    data = resp.json()
                    return data.get("problems", [])
            return []
        except Exception as e:
            logger.warning(f"[SEARCH_API] GFG search for '{query}' failed: {e}")
            await cb.record_failure()
            # Still record calls
            latency = (time.time() - start_time) * 1000
            await record_provider_call("gfg", latency, success=False)
            return []
