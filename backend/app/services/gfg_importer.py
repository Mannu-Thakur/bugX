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
    async def resolve_slug(cls, input_str: str) -> tuple[str, dict]:
        """
        Resolves the input string into a GeeksforGeeks problem slug using a multi-stage pipeline:
        Stage 1: Direct exact slug candidate checking.
        Stage 2: GFG Search API matching.
        Stage 3: Fuzzy matching on search results.
        Returns: (resolved_slug, trace_info_dict)
        """
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
        
        # If it is a URL, parse slug directly
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

        # Stage 1: Exact direct slug matching (pre-check candidate slugs)
        normalized_slug = re.sub(r"[^a-z0-9-]", "", re.sub(r"\s+", "-", query.lower())).strip("-")
        slugs_to_check = [normalized_slug]
        
        # Check standard spelling variations (subarray vs sub-array)
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
                    resp = await client.get(meta_url, headers=headers, timeout=5.0)
                    if resp.status_code == 200:
                        logger.info(f"[GFG Importer] Stage 1 Success: Exact slug candidate '{s}' exists on GFG.")
                        trace["stage"] = "stage1_exact_candidate"
                        return s, trace
                except Exception as e:
                    logger.debug(f"[GFG Importer] Stage 1 check failed for '{s}': {e}")

        # Stage 2: Search API lookup
        logger.info(f"[GFG Importer] Stage 2: Querying GFG Search API with query: '{query}'")
        trace["search_attempted"] = True
        search_url = "https://practiceapi.geeksforgeeks.org/api/latest/problems/search/"
        try:
            async with httpx.AsyncClient() as client:
                search_resp = await client.get(search_url, params={"query": query}, headers=headers, timeout=8.0)
                if search_resp.status_code == 200:
                    trace["search_success"] = True
                    search_data = search_resp.json()
                    problems = search_data.get("problems", [])
                    trace["search_results_count"] = len(problems)
                    
                    if problems:
                        # 2a: Exact case-insensitive title/name match
                        for p in problems:
                            name = p.get("problem_name", "").strip()
                            if name.lower() == query.lower():
                                slug = p.get("slug") or cls._parse_slug(p.get("problem_url", ""))
                                if slug:
                                    logger.info(f"[GFG Importer] Stage 2a Success: Exact case-insensitive match on name '{name}' -> slug '{slug}'")
                                    trace["stage"] = "stage2_exact_name"
                                    return slug, trace
                                    
                        # 2b: Exact slug match in search results
                        for p in problems:
                            slug = p.get("slug") or cls._parse_slug(p.get("problem_url", ""))
                            if slug in slugs_to_check:
                                logger.info(f"[GFG Importer] Stage 2b Success: Exact slug match '{slug}' found in search results.")
                                trace["stage"] = "stage2_exact_slug"
                                return slug, trace

                        # Stage 3: Fuzzy matching on unique search results
                        logger.info(f"[GFG Importer] Stage 3: Running fuzzy matching on {len(problems)} search results.")
                        import difflib
                        
                        unique_candidates = []
                        seen_slugs = set()
                        for p in problems:
                            name = p.get("problem_name", "").strip()
                            slug = p.get("slug") or cls._parse_slug(p.get("problem_url", ""))
                            if not slug or slug in seen_slugs:
                                continue
                            seen_slugs.add(slug)
                            
                            ratio_name = difflib.SequenceMatcher(None, query.lower(), name.lower()).ratio()
                            ratio_slug = difflib.SequenceMatcher(None, normalized_slug, slug).ratio()
                            score = max(ratio_name, ratio_slug)
                            unique_candidates.append({
                                "name": name,
                                "slug": slug,
                                "score": score
                            })
                            
                        # Sort unique candidates by score descending
                        unique_candidates.sort(key=lambda x: x["score"], reverse=True)
                        
                        if unique_candidates:
                            best_cand = unique_candidates[0]
                            best_score = best_cand["score"]
                            best_name = best_cand["name"]
                            best_slug = best_cand["slug"]
                            
                            # Exact match is always accepted
                            if best_score == 1.0:
                                logger.info(f"[GFG Importer] Stage 2 Success: Exact match on name/slug '{best_name}' -> slug '{best_slug}'")
                                trace["stage"] = "stage2_exact"
                                return best_slug, trace
                                
                            # Check fuzzy match threshold (high safety threshold)
                            if best_score >= 0.85:
                                # Compare against second best to prevent ambiguous incorrect imports
                                if len(unique_candidates) > 1:
                                    sec_cand = unique_candidates[1]
                                    sec_score = sec_cand["score"]
                                    sec_name = sec_cand["name"]
                                    
                                    if sec_score >= 0.75 and (best_score - sec_score) < 0.05:
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
                                            for c in unique_candidates if c["score"] >= 0.75
                                        ]
                                        return None, trace
                                        
                                logger.info(f"[GFG Importer] Stage 3 Success: Fuzzy match '{best_slug}' with score {best_score:.2f}")
                                trace["stage"] = "stage3_fuzzy"
                                return best_slug, trace
                            else:
                                logger.info(f"[GFG Importer] Stage 3 Reject: Best score {best_score:.2f} for '{best_name}' is below threshold 0.85.")
                                trace["search_error"] = f"Best match '{best_name}' score {best_score:.2f} is below safety threshold 0.85"
                else:
                    trace["search_error"] = f"Status {search_resp.status_code}"
                    logger.warning(f"[GFG Importer] Search API returned non-200 status: {search_resp.status_code}")
        except Exception as e:
            trace["search_error"] = str(e)
            logger.warning(f"[GFG Importer] Error contacting GFG search API: {e}")

        # Do not fall back to a direct normalized slug guess if query matching failed completely
        logger.warning(f"[GFG Importer] Discovery Pipeline failed. No valid slug match found for query: '{query}'")
        trace["stage"] = "failed_to_resolve"
        return None, trace

    @classmethod
    async def import_problem(cls, session: AsyncSession, url_or_slug: str) -> Problem:
        slug, trace = await cls.resolve_slug(url_or_slug)
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
                        f"Details: {search_err or 'Did not match safety threshold (0.85).'}. "
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

        # Generate slug variations to be robust against minor differences during direct scrape
        slugs = [slug]
        parsed_orig = cls._parse_slug(url_or_slug)
        if parsed_orig not in slugs:
            slugs.append(parsed_orig)

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.geeksforgeeks.org/",
        }

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
                        resp = await client.get(url_candidate, headers=headers, timeout=20.0, follow_redirects=True)
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

                        next_data = json.loads(match.group(1).strip())
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
            
            # Category 1: PROVIDER_UNAVAILABLE
            if connection_error or (last_status and last_status >= 500):
                raise ProviderUnavailableException(
                    f"GeeksforGeeks is unreachable or returned a server error (status code: {last_status}). "
                    f"Details: {connection_error_msg or 'Server Error'}"
                )
            elif last_status in (403, 429):
                raise ProviderUnavailableException(
                    "GeeksforGeeks blocked the request (anti-bot protection or rate-limiting). Please try again later."
                )
            
            # Category 2: NOT_FOUND
            if trace["is_url"]:
                raise ProblemNotFoundException(
                    f"The GeeksforGeeks URL provided does not exist (returned 404). Please verify the URL."
                )
            else:
                if trace["search_success"] and trace["search_results_count"] == 0:
                    raise ProblemNotFoundException(
                        f"The problem '{url_or_slug}' truly does not exist on GeeksforGeeks. No search results found."
                    )
                elif not trace["search_success"]:
                    raise ProblemNotFoundException(
                        f"Could not locate problem '{url_or_slug}' on GeeksforGeeks. "
                        f"The search API was unreachable ({trace['search_error']}), and direct lookup on guessed slugs failed. "
                        "If the problem exists, please try importing using its direct GeeksforGeeks URL."
                    )
                else:
                    raise ProblemNotFoundException(
                        f"Could not locate problem '{url_or_slug}' on GeeksforGeeks. "
                        "Please check the spelling or try importing using its direct GeeksforGeeks URL."
                    )

        if successful_slug and successful_slug != slug:
            logger.info(f"Updating problem slug from '{slug}' to successful GFG variation '{successful_slug}'")
            slug = successful_slug

        # Parsing Phase
        logger.info(f"Parsing GeeksforGeeks content for slug: '{slug}'")
        try:
            dto = GFGParser.parse_question_data(slug, prob_data)
            logger.debug(f"Parsed DTO for GFG '{slug}': {json.dumps(dto)}")
        except Exception as parse_err:
            logger.error(f"Parser failure for GFG slug '{slug}': {parse_err}")
            raise ImportFailedException(f"Failed to parse GeeksforGeeks response: {parse_err}")

        # Validation Phase
        logger.info(f"Validating GFG DTO for slug: '{slug}'")
        try:
            ProblemImportValidationService.validate_dto(dto)
        except ProblemImportValidationError as val_err:
            logger.error(f"Validation failure for GFG slug '{slug}': {val_err.message}")
            raise

        # Save Phase: construct DB models
        logger.info(f"Saving GeeksforGeeks problem to DB: '{slug}'")

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
            test_cases=test_cases_objs
        )

        session.add(problem)
        await session.flush()
        logger.info(f"Successfully imported and saved GeeksforGeeks problem: '{slug}'")
        return problem
