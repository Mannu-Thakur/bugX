import re
import json
import httpx
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.problem import Problem, DifficultyEnum
from app.models.tag import Tag
from app.models.problem_template import ProblemTemplate, ArgStyleEnum
from app.models.test_case import TestCase
from app.services.parsers.gfg_parser import GFGParser
from app.services.problem_import_validation_service import ProblemImportValidationService, ProblemImportValidationError
from app.services.importer_exceptions import (
    ProviderUnavailableException,
    ProblemNotFoundException,
    ImportFailedException
)

logger = logging.getLogger("gfg_importer")

class GFGImporter:
    @staticmethod
    def _parse_slug(url_or_slug: str) -> str:
        url_or_slug = url_or_slug.strip().lower()
        if "/" in url_or_slug:
            parts = [p for p in url_or_slug.split("/") if p]
            if "problems" in parts:
                idx = parts.index("problems")
                if idx + 1 < len(parts):
                    return parts[idx + 1]
            return parts[-1]
        slug = re.sub(r"[^a-z0-9-]", "", re.sub(r"\s+", "-", url_or_slug)).strip("-")
        return slug if slug else url_or_slug

    @classmethod
    async def resolve_slug(cls, input_str: str) -> tuple[str | None, dict]:
        """
        Resolves the input string into a GeeksforGeeks problem slug using a multi-stage pipeline:
        Stage 1: Check Alias Cache.
        Stage 2: Direct exact slug candidate checking.
        Stage 3: GFG Search API matching using multiple variants.
        Stage 4: Fuzzy matching and ranking on search results.
        Returns: (resolved_slug, trace_info_dict)
        """
        from app.services.import_utils import AliasCache, normalize_title_aggressive, compute_match_score, get_search_variants, fetch_with_retry
        
        trace = {
            "input": input_str,
            "is_url": False,
            "stage": None,
            "search_attempted": False,
            "search_success": False,
            "search_results_count": 0,
            "search_error": None,
            "slugs_tried": [],
        }
        
        query = input_str.strip()
        
        # 1. Alias Cache
        cached_slug = await AliasCache.get("gfg", query)
        if cached_slug:
            trace["stage"] = "alias_cache"
            return cached_slug, trace

        # 2. URL check
        if "/" in query:
            trace["is_url"] = True
            slug = cls._parse_slug(query)
            trace["stage"] = "url_parsing"
            logger.info(f"[GFG Importer] Input detected as URL. Parsed slug: '{slug}'")
            return slug, trace

        # Clean Google/LeetCode/GFG prefixes
        query = re.sub(r"^(google|leetcode|gfg):", "", query, flags=re.IGNORECASE)
        query = re.sub(r"^[:\s\-\.\#\u2013\u2014]+", "", query).strip()

        if not query:
            trace["stage"] = "fallback_unknown"
            return "unknown-problem", trace

        # Stage 1: Direct exact slug matching
        normalized_slug = re.sub(r"[^a-z0-9-]", "", re.sub(r"\s+", "-", query.lower())).strip("-")
        slugs_to_check = [normalized_slug]
        
        if "subarray" in normalized_slug:
            slugs_to_check.append(normalized_slug.replace("subarray", "sub-array"))
        elif "sub-array" in normalized_slug:
            slugs_to_check.append(normalized_slug.replace("sub-array", "subarray"))

        trace["slugs_tried"] = slugs_to_check
        logger.info(f"[GFG Importer] Stage 1: Checking exact direct slug candidates: {slugs_to_check}")

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "*/*",
            "Referer": "https://www.geeksforgeeks.org/",
        }

        async with httpx.AsyncClient() as client:
            for s in slugs_to_check:
                try:
                    meta_url = f"https://practiceapi.geeksforgeeks.org/api/latest/problems/{s}/metainfo/"
                    resp = await fetch_with_retry(client, "GET", meta_url, headers=headers, timeout=5.0)
                    if resp.status_code == 200:
                        logger.info(f"[GFG Importer] Stage 1 Success: Exact slug candidate '{s}' exists on GFG.")
                        trace["stage"] = "stage1_exact_candidate"
                        await AliasCache.set("gfg", input_str, s)
                        return s, trace
                except Exception as e:
                    logger.debug(f"[GFG Importer] Stage 1 check failed for '{s}': {e}")

        # Stage 2: Multiple Search API lookups (variants)
        search_variants = get_search_variants(query)
        logger.info(f"[GFG Importer] Stage 2: Querying GFG Search API with variants: {search_variants}")
        trace["search_attempted"] = True
        search_url = "https://practiceapi.geeksforgeeks.org/api/latest/problems/search/"
        
        problems_collected = []
        seen_slugs = set()
        
        async with httpx.AsyncClient() as client:
            for variant in search_variants:
                try:
                    logger.info(f"[GFG Importer] Searching GFG for variant: '{variant}'")
                    search_resp = await fetch_with_retry(client, "GET", search_url, params={"query": variant}, headers=headers, timeout=8.0)
                    if search_resp.status_code == 200:
                        trace["search_success"] = True
                        search_data = search_resp.json()
                        probs = search_data.get("problems", [])
                        for p in probs:
                            slug = p.get("slug") or cls._parse_slug(p.get("problem_url", ""))
                            if slug and slug not in seen_slugs:
                                seen_slugs.add(slug)
                                problems_collected.append(p)
                except Exception as e:
                    logger.warning(f"[GFG Importer] Search variant '{variant}' failed: {e}")
                    trace["search_error"] = str(e)

        trace["search_results_count"] = len(problems_collected)

        # Check for Stage 2 exact matches first (Stage 2a/2b)
        if problems_collected:
            # 2a: Exact case-insensitive title/name match
            for p in problems_collected:
                name = p.get("problem_name", "").strip()
                if name.lower() == query.lower():
                    slug = p.get("slug") or cls._parse_slug(p.get("problem_url", ""))
                    if slug:
                        logger.info(f"[GFG Importer] Stage 2a Success: Exact case-insensitive match on name '{name}' -> slug '{slug}'")
                        trace["stage"] = "stage2_exact_name"
                        await AliasCache.set("gfg", input_str, slug)
                        return slug, trace
                        
            # 2b: Exact slug match in search results
            for p in problems_collected:
                slug = p.get("slug") or cls._parse_slug(p.get("problem_url", ""))
                if slug in slugs_to_check:
                    logger.info(f"[GFG Importer] Stage 2b Success: Exact slug match '{slug}' found in search results.")
                    trace["stage"] = "stage2_exact_slug"
                    await AliasCache.set("gfg", input_str, slug)
                    return slug, trace
        
        # Stage 3: Fuzzy matching and ranking on collected search results
        if problems_collected:
            logger.info(f"[GFG Importer] Stage 3: Running fuzzy matching and ranking on {len(problems_collected)} candidates.")
            candidates = []
            for p in problems_collected:
                name = p.get("problem_name", "").strip()
                slug = p.get("slug") or cls._parse_slug(p.get("problem_url", ""))
                if not slug:
                    continue
                
                score_title = compute_match_score(query, name)
                score_slug = compute_match_score(query, slug.replace("-", " "))
                best_score = max(score_title, score_slug)
                
                candidates.append({
                    "name": name,
                    "slug": slug,
                    "score": best_score
                })
                
            candidates.sort(key=lambda x: (-x["score"], len(x["slug"])))
            
            if candidates:
                best_cand = candidates[0]
                best_score = best_cand["score"]
                best_name = best_cand["name"]
                best_slug = best_cand["slug"]
                
                # Check fuzzy match threshold (0.80)
                if best_score >= 0.80:
                    # Compare against second best to prevent ambiguous incorrect imports
                    if len(candidates) > 1:
                        sec_cand = candidates[1]
                        sec_score = sec_cand["score"]
                        sec_name = sec_cand["name"]
                        
                        if sec_score >= 0.75 and (best_score - sec_score) < 0.03:
                            logger.warning(
                                f"[GFG Importer] Stage 3 Ambiguity detected between: "
                                f"'{best_name}' (score {best_score:.2f}) and "
                                f"'{sec_name}' (score {sec_score:.2f})"
                            )
                            trace["search_error"] = f"Ambiguity between '{best_name}' and '{sec_name}'"
                            trace["stage"] = "stage3_fuzzy_ambiguous"
                            trace["ambig_candidates"] = [
                                {
                                    "title": c["name"],
                                    "slug": c["slug"],
                                    "platform": "gfg",
                                    "score": round(c["score"], 2)
                                }
                                for c in candidates if c["score"] >= 0.75
                            ]
                            return None, trace
                            
                    logger.info(f"[GFG Importer] Stage 3 Success: Best match '{best_slug}' with score {best_score:.2f}")
                    trace["stage"] = "stage3_fuzzy"
                    await AliasCache.set("gfg", input_str, best_slug)
                    return best_slug, trace
                else:
                    logger.info(f"[GFG Importer] Stage 3 Reject: Best score {best_score:.2f} for '{best_name}' is below threshold 0.80.")
                    trace["search_error"] = f"Best match '{best_name}' score {best_score:.2f} is below safety threshold 0.80"

        logger.warning(f"[GFG Importer] Discovery Pipeline failed. No valid slug match found for query: '{query}'")
        trace["stage"] = "failed_to_resolve"
        return None, trace

    @classmethod
    async def import_problem(cls, session: AsyncSession, url_or_slug: str) -> Problem:
        from app.services.import_utils import AliasCache, fetch_with_retry
        try:
            slug, trace = await cls.resolve_slug(url_or_slug)
        except Exception as resolve_err:
            logger.error(f"[GFG Importer] Resolve slug failed for '{url_or_slug}': {resolve_err}")
            raise ProblemNotFoundException(f"Could not resolve problem slug for '{url_or_slug}': {resolve_err}")
            
        logger.info(f"[GFG Importer] Resolved slug to: '{slug}' | Trace: {trace}")

        if not slug:
            if trace.get("is_url"):
                raise ProblemNotFoundException(
                    f"The GeeksforGeeks URL provided does not exist (returned 404). Please verify the URL."
                )
            
            search_err = trace.get("search_error")
            if trace.get("search_success"):
                if trace.get("search_results_count") == 0:
                    raise ProblemNotFoundException(
                        f"The problem '{url_or_slug}' truly does not exist on GeeksforGeeks. No search results found."
                    )
                elif search_err and "ambiguity" in search_err.lower():
                    from app.services.importer_exceptions import AmbiguousProblemException
                    raise AmbiguousProblemException(
                        message=f"Multiple potential matches found for '{url_or_slug}'. Please select the correct one.",
                        candidates=trace.get("ambig_candidates", [])
                    )
                else:
                    raise ProblemNotFoundException(
                        f"Could not locate problem '{url_or_slug}' on GeeksforGeeks. "
                        f"Details: {search_err or 'Did not match safety threshold (0.80).'}. "
                        "Please check the spelling or try importing using its direct GeeksforGeeks URL."
                    )
            else:
                raise ProblemNotFoundException(
                    f"Could not locate problem '{url_or_slug}' on GeeksforGeeks. "
                    f"The search API was unreachable ({search_err or 'Unknown error'}), and direct lookup on guessed slugs failed. "
                    "If the problem exists, please try importing using its direct GeeksforGeeks URL."
                )

        # Check if problem already exists
        exist_stmt = select(Problem).where(Problem.slug == slug)
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
            if is_stale:
                print(f"[GFGImporter] Purging stale placeholder problem '{slug}'...")
                await session.delete(existing)
                await session.flush()
            else:
                return existing

        # Fetch raw data using fetch_question_data
        try:
            prob_data = await cls.fetch_question_data(slug)
        except Exception as fetch_err:
            logger.error(f"[GFG Importer] Fetch failed for '{slug}': {fetch_err}")
            raise

        # Parsing Phase
        logger.info(f"Parsing GeeksforGeeks content for slug: '{slug}'")
        try:
            dto = GFGParser.parse_question_data(slug, prob_data)
            logger.debug(f"Parsed DTO for GFG '{slug}': {json.dumps(dto)}")
        except Exception as parse_err:
            logger.error(f"Parser failure for GFG slug '{slug}': {parse_err}")
            raise ImportParserError(f"Parser failure for GFG slug '{slug}': {parse_err}")

        # Validation Phase
        logger.info(f"Validating GFG DTO for slug: '{slug}'")
        try:
            ProblemImportValidationService.validate_dto(dto)
        except ProblemImportValidationError as val_err:
            logger.error(f"Validation failure for GFG slug '{slug}': {val_err.message}")
            raise
        except Exception as val_err:
            logger.error(f"Validation error for GFG slug '{slug}': {val_err}")
            raise ImportValidationError(f"Validation error for GFG slug '{slug}': {val_err}")

        # Save Phase: construct DB models
        logger.info(f"Saving GeeksforGeeks problem to DB: '{slug}'")
        try:
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

            comp_mode = "order_agnostic" if any(kw in slug.lower() for kw in ["three-sum", "3sum", "3-sum", "two-sum", "group-anagrams"]) else "strict"

            problem = Problem(
                slug=dto["slug"],
                title=dto["title"],
                description=dto["description"],
                difficulty=dto["difficulty"],
                time_limit_ms=2000,
                memory_limit_kb=262144,
                score_base=score_base,
                runtime_bonus_max=20,
                is_published=True,
                tags=tags_list,
                templates=templates_list,
                test_cases=test_cases_objs,
                comparison_mode=comp_mode,
                source="gfg"
            )

            # Link companies and topics
            from app.services.company_service import CompanyService
            from app.services.topic_service import TopicService

            topics_objs = []
            for t_obj in tags_list:
                topic = await TopicService.find_or_create_topic(session, t_obj.name)
                topics_objs.append(topic)
            problem.topics = topics_objs

            companies_objs = []
            raw_companies = dto.get("company_tags", [])
            for c_name in raw_companies:
                company = await CompanyService.find_or_create_company(session, c_name)
                companies_objs.append(company)

            # Also check implicit keyword tags
            title_lower = problem.title.lower()
            slug_lower = problem.slug.lower()
            company_keywords = {
                "google": "Google",
                "amazon": "Amazon",
                "meta": "Meta",
                "facebook": "Meta",
                "microsoft": "Microsoft",
                "apple": "Apple",
                "uber": "Uber"
            }
            for kw, co_name in company_keywords.items():
                if kw in title_lower or kw in slug_lower:
                    company = await CompanyService.find_or_create_company(session, co_name)
                    if company not in companies_objs:
                        companies_objs.append(company)
            problem.companies = companies_objs

            session.add(problem)
            await session.flush()

            # Invalidate stats cache
            from app.services.statistics_service import StatisticsService
            await StatisticsService.invalidate_overview_cache()

            logger.info(f"Successfully imported and saved GeeksforGeeks problem: '{slug}'")
            return problem
        except Exception as db_err:
            logger.error(f"Database save failure for GFG slug '{slug}': {db_err}")
            raise ImportDatabaseError(f"Database save failure for GFG slug '{slug}': {db_err}")

    @classmethod
    async def fetch_question_data(cls, slug: str) -> dict:
        """
        Exposes source-specific detail fetch/scrape behavior.
        Raises ImportNetworkError, ImportProviderUnavailableError, ImportNotFoundError, or ImportParserError.
        """
        from app.services.import_utils import fetch_with_retry
        from app.services.importer_exceptions import (
            ImportNetworkError,
            ImportProviderUnavailableError,
            ImportNotFoundError,
            ImportParserError
        )
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.geeksforgeeks.org/",
        }

        # Generate slug variations to be robust against minor differences during direct scrape
        slugs = [slug]
        parsed_orig = cls._parse_slug(slug)
        if parsed_orig not in slugs:
            slugs.append(parsed_orig)

        prob_data = None
        successful_slug = None
        last_status = None
        connection_error = False
        connection_error_msg = None

        logger.info(f"Scraping GeeksforGeeks candidates for slug: '{slug}'")
        async with httpx.AsyncClient() as client:
            for s in slugs:
                url_candidates = [
                    f"https://www.geeksforgeeks.org/problems/{s}/1",
                    f"https://www.geeksforgeeks.org/problems/{s}/",
                    f"https://www.geeksforgeeks.org/problems/{s}",
                ]
                for url_candidate in url_candidates:
                    try:
                        resp = await fetch_with_retry(client, "GET", url_candidate, headers=headers, timeout=20.0, follow_redirects=True)
                        last_status = resp.status_code
                        if resp.status_code != 200:
                            logger.info(f"URL {url_candidate} returned {resp.status_code}, trying next...")
                            continue

                        html_text = resp.text
                        match = re.search(r'<script\s+id="__NEXT_DATA__"\s+type="application/json">(.*?)</script>', html_text, re.DOTALL)
                        if not match:
                            match = re.search(r'<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>', html_text, re.DOTALL)
                        if not match:
                            logger.info(f"URL {url_candidate} returned 200 but no __NEXT_DATA__ script found, trying next...")
                            continue

                        try:
                            next_data = json.loads(match.group(1).strip())
                        except Exception as e:
                            logger.error(f"Failed to parse __NEXT_DATA__ JSON: {e}")
                            raise ImportParserError(f"Failed to parse __NEXT_DATA__ JSON: {e}")

                        logger.debug(f"Raw NEXT DATA payload for '{s}': {json.dumps(next_data)[:2000]}")

                        initial_state = next_data
                        if "props" in next_data:
                            initial_state = next_data.get("props", {}).get("pageProps", {}).get("initialState", next_data.get("props", {}).get("pageProps", {}))

                        candidate_prob_data = None
                        queries = initial_state.get("problemApi", {}).get("queries", {})
                        for q_key, q_val in queries.items():
                            if "getProblemDetails" in q_key or "problem" in q_key.lower():
                                candidate = q_val.get("data", {})
                                if candidate and candidate.get("problem_name"):
                                    candidate_prob_data = candidate
                                    break

                        if not candidate_prob_data:
                            candidate_prob_data = initial_state.get("problemData", {}).get("allData", {}).get("probData") or None

                        if not candidate_prob_data:
                            page_props = next_data.get("props", {}).get("pageProps", {})
                            for key in ["problem", "probData", "problemData", "data"]:
                                if isinstance(page_props.get(key), dict) and page_props[key].get("problem_name"):
                                    candidate_prob_data = page_props[key]
                                    break

                        if not candidate_prob_data:
                            def deep_find_problem(d: dict, depth: int = 0) -> dict | None:
                                if depth > 6:
                                    return None
                                if isinstance(d, dict):
                                    if d.get("problem_name") and d.get("problem_question"):
                                        return d
                                    for v in d.values():
                                        result = deep_find_problem(v, depth + 1)
                                        if result:
                                            return result
                                elif isinstance(d, list):
                                    for item in d:
                                        result = deep_find_problem(item, depth + 1)
                                        if result:
                                            return result
                                return None
                            candidate_prob_data = deep_find_problem(next_data)

                        if candidate_prob_data and candidate_prob_data.get("problem_name"):
                            prob_data = candidate_prob_data
                            successful_slug = s
                            logger.info(f"Successfully fetched problem details from {url_candidate}")
                            break
                        else:
                            logger.info(f"URL {url_candidate} returned 200 but prob_data was missing/invalid in __NEXT_DATA__, trying next...")
                    except ImportParserError:
                        raise
                    except httpx.RequestError as req_err:
                        connection_error = True
                        connection_error_msg = str(req_err)
                        logger.error(f"Network error requesting {url_candidate}: {req_err}")
                    except Exception as parse_err:
                        logger.error(f"Failed parsing {url_candidate}: {parse_err}")
                if prob_data:
                    break

        if not prob_data:
            logger.error(f"Failed to find GFG problem details for slug '{slug}' (last status: {last_status}, connection error: {connection_error})")
            
            if connection_error or (last_status and last_status >= 500):
                raise ImportProviderUnavailableError(
                    f"GeeksforGeeks is unreachable or returned a server error (status code: {last_status}). "
                    f"Details: {connection_error_msg or 'Server Error'}"
                )
            elif last_status in (403, 429):
                raise ImportProviderUnavailableError(
                    "GeeksforGeeks blocked the request (anti-bot protection or rate-limiting). Please try again later."
                )
            
            raise ImportNotFoundError(
                f"The problem '{slug}' truly does not exist on GeeksforGeeks. Details: The page returned status code: {last_status}."
            )

        return prob_data

