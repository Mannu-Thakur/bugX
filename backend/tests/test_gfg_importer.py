import pytest
from unittest.mock import AsyncMock
from app.services.gfg_importer import GFGImporter
from app.models.problem import DifficultyEnum

@pytest.mark.asyncio
async def test_gfg_importer_parsing(db, monkeypatch):
    # Let's mock httpx.AsyncClient.get to return a mock response containing the NEXT_DATA script
    mock_resp = AsyncMock()
    mock_resp.status_code = 200
    
    # We can construct a simple HTML containing a mock NEXT_DATA
    mock_html = """
    <html>
      <script id="__NEXT_DATA__" type="application/json">
      {
        "problemApi": {
          "queries": {
            "getProblemDetails({\\"isProblemPublic\\":true,\\"probResource\\":\\"second-largest3735\\"})": {
              "data": {
                "id": 12345,
                "problem_name": "Second Largest",
                "problem_level_text": "Easy",
                "problem_question": "<p>Given an array of positive integers, return the second largest. <strong>Input:</strong> arr[] = [12, 35, 1, 10, 34, 1] <strong>Output:</strong> 34 <strong>Explanation:</strong> Largest is 35, second largest is 34.</p>",
                "tags": {
                  "topic_tags": ["Arrays", "Searching"]
                },
                "extra": {
                  "input": "12 35 1 10 34 1",
                  "initial_user_func": {
                    "python3": {
                      "user_code": "class Solution:\\n    def getSecondLargest(self, arr):\\n        # Code Here"
                    },
                    "javascript": {
                      "user_code": "class Solution {\\n    getSecondLargest(arr) {\\n        // code here\\n    }\\n}"
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
    mock_resp.text = mock_html
    
    # Patch httpx.AsyncClient.get
    mock_get = AsyncMock(return_value=mock_resp)
    monkeypatch.setattr("httpx.AsyncClient.get", mock_get)
    
    problem = await GFGImporter.import_problem(db, "second-largest3735")
    
    assert problem.title == "Second Largest"
    assert problem.slug == "second-largest3735"
    assert problem.difficulty == DifficultyEnum.EASY
    
    # Check templates
    assert len(problem.templates) >= 2
    py_template = next(t for t in problem.templates if t.language == "python")
    assert py_template.function_name == "getSecondLargest"
    assert py_template.template_code == "def getSecondLargest(arr):\n    # Code Here"
    
    js_template = next(t for t in problem.templates if t.language == "javascript")
    assert js_template.function_name == "getSecondLargest"
    assert js_template.template_code == "function getSecondLargest(arr) {\n    // code here\n}"
    
    # Check test cases
    assert len(problem.test_cases) >= 4  # 1 sample + 3 hidden
    sample_case = next(tc for tc in problem.test_cases if tc.is_sample)
    assert sample_case.input == "[12, 35, 1, 10, 34, 1]"
    assert sample_case.expected_output == "34"
