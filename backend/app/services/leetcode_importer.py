import re
import json
import uuid
import httpx
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.problem import Problem, DifficultyEnum
from app.models.tag import Tag
from app.models.problem_template import ProblemTemplate, ArgStyleEnum
from app.models.test_case import TestCase
from app.services.parsers.leetcode_parser import LeetCodeParser
from app.services.problem_import_validation_service import ProblemImportValidationService, ProblemImportValidationError

logger = logging.getLogger("leetcode_importer")

# Common aliases for frequently searched problem names
SLUG_ALIASES = {
    # Two Sum
    "2sum": "two-sum",
    "twosum": "two-sum",
    "2-sum": "two-sum",
    "twosums": "two-sum",
    "twosumproblem": "two-sum",

    # Three Sum / Four Sum
    "3sum": "3sum",
    "threesum": "3sum",
    "3-sum": "3sum",
    "4sum": "4sum",
    "foursum": "4sum",
    "4-sum": "4sum",

    # Maximum Subarray / Kadane's
    "maximumarraysum": "maximum-subarray",
    "maximumsubarraysum": "maximum-subarray",
    "maxarraysum": "maximum-subarray",
    "maxsubarraysum": "maximum-subarray",
    "maximumsubarray": "maximum-subarray",
    "maxsubarray": "maximum-subarray",
    "kadane": "maximum-subarray",
    "kadanes": "maximum-subarray",
    "kadane's": "maximum-subarray",
    "kadanesalgorithm": "maximum-subarray",
    "kadane'salgorithm": "maximum-subarray",
    "kadanes-algorithm": "maximum-subarray",

    # Binary Tree views
    "rightview": "binary-tree-right-side-view",
    "rightviewofbinarytree": "binary-tree-right-side-view",
    "rightviewofabinarytree": "binary-tree-right-side-view",
    "binarytreerightsideview": "binary-tree-right-side-view",
    "leftview": "left-view-of-binary-tree",
    "leftviewofbinarytree": "left-view-of-binary-tree",
    "leftviewofabinarytree": "left-view-of-binary-tree",
    "binarytreeleftsideview": "left-view-of-binary-tree",

    # Invert/Reverse
    "invertbinarytree": "invert-binary-tree",
    "reversebinarytree": "invert-binary-tree",
    "reverselinkedlist": "reverse-linked-list",

    # Other classics
    "lrucache": "lru-cache",
    "longestcommonsubsequence": "longest-common-subsequence",
    "lcs": "longest-common-subsequence",
    "longestincreasingsubsequence": "longest-increasing-subsequence",
    "lis": "longest-increasing-subsequence",
    "editdistance": "edit-distance",
    "trappingrainwater": "trapping-rain-water",
    "climbingstairs": "climbing-stairs",
    "coinchange": "coin-change",
    "houserobber": "house-robber",
    "numberofislands": "number-of-islands",
    "courseschedule": "course-schedule",
    "wordsearch": "word-search",
    "longestpalindromicsubstring": "longest-palindromic-substring",
    "lps": "longest-palindromic-substring",
}

QUESTION_ID_ALIASES = {
    "3161": "block-placement-queries",
}

TAG_MAP = {
    "array": "Arrays",
    "string": "Strings",
    "hash table": "Hash Tables",
    "dynamic programming": "Dynamic Programming",
    "math": "Math",
    "two pointers": "Two Pointers",
    "binary search": "Binary Search",
    "sorting": "Sorting",
    "graph": "Graph",
    "recursion": "Recursion",
    "tree": "Trees",
    "depth-first search": "DFS",
    "breadth-first search": "BFS",
    "backtracking": "Backtracking",
    "greedy": "Greedy",
    "sliding window": "Sliding Window",
    "linked list": "Linked List",
    "stack": "Stack"
}

from app.services.import_utils import AliasCache, normalize_title_aggressive, compute_candidate_score, fetch_with_retry, AliasDatabase
from app.services.importer_exceptions import (
    ImportNetworkError,
    ImportProviderUnavailableError,
    ImportParserError,
    ImportValidationError,
    ImportDatabaseError,
    ImportNotFoundError,
    ProviderUnavailableException,
    ProblemNotFoundException,
    ImportFailedException,
    AmbiguousProblemException
)

class LeetCodeImporter:
    @classmethod
    async def resolve_slug(cls, input_str: str, session: AsyncSession = None) -> str:
        query = input_str.strip()
        logger.info(f"[LeetCodeImporter] [DIRECT_SLUG] Resolving slug for query: '{query}'")

        # 1. Check Alias Cache
        if session:
            cached = await AliasDatabase.get(session, "leetcode", query)
            if cached:
                logger.info(f"[LeetCodeImporter] [ALIAS_LOOKUP] Found alias cache mapping: '{query}' -> '{cached[0]}'")
                return cached[0]

        # 2. Direct URL or exact slug check
        if "/" in query:
            parts = [p for p in query.split("/") if p]
            if "problems" in parts:
                idx = parts.index("problems")
                if idx + 1 < len(parts):
                    return parts[idx + 1]
            return parts[-1]

        # Clean prefixes
        query = re.sub(r"^(google|leetcode|gfg):", "", query, flags=re.IGNORECASE)
        query = re.sub(r"^[:\s\-\.\#\u2013\u2014]+", "", query)

        if not query:
            return "unknown-problem"

        alias = SLUG_ALIASES.get(query.lower().replace(" ", "").replace("-", ""))
        if alias:
            logger.info(f"[LeetCodeImporter] [DIRECT_SLUG] Static alias match: '{query}' -> '{alias}'")
            return alias

        # Clean leading question numbers
        query = re.sub(r"^\d{2,}[\s\.:]+", "", query)
        query = re.sub(r"^\d+[\.:]+\s*", "", query)
        query = re.sub(r"^[:\s\-\.\#\u2013\u2014]+", "", query)

        is_id = query.isdigit()
        if is_id and query in QUESTION_ID_ALIASES:
            return QUESTION_ID_ALIASES[query]

        # Fetch LeetCode algorithms list for ranking matching
        url = "https://leetcode.com/api/problems/algorithms/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
        
        pairs = []
        try:
            async with httpx.AsyncClient() as client:
                resp = await fetch_with_retry(client, "GET", url, headers=headers, timeout=10.0)
                if resp.status_code == 200:
                    data = resp.json()
                    pairs = data.get("stat_status_pairs", [])
        except Exception as e:
            logger.warning(f"[LeetCodeImporter] [SEARCH_API] Failed to fetch LeetCode algorithms list: {e}")

        if pairs:
            if is_id:
                for pair in pairs:
                    stat = pair.get("stat", {})
                    if str(stat.get("frontend_question_id")) == query:
                        resolved = stat.get("question__title_slug")
                        if resolved:
                            if session:
                                await AliasDatabase.set(session, "leetcode", input_str, resolved)
                            return resolved

            candidates = []
            for pair in pairs:
                stat = pair.get("stat", {})
                slug = stat.get("question__title_slug", "")
                title = stat.get("question__title", "")
                
                score = compute_candidate_score(query, title, slug, 0.95)
                
                if score >= 0.80:
                    candidates.append({
                        "slug": slug,
                        "title": title,
                        "score": score
                    })
            
            if candidates:
                candidates.sort(key=lambda x: (-x["score"], len(x["slug"])))
                # Check for ambiguity
                if len(candidates) > 1 and candidates[0]["score"] < 1.0:
                    best_c = candidates[0]
                    sec_c = candidates[1]
                    if sec_c["score"] >= 0.75 and (best_c["score"] - sec_c["score"]) < 0.03:
                        logger.warning(f"[LeetCodeImporter] [RANKING] Ambiguity detected between: '{best_c['title']}' and '{sec_c['title']}'")
                        raise AmbiguousProblemException(
                            message=f"Multiple potential matches found for '{query}' on LeetCode.",
                            candidates=[
                                {"title": c["title"], "slug": c["slug"], "platform": "leetcode", "score": round(c["score"], 2)}
                                for c in candidates[:5]
                            ]
                        )
                
                resolved = candidates[0]["slug"]
                logger.info(f"[LeetCodeImporter] [RANKING] Resolved query '{query}' to slug '{resolved}' (score: {candidates[0]['score']:.2f})")
                if session:
                    await AliasDatabase.set(session, "leetcode", input_str, resolved)
                return resolved

        # Fallback to direct slug guessing if API list is empty or fails
        fallback_slug = re.sub(r"[^a-z0-9-]", "", re.sub(r"\s+", "-", query.lower())).strip("-")
        logger.warning(f"[LeetCodeImporter] [SEARCH_API] Failed/no matches. Using fallback slug: '{fallback_slug}'")
        return fallback_slug

    @classmethod
    async def fetch_question_data(cls, slug: str) -> dict:
        """
        Exposes source-specific detail fetch/scrape behavior.
        Raises ImportNetworkError, ImportProviderUnavailableError, or ImportNotFoundError.
        """
        gql_url = "https://leetcode.com/graphql"
        query = """
        query questionData($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            title
            titleSlug
            content
            difficulty
            hints
            exampleTestcases
            topicTags {
              name
              slug
            }
            codeSnippets {
              lang
              langSlug
              code
            }
          }
        }
        """
        payload = {
            "query": query,
            "variables": {"titleSlug": slug}
        }
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        logger.info(f"[PARSER] Scraping LeetCode problem data for slug: '{slug}'")
        raw_data = None
        try:
            async with httpx.AsyncClient() as client:
                resp = await fetch_with_retry(client, "POST", gql_url, json=payload, headers=headers, timeout=15.0)
                if resp.status_code != 200:
                    logger.error(f"Failed to contact LeetCode API for '{slug}' (status {resp.status_code})")
                    raise ImportProviderUnavailableError(f"LeetCode is unreachable or returned status code {resp.status_code}")
                raw_data = resp.json()
        except (ImportNetworkError, ImportProviderUnavailableError):
            raise
        except (httpx.RequestError, asyncio.TimeoutError) as req_err:
            logger.error(f"Network error requesting LeetCode problem details: {req_err}")
            raise ImportNetworkError(f"Network error contacting LeetCode: {req_err}")
        except Exception as api_err:
            logger.error(f"Failed to fetch LeetCode question data: {api_err}")
            raise ImportProviderUnavailableError(f"Failed to fetch LeetCode question data: {api_err}")

        question = raw_data.get("data", {}).get("question")
        if not question:
            logger.error(f"Problem not found on LeetCode for slug: '{slug}'")
            raise ImportNotFoundError(f"Problem '{slug}' truly does not exist on LeetCode.")
        return question

    @classmethod
    async def import_problem(cls, session: AsyncSession, url_or_slug: str) -> Problem:
        try:
            slug = await cls.resolve_slug(url_or_slug, session)
        except AmbiguousProblemException:
            raise
        except Exception as e:
            logger.error(f"[LeetCodeImporter] Resolve slug failed for '{url_or_slug}': {e}")
            raise ImportNotFoundError(f"Could not resolve problem slug for '{url_or_slug}': {e}")

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
                print(f"[LeetCodeImporter] Purging stale placeholder problem '{slug}' to allow real import...")
                await session.delete(existing)
                await session.flush()
            else:
                return existing

        # Fetch
        question = await cls.fetch_question_data(slug)

        # Parsing Phase
        logger.info(f"[PARSER] Parsing LeetCode content for slug: '{slug}'")
        try:
            dto = LeetCodeParser.parse_question_data(slug, question)
            logger.debug(f"Parsed DTO for '{slug}': {json.dumps(dto)}")
        except Exception as parse_err:
            logger.error(f"Parser failure for LeetCode slug '{slug}': {parse_err}")
            raise ImportParserError(f"Parser failure for LeetCode slug '{slug}': {parse_err}")

        # Validation Phase
        logger.info(f"[VALIDATION] Validating LeetCode DTO for slug: '{slug}'")
        try:
            ProblemImportValidationService.validate_dto(dto)
        except ProblemImportValidationError as val_err:
            logger.error(f"Validation failure for LeetCode slug '{slug}': {val_err.message}")
            raise ImportValidationError(val_err.message, errors=val_err.errors)
        except Exception as val_err:
            logger.error(f"Validation error for LeetCode slug '{slug}': {val_err}")
            raise ImportValidationError(str(val_err))

        # Save Phase
        logger.info(f"[DB_SAVE] Saving LeetCode problem to DB: '{slug}'")
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
                hints=json.dumps(dto["hints"]),
                is_published=True,
                tags=tags_list,
                templates=templates_list,
                test_cases=test_cases_objs,
                comparison_mode=comp_mode,
                source="leetcode"
            )

            # Link companies and topics
            from app.services.company_service import CompanyService
            from app.services.topic_service import TopicService
            
            # Link topic categories
            topics_objs = []
            for t_obj in tags_list:
                topic = await TopicService.find_or_create_topic(session, t_obj.name)
                topics_objs.append(topic)
            problem.topics = topics_objs

            # Look for company tags or match implicit keyword tags
            companies_objs = []
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
                    companies_objs.append(company)
            problem.companies = companies_objs

            session.add(problem)
            await session.flush()

            # Invalidate stats cache on new problem import
            from app.services.statistics_service import StatisticsService
            await StatisticsService.invalidate_overview_cache()

            logger.info(f"[DB_SAVE] Successfully imported and saved LeetCode problem: '{slug}'")
            return problem
        except Exception as db_err:
            logger.error(f"Database save failure for LeetCode slug '{slug}': {db_err}")
            raise ImportDatabaseError(f"Database save failure for LeetCode slug '{slug}': {db_err}")

