import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.problem_import_validation_service import ProblemImportValidationService, ProblemImportValidationError
from app.services.leetcode_importer import LeetCodeImporter
from app.services.gfg_importer import GFGImporter
from app.services.parsers.leetcode_parser import LeetCodeParser
from app.services.parsers.gfg_parser import GFGParser
from app.models.problem import DifficultyEnum

# ══════════════════════════════════════════════════════════════════════════════
# 1. Unit Tests for ProblemImportValidationService
# ══════════════════════════════════════════════════════════════════════════════

class TestValidationServiceUnit:
    """Pure unit tests for ProblemImportValidationService – no DB, no mocks."""

    def _make_valid_dto(self, **overrides):
        """Factory for a valid DTO. Override specific fields as needed."""
        dto = {
            "slug": "two-sum",
            "title": "Two Sum",
            "description": "<p>Given an array of integers, return indices of the two numbers such that they add up to a specific target.</p>",
            "difficulty": DifficultyEnum.EASY,
            "tags": ["Arrays"],
            "templates": [
                {
                    "language": "python",
                    "template_code": "def twoSum(nums, target):\n    # Write code here\n    pass",
                    "function_name": "twoSum",
                    "arg_style": "positional"
                }
            ],
            "test_cases": [
                {
                    "input": "[2, 7, 11, 15], 9",
                    "expected_output": "[0, 1]",
                    "is_sample": True,
                    "order_index": 0,
                    "weight": 1
                }
            ],
            "hints": []
        }
        dto.update(overrides)
        return dto

    def test_valid_dto_passes(self):
        ProblemImportValidationService.validate_dto(self._make_valid_dto())

    def test_missing_title(self):
        with pytest.raises(ProblemImportValidationError) as exc:
            ProblemImportValidationService.validate_dto(self._make_valid_dto(title=""))
        assert "Title is missing or empty" in exc.value.message

    def test_fallback_title(self):
        with pytest.raises(ProblemImportValidationError) as exc:
            ProblemImportValidationService.validate_dto(self._make_valid_dto(title="unknown-problem"))
        assert "generic fallback" in exc.value.message

    def test_placeholder_description(self):
        with pytest.raises(ProblemImportValidationError) as exc:
            ProblemImportValidationService.validate_dto(
                self._make_valid_dto(description="No description provided.")
            )
        assert "Description extraction failed" in exc.value.message

    def test_empty_description(self):
        with pytest.raises(ProblemImportValidationError) as exc:
            ProblemImportValidationService.validate_dto(self._make_valid_dto(description=""))
        assert "Description is missing or empty" in exc.value.message

    def test_html_only_description(self):
        """Description that is all tags but no text content."""
        with pytest.raises(ProblemImportValidationError) as exc:
            ProblemImportValidationService.validate_dto(
                self._make_valid_dto(description="<div><span></span></div>")
            )
        assert "Description extraction failed" in exc.value.message

    def test_generic_python_template_solve(self):
        with pytest.raises(ProblemImportValidationError) as exc:
            ProblemImportValidationService.validate_dto(
                self._make_valid_dto(templates=[
                    {
                        "language": "python",
                        "template_code": "def solve():\n    # generic comment\n    pass",
                        "function_name": "solve",
                        "arg_style": "single"
                    }
                ])
            )
        assert "Language templates extraction failed" in exc.value.message

    def test_generic_js_template_solve(self):
        with pytest.raises(ProblemImportValidationError) as exc:
            ProblemImportValidationService.validate_dto(
                self._make_valid_dto(templates=[
                    {
                        "language": "javascript",
                        "template_code": "function solve() {}",
                        "function_name": "solve",
                        "arg_style": "single"
                    }
                ])
            )
        assert "Language templates extraction failed" in exc.value.message

    def test_real_template_not_flagged(self):
        """A real template with actual function name should NOT be flagged as generic."""
        dto = self._make_valid_dto(templates=[
            {
                "language": "python",
                "template_code": "def twoSum(nums, target):\n    pass",
                "function_name": "twoSum",
                "arg_style": "positional"
            }
        ])
        # Should not raise
        ProblemImportValidationService.validate_dto(dto)

    def test_no_templates(self):
        with pytest.raises(ProblemImportValidationError) as exc:
            ProblemImportValidationService.validate_dto(self._make_valid_dto(templates=[]))
        assert "No language templates extracted" in exc.value.message

    def test_null_expected_output(self):
        with pytest.raises(ProblemImportValidationError) as exc:
            ProblemImportValidationService.validate_dto(
                self._make_valid_dto(test_cases=[
                    {"input": "1", "expected_output": "null", "is_sample": True, "order_index": 0, "weight": 1}
                ])
            )
        assert "Sample output for test case 1 is missing or is placeholder 'null'" in exc.value.message

    def test_empty_expected_output(self):
        with pytest.raises(ProblemImportValidationError) as exc:
            ProblemImportValidationService.validate_dto(
                self._make_valid_dto(test_cases=[
                    {"input": "1", "expected_output": "", "is_sample": True, "order_index": 0, "weight": 1}
                ])
            )
        assert "Sample output for test case 1 is missing" in exc.value.message

    def test_no_sample_test_cases(self):
        with pytest.raises(ProblemImportValidationError) as exc:
            ProblemImportValidationService.validate_dto(
                self._make_valid_dto(test_cases=[
                    {"input": "1", "expected_output": "1", "is_sample": False, "order_index": 0, "weight": 1}
                ])
            )
        assert "No sample test cases extracted" in exc.value.message

    def test_empty_constraints_section(self):
        with pytest.raises(ProblemImportValidationError) as exc:
            ProblemImportValidationService.validate_dto(
                self._make_valid_dto(description="<p>Find sum.</p> <p><strong>Constraints:</strong></p>")
            )
        assert "Constraints section is empty or contains no valid rules" in exc.value.message

    def test_invalid_difficulty(self):
        with pytest.raises(ProblemImportValidationError) as exc:
            ProblemImportValidationService.validate_dto(self._make_valid_dto(difficulty="IMPOSSIBLE"))
        assert "Invalid difficulty value" in exc.value.message

    def test_missing_difficulty(self):
        with pytest.raises(ProblemImportValidationError) as exc:
            ProblemImportValidationService.validate_dto(self._make_valid_dto(difficulty=None))
        assert "Difficulty is missing" in exc.value.message

    def test_multiple_errors_aggregated(self):
        """When multiple fields are broken, all errors should be reported."""
        with pytest.raises(ProblemImportValidationError) as exc:
            ProblemImportValidationService.validate_dto({
                "slug": "bad",
                "title": "",
                "description": "",
                "difficulty": None,
                "tags": [],
                "templates": [],
                "test_cases": [],
                "hints": []
            })
        errors = exc.value.errors
        assert len(errors) >= 4  # title, description, difficulty, templates, test_cases


# ══════════════════════════════════════════════════════════════════════════════
# 2. Parser Unit Tests
# ══════════════════════════════════════════════════════════════════════════════

class TestLeetCodeParser:
    """Tests for LeetCodeParser.parse_question_data"""

    def test_parse_valid_question(self):
        question = {
            "title": "Two Sum",
            "titleSlug": "two-sum",
            "content": "<p>Given an array of integers <code>nums</code> and an integer <code>target</code>.</p><pre>Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]</pre><pre>Input: nums = [3,2,4], target = 6\nOutput: [1,2]</pre><p>Constraints: 2 <= n <= 10^4</p>",
            "difficulty": "Easy",
            "hints": ["Use a hash map."],
            "exampleTestcases": "[2,7,11,15]\n9\n[3,2,4]\n6",
            "topicTags": [{"name": "Array", "slug": "array"}, {"name": "Hash Table", "slug": "hash table"}],
            "codeSnippets": [
                {"lang": "Python3", "langSlug": "python3", "code": "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        "},
                {"lang": "JavaScript", "langSlug": "javascript", "code": "var twoSum = function(nums, target) {\n    \n};"}
            ]
        }
        dto = LeetCodeParser.parse_question_data("two-sum", question)
        assert dto["title"] == "Two Sum"
        assert dto["difficulty"] == DifficultyEnum.EASY
        assert len(dto["templates"]) >= 2
        assert dto["templates"][0]["function_name"] == "twoSum"
        assert len(dto["test_cases"]) > 0
        # Should pass validation
        ProblemImportValidationService.validate_dto(dto)

    def test_parse_premium_question_produces_invalid_dto(self):
        """Premium questions with null content/snippets should produce a DTO that fails validation."""
        question = {
            "title": "Alien Dictionary",
            "titleSlug": "alien-dictionary",
            "content": None,
            "difficulty": "Hard",
            "hints": [],
            "exampleTestcases": "",
            "topicTags": [{"name": "Graph", "slug": "graph"}],
            "codeSnippets": None
        }
        dto = LeetCodeParser.parse_question_data("alien-dictionary", question)
        # The parser should produce a DTO with placeholder description and generic templates
        with pytest.raises(ProblemImportValidationError) as exc:
            ProblemImportValidationService.validate_dto(dto)
        assert any("Description" in e for e in exc.value.errors) or \
               any("templates" in e.lower() for e in exc.value.errors)


class TestGFGParser:
    """Tests for GFGParser.parse_question_data"""

    def test_parse_valid_gfg_problem(self):
        prob_data = {
            "problem_name": "Reverse an Array",
            "problem_question": "<p>Given an array, reverse it.</p><pre>Input: arr = [1, 2, 3]\nOutput: [3, 2, 1]</pre><p>Constraints: 1 <= N <= 10^5</p>",
            "problem_level_text": "Easy",
            "tags": {"topic_tags": ["Array"]},
            "extra": {
                "initial_user_func": {
                    "python3": {"user_code": "class Solution:\n    def reverseArray(self, arr):\n        # code here\n        pass"},
                    "javascript": {"user_code": "class Solution {\n    reverseArray(arr) {\n        // code here\n    }\n}"}
                }
            }
        }
        dto = GFGParser.parse_question_data("reverse-an-array", prob_data)
        assert dto["title"] == "Reverse an Array"
        assert dto["difficulty"] == DifficultyEnum.EASY
        assert len(dto["templates"]) >= 2
        assert dto["templates"][0]["function_name"] == "reverseArray"
        # Should pass validation
        ProblemImportValidationService.validate_dto(dto)

    def test_parse_gfg_placeholder_description_fails_validation(self):
        """GFG problem with placeholder description should fail validation."""
        prob_data = {
            "problem_name": "Some Problem",
            "problem_question": "No description provided.",
            "problem_level_text": "Medium",
            "tags": {"topic_tags": []},
            "extra": {
                "initial_user_func": {
                    "python3": {"user_code": "class Solution:\n    def solve(self):\n        pass"}
                }
            }
        }
        dto = GFGParser.parse_question_data("some-problem", prob_data)
        with pytest.raises(ProblemImportValidationError):
            ProblemImportValidationService.validate_dto(dto)


# ══════════════════════════════════════════════════════════════════════════════
# 3. Integration Tests with Mock Scrapers (DB-backed)
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_leetcode_premium_import_fails(db, monkeypatch):
    """
    Simulates a LeetCode Premium problem (Alien Dictionary) returning null
    content and null code snippets. The pipeline must raise
    ProblemImportValidationError, NOT silently create a broken record.
    """
    premium_gql_response = {
        "data": {
            "question": {
                "title": "Alien Dictionary",
                "titleSlug": "alien-dictionary",
                "content": None,
                "difficulty": "Hard",
                "hints": [],
                "exampleTestcases": "",
                "topicTags": [{"name": "Graph", "slug": "graph"}],
                "codeSnippets": None
            }
        }
    }

    # Build a mock response where json() is synchronous (matching httpx behavior)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json = MagicMock(return_value=premium_gql_response)

    # Build a mock async client that works as an async context manager
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    # Patch httpx.AsyncClient to return our mock
    monkeypatch.setattr("httpx.AsyncClient", MagicMock(return_value=mock_client))

    # Mock resolve_slug to bypass REST query
    monkeypatch.setattr(LeetCodeImporter, "resolve_slug", AsyncMock(return_value="alien-dictionary"))

    with pytest.raises(ProblemImportValidationError) as exc:
        await LeetCodeImporter.import_problem(db, "alien-dictionary")

    # Must flag at least description or template issues
    assert any(
        keyword in exc.value.message
        for keyword in ["Description", "templates", "Sample output"]
    ), f"Unexpected error message: {exc.value.message}"


@pytest.mark.asyncio
async def test_leetcode_valid_import_succeeds(db, monkeypatch):
    """
    Simulates a valid LeetCode problem (Two Sum) and verifies the full pipeline
    succeeds: scrape -> parse -> validate -> save.
    """
    valid_gql_response = {
        "data": {
            "question": {
                "title": "Two Sum",
                "titleSlug": "two-sum",
                "content": "<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices.</p><pre>Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]</pre><pre>Input: nums = [3,2,4], target = 6\nOutput: [1,2]</pre><p>Constraints: 2 <= nums.length <= 10^4</p>",
                "difficulty": "Easy",
                "hints": ["Try using a hash map."],
                "exampleTestcases": "[2,7,11,15]\n9\n[3,2,4]\n6",
                "topicTags": [{"name": "Array", "slug": "array"}, {"name": "Hash Table", "slug": "hash table"}],
                "codeSnippets": [
                    {"lang": "Python3", "langSlug": "python3", "code": "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        "},
                    {"lang": "JavaScript", "langSlug": "javascript", "code": "var twoSum = function(nums, target) {\n    \n};"}
                ]
            }
        }
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json = MagicMock(return_value=valid_gql_response)

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    monkeypatch.setattr("httpx.AsyncClient", MagicMock(return_value=mock_client))
    monkeypatch.setattr(LeetCodeImporter, "resolve_slug", AsyncMock(return_value="two-sum-test"))

    problem = await LeetCodeImporter.import_problem(db, "two-sum")
    assert problem.title == "Two Sum"
    assert problem.slug == "two-sum-test"
    assert problem.difficulty == DifficultyEnum.EASY
    assert len(problem.templates) >= 2
    assert len(problem.test_cases) > 0


@pytest.mark.asyncio
async def test_gfg_import_placeholder_description_fails(db, monkeypatch):
    """
    Simulates a GFG problem page with a placeholder description.
    The pipeline must raise ProblemImportValidationError.
    """
    mock_html = """
    <html>
      <script id="__NEXT_DATA__" type="application/json">
      {
        "props": {
          "pageProps": {
            "initialState": {
              "problemApi": {
                "queries": {
                  "getProblemDetails": {
                    "data": {
                      "problem_name": "Alien Dictionary",
                      "problem_level_text": "Hard",
                      "problem_question": "No description provided.",
                      "tags": { "topic_tags": ["Graph"] },
                      "extra": {
                        "initial_user_func": {
                          "python3": { "user_code": "class Solution:\\n    def solve(self): pass" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      </script>
    </html>
    """

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = mock_html

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    monkeypatch.setattr("httpx.AsyncClient", MagicMock(return_value=mock_client))

    with pytest.raises(ProblemImportValidationError) as exc:
        await GFGImporter.import_problem(db, "alien-dictionary")

    assert "Description extraction failed" in exc.value.message


@pytest.mark.asyncio
async def test_gfg_valid_import_succeeds(db, monkeypatch):
    """
    Simulates a valid GFG problem page and verifies the full pipeline succeeds.
    """
    mock_html = """
    <html>
      <script id="__NEXT_DATA__" type="application/json">
      {
        "props": {
          "pageProps": {
            "initialState": {
              "problemApi": {
                "queries": {
                  "getProblemDetails": {
                    "data": {
                      "problem_name": "Reverse Array",
                      "problem_level_text": "Easy",
                      "problem_question": "<p>Given an array, reverse it.</p><pre>Input: arr = [1, 2, 3]\\nOutput: [3, 2, 1]</pre><p>Constraints: 1 <= N <= 10^5</p>",
                      "tags": { "topic_tags": ["Array"] },
                      "extra": {
                        "initial_user_func": {
                          "python3": { "user_code": "class Solution:\\n    def reverseArray(self, arr):\\n        # code here\\n        pass" },
                          "javascript": { "user_code": "class Solution {\\n    reverseArray(arr) {\\n        // code here\\n    }\\n}" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      </script>
    </html>
    """

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = mock_html

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    monkeypatch.setattr("httpx.AsyncClient", MagicMock(return_value=mock_client))

    problem = await GFGImporter.import_problem(db, "reverse-array-gfg-test")
    assert problem.title == "Reverse Array"
    assert problem.difficulty == DifficultyEnum.EASY
    assert len(problem.templates) >= 1


# ══════════════════════════════════════════════════════════════════════════════
# 4. is_generic_template Edge Case Tests
# ══════════════════════════════════════════════════════════════════════════════

class TestGenericTemplateDetection:
    """Verifies the generic template detector doesn't false-positive on real code."""

    def test_python_generic_solve_pass(self):
        assert ProblemImportValidationService.is_generic_template("def solve():\n    pass", "python") is True

    def test_python_generic_solution_pass(self):
        assert ProblemImportValidationService.is_generic_template("def solution():\n    pass", "python") is True

    def test_python_real_function(self):
        assert ProblemImportValidationService.is_generic_template(
            "def twoSum(nums, target):\n    pass", "python"
        ) is False

    def test_python_solve_with_params(self):
        """solve() with params is a real template, not generic."""
        assert ProblemImportValidationService.is_generic_template(
            "def solve(arr, k):\n    pass", "python"
        ) is False

    def test_js_generic_solve(self):
        assert ProblemImportValidationService.is_generic_template("function solve() {}", "javascript") is True

    def test_js_real_function(self):
        assert ProblemImportValidationService.is_generic_template(
            "function twoSum(nums, target) {\n    \n}", "javascript"
        ) is False

    def test_empty_string(self):
        assert ProblemImportValidationService.is_generic_template("", "python") is True

    def test_none_code(self):
        assert ProblemImportValidationService.is_generic_template(None, "python") is True

    def test_cpp_template_not_affected(self):
        """C++ templates should never be flagged as generic (no detection logic for cpp)."""
        assert ProblemImportValidationService.is_generic_template(
            "class Solution { public: int solve() { return 0; } };", "cpp"
        ) is False
