import re
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.problem import Problem, DifficultyEnum
from app.models.problem_template import ProblemTemplate, ArgStyleEnum
from app.models.tag import Tag
from app.models.test_case import TestCase
from app.services.leetcode_importer import LeetCodeImporter

GOOGLE_ALIASES = {
    "decode string": "decode-string",
    "decompress string": "decode-string",
    "fruit into baskets": "fruit-into-baskets",
    "license key formatting": "license-key-formatting",
    "odd even jump": "odd-even-jump",
    "race car": "race-car",
    "read n characters given read4": "read-n-characters-given-read4",
    "split array largest sum": "split-array-largest-sum",
    "strobogrammatic number": "strobogrammatic-number",
    "unique email addresses": "unique-email-addresses",
}

CURATED_GOOGLE_PROBLEMS = {
    "fruit-into-baskets": {
        "title": "Fruit Into Baskets",
        "difficulty": DifficultyEnum.MEDIUM,
        "score_base": 200,
        "tags": ["Arrays", "Sliding Window"],
        "description": (
            "You are given an integer array fruits where fruits[i] is the type of fruit on the ith tree. "
            "You have two baskets, and each basket can only hold one type of fruit. Starting from any tree, "
            "pick exactly one fruit from every tree while moving right until you cannot pick from more than "
            "two fruit types. Return the maximum number of fruits you can pick."
        ),
        "function_name": "totalFruit",
        "arg_style": ArgStyleEnum.single,
        "python": "def totalFruit(fruits: list[int]) -> int:\n    # Write your solution here\n    pass",
        "javascript": "var totalFruit = function(fruits) {\n    // Write your solution here\n};",
        "cpp": "class Solution {\npublic:\n    int totalFruit(vector<int>& fruits) {\n        // Write your solution here\n        return 0;\n    }\n};",
        "java": "class Solution {\n    public int totalFruit(int[] fruits) {\n        // Write your solution here\n        return 0;\n    }\n}",
        "tests": [
            ("[1,2,1]", "3", True),
            ("[0,1,2,2]", "3", False),
            ("[1,2,3,2,2]", "4", False),
            ("[3,3,3,1,2,1,1,2,3,3,4]", "5", False),
        ],
    },
    "decode-string": {
        "title": "Decode String",
        "difficulty": DifficultyEnum.MEDIUM,
        "score_base": 200,
        "tags": ["String", "Stack"],
        "description": (
            "Given an encoded string, return its decoded string. The encoding rule is k[encoded_string], "
            "where the encoded string inside brackets is repeated exactly k times."
        ),
        "function_name": "decodeString",
        "arg_style": ArgStyleEnum.single,
        "python": "def decodeString(s: str) -> str:\n    # Write your solution here\n    pass",
        "javascript": "var decodeString = function(s) {\n    // Write your solution here\n};",
        "cpp": "class Solution {\npublic:\n    string decodeString(string s) {\n        // Write your solution here\n        return \"\";\n    }\n};",
        "java": "class Solution {\n    public String decodeString(String s) {\n        // Write your solution here\n        return \"\";\n    }\n}",
        "tests": [
            ("\"3[a]2[bc]\"", "\"aaabcbc\"", True),
            ("\"3[a2[c]]\"", "\"accaccacc\"", False),
            ("\"2[abc]3[cd]ef\"", "\"abcabccdcdcdef\"", False),
            ("\"abc3[cd]xyz\"", "\"abccdcdcdxyz\"", False),
        ],
    },
    "license-key-formatting": {
        "title": "License Key Formatting",
        "difficulty": DifficultyEnum.EASY,
        "score_base": 100,
        "tags": ["String"],
        "description": (
            "You are given a license key string s and an integer k. Reformat the string so each group "
            "contains exactly k characters, except the first group which may be shorter, and letters are uppercase."
        ),
        "function_name": "licenseKeyFormatting",
        "arg_style": ArgStyleEnum.positional,
        "python": "def licenseKeyFormatting(s: str, k: int) -> str:\n    # Write your solution here\n    pass",
        "javascript": "var licenseKeyFormatting = function(s, k) {\n    // Write your solution here\n};",
        "cpp": "class Solution {\npublic:\n    string licenseKeyFormatting(string s, int k) {\n        // Write your solution here\n        return \"\";\n    }\n};",
        "java": "class Solution {\n    public String licenseKeyFormatting(String s, int k) {\n        // Write your solution here\n        return \"\";\n    }\n}",
        "tests": [
            ("[\"5F3Z-2e-9-w\", 4]", "\"5F3Z-2E9W\"", True),
            ("[\"2-5g-3-J\", 2]", "\"2-5G-3J\"", False),
            ("[\"--a-a-a-a--\", 2]", "\"AA-AA\"", False),
            ("[\"abc\", 3]", "\"ABC\"", False),
        ],
    },
    "unique-email-addresses": {
        "title": "Unique Email Addresses",
        "difficulty": DifficultyEnum.EASY,
        "score_base": 100,
        "tags": ["String", "Hash Tables"],
        "description": (
            "Every valid email consists of a local name and domain name separated by @. Dots in local names are ignored, "
            "and anything after a plus sign in the local name is ignored. Return how many unique addresses receive mail."
        ),
        "function_name": "numUniqueEmails",
        "arg_style": ArgStyleEnum.single,
        "python": "def numUniqueEmails(emails: list[str]) -> int:\n    # Write your solution here\n    pass",
        "javascript": "var numUniqueEmails = function(emails) {\n    // Write your solution here\n};",
        "cpp": "class Solution {\npublic:\n    int numUniqueEmails(vector<string>& emails) {\n        // Write your solution here\n        return 0;\n    }\n};",
        "java": "class Solution {\n    public int numUniqueEmails(String[] emails) {\n        // Write your solution here\n        return 0;\n    }\n}",
        "tests": [
            ("[\"test.email+alex@leetcode.com\",\"test.e.mail+bob.cathy@leetcode.com\",\"testemail+david@lee.tcode.com\"]", "2", True),
            ("[\"a@leetcode.com\",\"b@leetcode.com\",\"c@leetcode.com\"]", "3", False),
            ("[\"test.email@leetcode.com\",\"testemail@leetcode.com\"]", "1", False),
            ("[\"x+y@z.com\",\"x@z.com\"]", "1", False),
        ],
    },
}

class GoogleImporter:
    @staticmethod
    def _normalize_query(url_or_slug: str) -> str:
        query = url_or_slug.strip()

        # Handle google prefix and google.com URLs
        if "google.com" in query.lower() or "google" in query.lower():
            query = re.sub(r"^google:", "", query, flags=re.IGNORECASE)
            query = re.sub(r"^https?://(www\.)?", "", query, flags=re.IGNORECASE)
            query = re.sub(r"^google\.com/(search\?q=|problems/)?", "", query, flags=re.IGNORECASE)
            query = re.sub(r"\bgoogle\b", "", query, flags=re.IGNORECASE)

        # Strip any leading colon or symbols left over (e.g. from google: prefix)
        query = re.sub(r"^[:\s\-\.\#\u2013\u2014]+", "", query)

        # Strip leading question numbers (e.g. "3161. ", "3161: ", "3161 ")
        # We do not strip if followed by a dash (e.g. "1-bit") to preserve hyphenated terms.
        query = re.sub(r"^\d+[\s\.:]+", "", query)
        query = re.sub(r"^[:\s\-\.\#\u2013\u2014]+", "", query)

        query = query.replace("+", " ").replace("/", " ").replace("-", " ")
        query = re.sub(r"\s+", " ", query).strip()
        return query

    @staticmethod
    async def _search_leetcode(search_term: str) -> str | None:
        url = "https://leetcode.com/api/problems/algorithms/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
        print(f"[GoogleImporter] Searching LeetCode REST algorithms list for '{search_term}'...")
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, timeout=15.0)
            if resp.status_code != 200:
                print(f"[GoogleImporter] Failed to fetch algorithms list: status {resp.status_code}")
                return None
            data = resp.json()
            pairs = data.get("stat_status_pairs", [])
            
            # 0. Try matching by frontend_question_id if search_term is digits only
            is_id = search_term.isdigit()
            if is_id:
                for pair in pairs:
                    stat = pair.get("stat", {})
                    if str(stat.get("frontend_question_id")) == search_term:
                        print(f"[GoogleImporter] ID match found: {stat.get('question__title_slug')}")
                        return stat.get("question__title_slug")

            # 1. Try exact match on title_slug
            search_slug = re.sub(r"\s+", "-", search_term.lower()).strip()
            for pair in pairs:
                stat = pair.get("stat", {})
                slug = stat.get("question__title_slug")
                if slug == search_slug:
                    print(f"[GoogleImporter] Exact slug match found: {slug}")
                    return slug
                    
            # 2. Try case-insensitive substring match on slug
            for pair in pairs:
                stat = pair.get("stat", {})
                slug = stat.get("question__title_slug", "")
                if search_slug in slug:
                    print(f"[GoogleImporter] Substring slug match found: {slug}")
                    return slug
                    
            # 3. Try case-insensitive substring match on title
            search_title = search_term.lower()
            for pair in pairs:
                stat = pair.get("stat", {})
                title = stat.get("question__title", "").lower()
                if search_title in title:
                    slug = stat.get("question__title_slug")
                    print(f"[GoogleImporter] Substring title match found: {slug} (for '{title}')")
                    return slug
                    
            # 4. Try word-by-word matches
            words = [w for w in search_slug.split("-") if len(w) > 2]
            if words:
                for pair in pairs:
                    stat = pair.get("stat", {})
                    slug = stat.get("question__title_slug", "")
                    if all(word in slug for word in words):
                        print(f"[GoogleImporter] Word-by-word match found: {slug}")
                        return slug
        print("[GoogleImporter] No match found in LeetCode algorithms list")
        return None

    @classmethod
    async def resolve_and_import(cls, session: AsyncSession, url_or_slug: str) -> Problem:
        query = cls._normalize_query(url_or_slug)
        
        # 1. Check if the query itself contains a direct URL or is a direct slug
        direct_slug = query.strip().lower()
        if "/" in direct_slug:
            parts = [p for p in direct_slug.split("/") if p]
            if "problems" in parts:
                idx = parts.index("problems")
                if idx + 1 < len(parts):
                    direct_slug = parts[idx + 1]
            else:
                direct_slug = parts[-1]
        
        # 2. Check aliases
        alias_slug = GOOGLE_ALIASES.get(direct_slug) or GOOGLE_ALIASES.get(query.lower())
        target_slug = alias_slug
        
        if not target_slug:
            # 3. Search LeetCode REST algorithms list
            try:
                target_slug = await cls._search_leetcode(query)
            except Exception as e:
                print(f"[GoogleImporter] REST search error: {e}")
                
        if not target_slug:
            # If search didn't find anything, try formatting the query directly as a slug
            target_slug = re.sub(r"[^a-z0-9-]", "", re.sub(r"\s+", "-", query.lower())).strip("-")
            
        if not target_slug:
            raise Exception("Could not resolve a valid problem slug from search query.")

        print(f"[GoogleImporter] Resolved query '{url_or_slug}' to slug '{target_slug}'")

        # 4. Try importing using LeetCodeImporter
        try:
            return await LeetCodeImporter.import_problem(session, target_slug)
        except Exception as e:
            print(f"[GoogleImporter] LeetCode import failed for slug '{target_slug}': {e}")
            # If LeetCode importer fails, try curating
            curated = await cls._import_curated_problem(session, target_slug)
            if curated:
                print(f"[GoogleImporter] Fallback to curated problem successfully resolved for '{target_slug}'")
                return curated
            
            # If that also fails, raise the exception! No silent fallback!
            raise Exception(
                f"Failed to fetch problem '{target_slug}' from LeetCode. "
                "The problem might be premium-only, require authentication, or does not exist. "
                f"Original error: {str(e)}"
            )

    @staticmethod
    async def _get_or_create_tags(session: AsyncSession, tag_names: list[str]) -> list[Tag]:
        tags = []
        for tag_name in tag_names:
            result = await session.execute(select(Tag).where(Tag.name == tag_name))
            tag = result.scalar_one_or_none()
            if not tag:
                tag = Tag(name=tag_name)
                session.add(tag)
                await session.flush()
            tags.append(tag)
        return tags

    @classmethod
    async def _import_curated_problem(cls, session: AsyncSession, slug: str) -> Problem | None:
        data = CURATED_GOOGLE_PROBLEMS.get(slug)
        if not data:
            return None

        result = await session.execute(select(Problem).where(Problem.slug == slug))
        existing = result.scalar_one_or_none()
        if existing:
            return existing

        tags = await cls._get_or_create_tags(session, data["tags"])
        templates = [
            ProblemTemplate(language="python", template_code=data["python"], function_name=data["function_name"], arg_style=data["arg_style"]),
            ProblemTemplate(language="javascript", template_code=data["javascript"], function_name=data["function_name"], arg_style=data["arg_style"]),
            ProblemTemplate(language="cpp", template_code=data["cpp"], function_name=data["function_name"], arg_style=data["arg_style"]),
            ProblemTemplate(language="java", template_code=data["java"], function_name=data["function_name"], arg_style=data["arg_style"]),
        ]
        test_cases = [
            TestCase(input=tc_input, expected_output=expected, is_sample=is_sample, order_index=index, weight=1)
            for index, (tc_input, expected, is_sample) in enumerate(data["tests"])
        ]

        problem = Problem(
            slug=slug,
            title=data["title"],
            description=f"{data['description']}\n\nSource: Google interview question fallback.",
            difficulty=data["difficulty"],
            time_limit_ms=2000,
            memory_limit_kb=262144,
            score_base=data["score_base"],
            runtime_bonus_max=20,
            is_published=True,
            tags=tags,
            templates=templates,
            test_cases=test_cases,
        )
        session.add(problem)
        await session.flush()
        return problem

    @classmethod
    async def _create_generic_problem(cls, session: AsyncSession, query: str, slug: str) -> Problem:
        slug = slug or "google-practice-problem"
        slug = re.sub(r"[^a-z0-9-]", "", slug.lower()).strip("-") or "google-practice-problem"

        result = await session.execute(select(Problem).where(Problem.slug == slug))
        existing = result.scalar_one_or_none()
        if existing:
            return existing

        title = " ".join(word.capitalize() for word in query.split()) or "Google Practice Problem"
        tags = await cls._get_or_create_tags(session, ["Google", "Practice"])
        function_name = "solve"
        templates = [
            ProblemTemplate(language="python", template_code="def solve(value):\n    # Write your solution here\n    pass", function_name=function_name, arg_style=ArgStyleEnum.single),
            ProblemTemplate(language="javascript", template_code="function solve(value) {\n    // Write your solution here\n}", function_name=function_name, arg_style=ArgStyleEnum.single),
            ProblemTemplate(language="cpp", template_code="class Solution {\npublic:\n    int solve(int value) {\n        // Write your solution here\n        return 0;\n    }\n};", function_name=function_name, arg_style=ArgStyleEnum.single),
            ProblemTemplate(language="java", template_code="class Solution {\n    public int solve(int value) {\n        // Write your solution here\n        return 0;\n    }\n}", function_name=function_name, arg_style=ArgStyleEnum.single),
        ]
        test_cases = [
            TestCase(input="1", expected_output="1", is_sample=True, order_index=0, weight=1),
            TestCase(input="2", expected_output="2", is_sample=False, order_index=1, weight=1),
            TestCase(input="3", expected_output="3", is_sample=False, order_index=2, weight=1),
            TestCase(input="4", expected_output="4", is_sample=False, order_index=3, weight=1),
        ]
        problem = Problem(
            slug=slug,
            title=title,
            description=(
                "Google-style problem placeholder created while external problem lookup was unavailable. "
                "Edit the statement and tests from the admin panel if you need the exact prompt."
            ),
            difficulty=DifficultyEnum.MEDIUM,
            time_limit_ms=2000,
            memory_limit_kb=262144,
            score_base=200,
            runtime_bonus_max=20,
            is_published=True,
            tags=tags,
            templates=templates,
            test_cases=test_cases,
        )
        session.add(problem)
        await session.flush()
        return problem
