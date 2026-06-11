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
    async def import_problem(cls, session: AsyncSession, url_or_slug: str) -> Problem:
        slug = cls._parse_slug(url_or_slug)

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

        # Generate slug variations to be robust against minor stop word/article differences
        slugs = [slug]
        slug_no_articles = "-".join([w for w in slug.split("-") if w not in {"the", "a", "an"}])
        if slug_no_articles != slug and slug_no_articles:
            slugs.append(slug_no_articles)

        slug_no_fillers = "-".join([w for w in slug.split("-") if w not in {"the", "of", "a", "an", "in", "to", "and", "or", "for", "with", "from", "on", "at", "by"}])
        if slug_no_fillers not in slugs and slug_no_fillers:
            slugs.append(slug_no_fillers)

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.geeksforgeeks.org/",
        }

        prob_data = None
        successful_slug = None
        last_status = None

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
                    except Exception as parse_err:
                        logger.error(f"Failed parsing {url_candidate}: {parse_err}")
                if prob_data:
                    break

        if not prob_data:
            logger.error(f"Failed to find valid GFG problem details for '{slug}' (last status: {last_status})")
            raise Exception(
                f"Failed to find valid problem details on GeeksforGeeks for slug '{slug}' (last status: {last_status}). "
                "The problem may not exist or its page structure is not supported."
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
            raise Exception(f"Failed to parse GeeksforGeeks response: {parse_err}")

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
