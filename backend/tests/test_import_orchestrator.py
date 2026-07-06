import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.import_orchestrator import ImportOrchestrator
from app.services.import_utils import compute_match_score

@pytest.mark.asyncio
async def test_target_queries_resolution(monkeypatch):
    # Mock search responses
    lc_mock_data = {
        "stat_status_pairs": [
            {
                "stat": {
                    "frontend_question_id": 1863,
                    "question__title_slug": "sum-of-all-subset-xor-totals",
                    "question__title": "Sum of All Subset XOR Totals"
                }
            },
            {
                "stat": {
                    "frontend_question_id": 4,
                    "question__title_slug": "median-of-two-sorted-arrays",
                    "question__title": "Median of Two Sorted Arrays"
                }
            },
            {
                "stat": {
                    "frontend_question_id": 146,
                    "question__title_slug": "lru-cache",
                    "question__title": "LRU Cache"
                }
            },
            {
                "stat": {
                    "frontend_question_id": 269,
                    "question__title_slug": "alien-dictionary",
                    "question__title": "Alien Dictionary"
                }
            }
        ]
    }

    gfg_mock_data = {
        "problems": [
            {
                "problem_name": "Longest Subarray with Sum K",
                "slug": "longest-sub-array-with-sum-k",
                "problem_url": "https://www.geeksforgeeks.org/problems/longest-sub-array-with-sum-k/1"
            },
            {
                "problem_name": "Maximum XOR Subarray",
                "slug": "maximum-xor-subarray",
                "problem_url": "https://www.geeksforgeeks.org/problems/maximum-xor-subarray/1"
            }
        ]
    }

    async def mock_search_leetcode():
        return lc_mock_data["stat_status_pairs"]

    async def mock_search_gfg(query):
        return gfg_mock_data["problems"]

    monkeypatch.setattr(ImportOrchestrator, "_search_leetcode", mock_search_leetcode)
    monkeypatch.setattr(ImportOrchestrator, "_search_gfg", mock_search_gfg)

    # Mock detail fetch and validation
    async def mock_fetch_question_data_lc(slug):
        return {
            "title": "Dummy",
            "titleSlug": slug,
            "content": "<p>Dummy description</p> <p><strong>Constraints:</strong> 1 <= n</p>",
            "difficulty": "Easy",
            "hints": [],
            "exampleTestcases": "1",
            "topicTags": [],
            "codeSnippets": [{"lang": "Python3", "langSlug": "python3", "code": "class Solution:\n    def solve(self):\n        pass"}]
        }

    async def mock_fetch_question_data_gfg(slug):
        return {
            "problem_name": "Dummy",
            "problem_question": "<p>Dummy description</p> <p><strong>Constraints:</strong> 1 <= n</p>",
            "problem_level_text": "Easy",
            "tags": {"topic_tags": []},
            "extra": {
                "initial_user_func": {
                    "python3": {
                        "user_code": "class Solution:\n    def solve(self):\n        pass"
                    }
                }
            }
        }

    monkeypatch.setattr("app.services.leetcode_importer.LeetCodeImporter.fetch_question_data", mock_fetch_question_data_lc)
    monkeypatch.setattr("app.services.gfg_importer.GFGImporter.fetch_question_data", mock_fetch_question_data_gfg)
    
    # Mock validation service to bypass real validation check
    monkeypatch.setattr("app.services.problem_import_validation_service.ProblemImportValidationService.validate_dto", lambda dto: None)
    
    # Mock DB session
    mock_session = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_res
    
    mock_session.add = MagicMock()
    mock_session.flush = AsyncMock()
    mock_session.commit = AsyncMock()
    mock_session.rollback = AsyncMock()

    # 1. "All Subsets XOR Sum" -> should resolve to "sum-of-all-subset-xor-totals"
    p1 = await ImportOrchestrator.import_problem(mock_session, "All Subsets XOR Sum")
    assert p1.slug == "sum-of-all-subset-xor-totals"

    # 2. "all subsets xor sum" -> should resolve to "sum-of-all-subset-xor-totals"
    p2 = await ImportOrchestrator.import_problem(mock_session, "all subsets xor sum")
    assert p2.slug == "sum-of-all-subset-xor-totals"

    # 3. "sum of xor of all possible subsets" -> should resolve to "sum-of-all-subset-xor-totals"
    p3 = await ImportOrchestrator.import_problem(mock_session, "sum of xor of all possible subsets")
    assert p3.slug == "sum-of-all-subset-xor-totals"

    # 4. "Longest Subarray with Sum K" -> should resolve to "longest-sub-array-with-sum-k"
    p4 = await ImportOrchestrator.import_problem(mock_session, "Longest Subarray with Sum K")
    assert p4.slug == "longest-sub-array-with-sum-k"

    # 5. "Alien Dictionary" -> should resolve to "alien-dictionary"
    p5 = await ImportOrchestrator.import_problem(mock_session, "Alien Dictionary")
    assert p5.slug == "alien-dictionary"

    # 6. "Median of Two Sorted Arrays" -> should resolve to "median-of-two-sorted-arrays"
    p6 = await ImportOrchestrator.import_problem(mock_session, "Median of Two Sorted Arrays")
    assert p6.slug == "median-of-two-sorted-arrays"

    # 7. "LRU Cache" -> should resolve to "lru-cache"
    p7 = await ImportOrchestrator.import_problem(mock_session, "LRU Cache")
    assert p7.slug == "lru-cache"

    # 8. "Maximum XOR Subarray" -> should resolve to "maximum-xor-subarray"
    p8 = await ImportOrchestrator.import_problem(mock_session, "Maximum XOR Subarray")
    assert p8.slug == "maximum-xor-subarray"
