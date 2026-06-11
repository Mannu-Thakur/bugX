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

class LeetCodeImporter:
    @classmethod
    async def resolve_slug(cls, input_str: str) -> str:
        query = input_str.strip()

        # If it is a URL, extract slug
        if "/" in query:
            parts = [p for p in query.split("/") if p]
            if "problems" in parts:
                idx = parts.index("problems")
                if idx + 1 < len(parts):
                    return parts[idx + 1]
            else:
                return parts[-1]

        # Clean Google/LeetCode/GFG prefixes just in case
        query = re.sub(r"^(google|leetcode|gfg):", "", query, flags=re.IGNORECASE)

        # Clean leading colons or symbols
        query = re.sub(r"^[:\s\-\.\#\u2013\u2014]+", "", query)

        # If query is empty, fallback
        if not query:
            return "unknown-problem"

        # Check common aliases FIRST (before any digit stripping that might corrupt names like "3 sum")
        alias = SLUG_ALIASES.get(query.lower().replace(" ", "").replace("-", ""))
        if alias:
            return alias

        # Clean leading question numbers (e.g. "3161. ", "42: ") but NOT single-digit
        # problem names like "3 Sum", "4 Sum" which are valid problem titles.
        query = re.sub(r"^\d{2,}[\s\.:]+", "", query)
        query = re.sub(r"^\d+[\.:]+\s*", "", query)
        query = re.sub(r"^[:\s\-\.\#\u2013\u2014]+", "", query)

        # Check if query is purely digits (question ID) or has spaces/punctuation
        is_id = query.isdigit()
        if is_id and query in QUESTION_ID_ALIASES:
            return QUESTION_ID_ALIASES[query]

        # Always try REST API search for better accuracy, even for single-word queries
        url = "https://leetcode.com/api/problems/algorithms/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, headers=headers, timeout=10.0)
                if resp.status_code == 200:
                    data = resp.json()
                    pairs = data.get("stat_status_pairs", [])

                    if is_id:
                        for pair in pairs:
                            stat = pair.get("stat", {})
                            if str(stat.get("frontend_question_id")) == query:
                                return stat.get("question__title_slug")
                    else:
                        search_slug = re.sub(r"\s+", "-", query.lower()).strip()
                        # 1. Exact slug match
                        for pair in pairs:
                            stat = pair.get("stat", {})
                            slug = stat.get("question__title_slug")
                            if slug == search_slug:
                                return slug

                        # 2. Substring slug match
                        candidates = []
                        for pair in pairs:
                            stat = pair.get("stat", {})
                            slug = stat.get("question__title_slug", "")
                            if slug == search_slug or slug.startswith(search_slug + "-") or \
                               slug.endswith("-" + search_slug) or ("-" + search_slug + "-") in slug:
                                candidates.append(slug)
                        if candidates:
                            candidates.sort(key=len)
                            return candidates[0]

                        # 3. Substring title match
                        title_candidates = []
                        for pair in pairs:
                            stat = pair.get("stat", {})
                            title = stat.get("question__title", "").lower()
                            if query.lower() in title:
                                title_candidates.append((len(title), stat.get("question__title_slug")))
                        if title_candidates:
                            title_candidates.sort(key=lambda x: x[0])
                            return title_candidates[0][1]

                        # 4. Word-by-word match
                        import difflib
                        search_words = [w for w in search_slug.split("-") if len(w) > 2]
                        if search_words and len(search_words) >= 2:
                            word_candidates = []
                            for pair in pairs:
                                stat = pair.get("stat", {})
                                slug = stat.get("question__title_slug", "")
                                slug_words = set(slug.split("-"))
                                if all(any(word in sw or sw in word for sw in slug_words) for word in search_words):
                                    title = stat.get("question__title", "").lower()
                                    sim_title = difflib.SequenceMatcher(None, query.lower(), title).ratio()
                                    sim_slug = difflib.SequenceMatcher(None, search_slug, slug).ratio()
                                    if max(sim_title, sim_slug) >= 0.70:
                                        word_candidates.append((max(sim_title, sim_slug), slug))
                            if word_candidates:
                                word_candidates.sort(key=lambda x: (-x[0], len(x[1])))
                                return word_candidates[0][1]
        except Exception as e:
            print(f"[LeetCodeImporter] Error in resolve_slug: {e}")

        return re.sub(r"[^a-z0-9-]", "", re.sub(r"\s+", "-", query.lower())).strip("-")

    @classmethod
    async def import_problem(cls, session: AsyncSession, url_or_slug: str) -> Problem:
        slug = await cls.resolve_slug(url_or_slug)

        # Query database to check if problem already exists
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

        # Fetch LeetCode question data via GraphQL
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

        logger.info(f"Scraping LeetCode problem data for slug: '{slug}'")
        async with httpx.AsyncClient() as client:
            resp = await client.post(gql_url, json=payload, headers=headers, timeout=15.0)
            if resp.status_code != 200:
                logger.error(f"Failed to contact LeetCode API for '{slug}' (status {resp.status_code})")
                raise Exception(f"Failed to contact LeetCode API (status {resp.status_code})")

            raw_data = resp.json()
            logger.debug(f"Raw scraped content for '{slug}': {json.dumps(raw_data)}")

            question = raw_data.get("data", {}).get("question")
            if not question:
                logger.error(f"Problem not found on LeetCode for slug: '{slug}'")
                raise Exception("Problem not found on LeetCode. Please check the URL or slug.")

        # Parsing Phase
        logger.info(f"Parsing LeetCode content for slug: '{slug}'")
        try:
            dto = LeetCodeParser.parse_question_data(slug, question)
            logger.debug(f"Parsed DTO for '{slug}': {json.dumps(dto)}")
        except Exception as parse_err:
            logger.error(f"Parser failure for LeetCode slug '{slug}': {parse_err}")
            raise Exception(f"Failed to parse LeetCode response: {parse_err}")

        # Validation Phase
        logger.info(f"Validating LeetCode DTO for slug: '{slug}'")
        try:
            ProblemImportValidationService.validate_dto(dto)
        except ProblemImportValidationError as val_err:
            logger.error(f"Validation failure for LeetCode slug '{slug}': {val_err.message}")
            raise

        # Save Phase: construct DB models
        logger.info(f"Saving LeetCode problem to DB: '{slug}'")

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
            hints=json.dumps(dto["hints"]),
            is_published=True,
            tags=tags_list,
            templates=templates_list,
            test_cases=test_cases_objs
        )

        session.add(problem)
        await session.flush()
        logger.info(f"Successfully imported and saved LeetCode problem: '{slug}'")
        return problem
