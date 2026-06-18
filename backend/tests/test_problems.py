import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User, RoleEnum
from app.repositories.user_repo import UserRepo

@pytest.mark.asyncio
async def test_list_problems_empty(client: AsyncClient):
    resp = await client.get("/api/v1/problems")
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["total"] == 0

@pytest.mark.asyncio
async def test_admin_create_tag_and_problem(client: AsyncClient, db: AsyncSession):
    # 1. Register admin
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "admin@example.com", "username": "adminuser", "password": "Password123"}
    )
    token = resp.json()["access_token"]

    # Make them an admin in the database
    from sqlalchemy import select
    stmt = select(User).where(User.username == "adminuser")
    res = await db.execute(stmt)
    user = res.scalar_one()
    user.role = RoleEnum.ADMIN
    await db.commit()

    # 2. Create Tag
    tag_resp = await client.post(
        "/api/v1/problems/tags?name=Recursion",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert tag_resp.status_code == 201
    tag_id = tag_resp.json()["id"]

    # 3. Create Problem
    problem_payload = {
        "slug": "fibonacci",
        "title": "Fibonacci Number",
        "description": "Calculate the N-th Fibonacci number.",
        "difficulty": "EASY",
        "time_limit_ms": 2000,
        "memory_limit_kb": 262144,
        "score_base": 100,
        "runtime_bonus_max": 20,
        "expected_complexity": "O(N)",
        "tag_ids": [tag_id],
        "templates": [
            {
                "language": "python",
                "template_code": "def fib(n):\n    pass",
                "function_name": "fib",
                "arg_style": "single"
            }
        ],
        "test_cases": [
            {
                "input": "2",
                "expected_output": "1",
                "is_sample": True,
                "order_index": 0,
                "weight": 1
            },
            {
                "input": "0",
                "expected_output": "0",
                "is_sample": False,
                "order_index": 1,
                "weight": 1
            },
            {
                "input": "1",
                "expected_output": "1",
                "is_sample": False,
                "order_index": 2,
                "weight": 1
            },
            {
                "input": "3",
                "expected_output": "2",
                "is_sample": False,
                "order_index": 3,
                "weight": 1
            }
        ]
    }

    prob_resp = await client.post(
        "/api/v1/problems",
        headers={"Authorization": f"Bearer {token}"},
        json=problem_payload
    )
    assert prob_resp.status_code == 201
    data = prob_resp.json()
    assert data["slug"] == "fibonacci"
    assert len(data["sample_test_cases"]) == 1
    # Hidden test cases are NOT exposed
    assert "test_cases" not in data

    # 4. Check that it is NOT in the public problems list since it is not published yet
    list_resp = await client.get("/api/v1/problems")
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] == 0

    # 5. Update it to be published
    patch_resp = await client.patch(
        "/api/v1/problems/fibonacci",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_published": True}
    )
    assert patch_resp.status_code == 200

    # 6. Check that it is now visible in the public list
    list_resp2 = await client.get("/api/v1/problems")
    assert list_resp2.status_code == 200
    assert list_resp2.json()["total"] == 1
    assert list_resp2.json()["items"][0]["slug"] == "fibonacci"


@pytest.mark.asyncio
async def test_random_problem(client: AsyncClient, db: AsyncSession):
    # Register admin
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "randomadmin@example.com", "username": "randomadmin", "password": "Password123"}
    )
    token = resp.json()["access_token"]

    # Make them an admin in the database
    from sqlalchemy import select
    stmt = select(User).where(User.username == "randomadmin")
    res = await db.execute(stmt)
    user = res.scalar_one()
    user.role = RoleEnum.ADMIN
    await db.commit()

    # Create Problem 1 (EASY)
    prob_resp1 = await client.post(
        "/api/v1/problems",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "slug": "easy-prob",
            "title": "Easy Problem",
            "description": "An easy description.",
            "difficulty": "EASY",
            "templates": [
                {
                    "language": "python",
                    "template_code": "def func():\n    pass",
                    "function_name": "func",
                    "arg_style": "single"
                }
            ],
            "test_cases": [
                {"input": "1", "expected_output": "1", "is_sample": True, "order_index": 0, "weight": 1},
                {"input": "2", "expected_output": "2", "is_sample": False, "order_index": 1, "weight": 1},
                {"input": "3", "expected_output": "3", "is_sample": False, "order_index": 2, "weight": 1},
                {"input": "4", "expected_output": "4", "is_sample": False, "order_index": 3, "weight": 1}
            ]
        }
    )
    assert prob_resp1.status_code == 201

    # Create Problem 2 (HARD)
    prob_resp2 = await client.post(
        "/api/v1/problems",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "slug": "hard-prob",
            "title": "Hard Problem",
            "description": "A hard description.",
            "difficulty": "HARD",
            "templates": [
                {
                    "language": "python",
                    "template_code": "def func():\n    pass",
                    "function_name": "func",
                    "arg_style": "single"
                }
            ],
            "test_cases": [
                {"input": "1", "expected_output": "1", "is_sample": True, "order_index": 0, "weight": 1},
                {"input": "2", "expected_output": "2", "is_sample": False, "order_index": 1, "weight": 1},
                {"input": "3", "expected_output": "3", "is_sample": False, "order_index": 2, "weight": 1},
                {"input": "4", "expected_output": "4", "is_sample": False, "order_index": 3, "weight": 1}
            ]
        }
    )
    assert prob_resp2.status_code == 201

    # Publish both problems
    await client.patch("/api/v1/problems/easy-prob", headers={"Authorization": f"Bearer {token}"}, json={"is_published": True})
    await client.patch("/api/v1/problems/hard-prob", headers={"Authorization": f"Bearer {token}"}, json={"is_published": True})

    # Fetch random with no filters
    rand_resp = await client.get("/api/v1/problems/random")
    assert rand_resp.status_code == 200
    assert rand_resp.json()["slug"] in ["easy-prob", "hard-prob", "fibonacci"]

    # Fetch random filtering by difficulty EASY
    rand_easy = await client.get("/api/v1/problems/random?difficulty=EASY")
    assert rand_easy.status_code == 200
    assert rand_easy.json()["slug"] in ["easy-prob", "fibonacci"]

    # Fetch random filtering by difficulty HARD
    rand_hard = await client.get("/api/v1/problems/random?difficulty=HARD")
    assert rand_hard.status_code == 200
    assert rand_hard.json()["slug"] == "hard-prob"


@pytest.mark.asyncio
async def test_get_last_submission(client: AsyncClient, db: AsyncSession):
    # 1. Register a user
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "subtest@example.com", "username": "subtestuser", "password": "Password123"}
    )
    assert resp.status_code in (200, 201)
    token = resp.json()["access_token"]

    # 2. Get user object to retrieve user.id
    from sqlalchemy import select
    stmt = select(User).where(User.username == "subtestuser")
    res = await db.execute(stmt)
    user = res.scalar_one()

    # 3. Create a problem
    from app.models.problem import Problem
    import uuid
    problem_id = uuid.uuid4()
    problem = Problem(
        id=problem_id,
        slug="test-last-sub-prob",
        title="Test Last Sub Prob",
        description="Calculate something.",
        difficulty="EASY",
        time_limit_ms=2000,
        memory_limit_kb=262144,
        score_base=100,
        is_published=True
    )
    db.add(problem)
    await db.commit()

    # 4. Attempt to fetch last submission (should return 404 since none exists yet)
    get_resp = await client.get(
        "/api/v1/problems/test-last-sub-prob/submissions/last",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert get_resp.status_code == 404
    assert get_resp.json()["detail"] == "No submissions found"

    # 5. Insert a submission directly using DB session
    from app.models.submission import Submission, SubmissionStatus
    submission = Submission(
        id=uuid.uuid4(),
        user_id=user.id,
        problem_id=problem.id,
        language="python",
        source_code="print('hello')",
        status=SubmissionStatus.ACCEPTED,
        passed_count=2,
        total_count=2,
        score=100,
        run_samples_only=False
    )
    db.add(submission)
    await db.commit()

    # 6. Fetch last submission again (should return the submission we just added)
    get_resp = await client.get(
        "/api/v1/problems/test-last-sub-prob/submissions/last",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["language"] == "python"
    assert data["source_code"] == "print('hello')"
    assert data["status"].lower() == "accepted"


@pytest.mark.asyncio
async def test_leetcode_importer_resolve_slug():
    from app.services.leetcode_importer import LeetCodeImporter

    slug1 = await LeetCodeImporter.resolve_slug("google:3161. Block Placement Queries")
    assert slug1 == "block-placement-queries"

    slug2 = await LeetCodeImporter.resolve_slug("3161")
    assert slug2 == "block-placement-queries"

    slug3 = await LeetCodeImporter.resolve_slug("https://leetcode.com/problems/block-placement-queries/")
    assert slug3 == "block-placement-queries"

    slug4 = await LeetCodeImporter.resolve_slug("3sum")
    assert slug4 == "3sum"

    slug5 = await LeetCodeImporter.resolve_slug("right view of binary tree")
    assert slug5 == "binary-tree-right-side-view"

    slug6 = await LeetCodeImporter.resolve_slug("maximum array sum")
    assert slug6 == "maximum-subarray"

    slug7 = await LeetCodeImporter.resolve_slug("kadane's algorithm")
    assert slug7 == "maximum-subarray"

    slug8 = await LeetCodeImporter.resolve_slug("lru cache")
    assert slug8 == "lru-cache"



@pytest.mark.asyncio
async def test_problem_import_fallback(client: AsyncClient, db: AsyncSession, monkeypatch):
    import httpx
    from unittest.mock import AsyncMock

    original_get = httpx.AsyncClient.get
    original_post = httpx.AsyncClient.post

    async def mock_get(self, url, *args, **kwargs):
        url_str = str(url)
        if "http://test" in url_str or url_str.startswith("/"):
            return await original_get(self, url, *args, **kwargs)
        mock_resp = AsyncMock()
        mock_resp.status_code = 404
        mock_resp.text = "Problem not found"
        mock_resp.json = lambda: {"problems": [], "error": {"code": 404, "message": "Not Found"}}
        return mock_resp

    async def mock_post(self, url, *args, **kwargs):
        url_str = str(url)
        if "http://test" in url_str or url_str.startswith("/"):
            return await original_post(self, url, *args, **kwargs)
        mock_resp = AsyncMock()
        mock_resp.status_code = 404
        mock_resp.json = lambda: {"data": {"question": None}}
        return mock_resp

    monkeypatch.setattr("httpx.AsyncClient.get", mock_get)
    monkeypatch.setattr("httpx.AsyncClient.post", mock_post)

    # This slug definitely doesn't exist on LeetCode or GFG practice portal
    non_existent_slug = "non-existent-problem-slug-999"

    resp = await client.post(
        "/api/v1/problems/import",
        json={"url_or_slug": non_existent_slug}
    )

    # It should fail with 404 Not Found instead of creating a garbage fallback problem
    assert resp.status_code == 404
    data = resp.json()
    assert "detail" in data
    assert "Could not find problem" in data["detail"]["message"] or "Could not locate problem" in data["detail"]["message"]

@pytest.mark.asyncio
async def test_gfg_discovery_pipeline_and_errors(client: AsyncClient, monkeypatch):
    from app.services.gfg_importer import GFGImporter
    from unittest.mock import AsyncMock
    import httpx

    original_get = httpx.AsyncClient.get

    async def mock_get(self, url, *args, **kwargs):
        url_str = str(url)
        if "http://test" in url_str or url_str.startswith("/"):
            return await original_get(self, url, *args, **kwargs)
            
        mock_resp = AsyncMock()
        if "problems/search" in url_str:
            params = kwargs.get("params", {})
            query = params.get("query", "")
            mock_resp.status_code = 200
            
            if "Longest" in query:
                mock_resp.json = lambda: {
                    "problems": [
                        {
                            "id": 703043,
                            "slug": "longest-sub-array-with-sum-k0809",
                            "problem_name": "Longest Subarray with Sum K",
                            "problem_url": "https://www.geeksforgeeks.org/problems/longest-sub-array-with-sum-k0809/1"
                        }
                    ]
                }
            else:
                mock_resp.json = lambda: {"problems": []}
            return mock_resp
            
        elif "metainfo" in url_str:
            # Force Stage 1 candidate check to return 404 so we test Stage 2 and Stage 3
            mock_resp.status_code = 404
            mock_resp.json = lambda: {}
            return mock_resp
            
        else:
            mock_resp.status_code = 404
            return mock_resp

    monkeypatch.setattr("httpx.AsyncClient.get", mock_get)

    # 1. Test resolve_slug with direct URL
    slug1, trace1 = await GFGImporter.resolve_slug("https://www.geeksforgeeks.org/problems/longest-sub-array-with-sum-k/1")
    assert slug1 == "longest-sub-array-with-sum-k"
    assert trace1["is_url"] is True

    # 2. Test resolve_slug with exact title (Stage 2a)
    slug2, trace2 = await GFGImporter.resolve_slug("Longest Subarray with Sum K")
    assert slug2 == "longest-sub-array-with-sum-k0809"
    assert trace2["stage"] == "stage2_exact_name"

    # 3. Test resolve_slug with slight variation (Stage 3 fuzzy)
    slug3, trace3 = await GFGImporter.resolve_slug("Longest Sub-array with Sum K")
    assert slug3 == "longest-sub-array-with-sum-k0809"
    assert trace3["stage"] == "stage3_fuzzy"

    # 4. Test error handling for non-existent GFG problem via API import
    resp = await client.post(
        "/api/v1/problems/import",
        json={"url_or_slug": "gfg:this-problem-truly-does-not-exist-at-all-99999"}
    )
    assert resp.status_code == 404
    data = resp.json()
    assert data["detail"]["error_type"] == "NOT_FOUND"
    assert "truly does not exist" in data["detail"]["message"]

@pytest.mark.asyncio
async def test_gfg_fuzzy_matching_safety_and_ambiguity(monkeypatch):
    from app.services.gfg_importer import GFGImporter
    from unittest.mock import AsyncMock
    import httpx

    async def mock_get(self, url, *args, **kwargs):
        url_str = str(url)
        mock_resp = AsyncMock()
        mock_resp.status_code = 200
        
        if "problems/search" in url_str:
            params = kwargs.get("params", {})
            query = params.get("query", "")
            
            if query == "ambiguous-query":
                mock_resp.json = lambda: {
                    "problems": [
                        {
                            "slug": "ambiguous-query-a",
                            "problem_name": "ambiguous-query-a",
                            "problem_url": "https://www.geeksforgeeks.org/problems/ambiguous-query-a/1"
                        },
                        {
                            "slug": "ambiguous-query-b",
                            "problem_name": "ambiguous-query-b",
                            "problem_url": "https://www.geeksforgeeks.org/problems/ambiguous-query-b/1"
                        }
                    ]
                }
            elif query == "low-confidence-query":
                mock_resp.json = lambda: {
                    "problems": [
                        {
                            "slug": "totally-different-slug",
                            "problem_name": "Totally Different Problem Name",
                            "problem_url": "https://www.geeksforgeeks.org/problems/totally-different-slug/1"
                        }
                    ]
                }
            else:
                mock_resp.json = lambda: {"problems": []}
            return mock_resp
        else:
            mock_resp.status_code = 404
            return mock_resp

    monkeypatch.setattr("httpx.AsyncClient.get", mock_get)

    # 1. Test ambiguous query resolution (should fail with None and record ambiguity)
    slug_ambig, trace_ambig = await GFGImporter.resolve_slug("ambiguous-query")
    assert slug_ambig is None
    assert trace_ambig["stage"] == "stage3_fuzzy_ambiguous"
    assert "Ambiguity between" in trace_ambig["search_error"]

    # 2. Test low confidence query resolution (should fail with None and record threshold failure)
    slug_low, trace_low = await GFGImporter.resolve_slug("low-confidence-query")
    assert slug_low is None
    assert trace_low["stage"] == "failed_to_resolve"
    assert "below safety threshold" in trace_low["search_error"]

@pytest.mark.asyncio
async def test_api_import_ambiguous_match_resolution(client: AsyncClient, monkeypatch):
    from app.services.gfg_importer import GFGImporter
    from app.services.importer_exceptions import AmbiguousProblemException

    async def mock_import_problem(session, url_or_slug):
        raise AmbiguousProblemException(
            message="Multiple potential matches found.",
            candidates=[
                {"title": "Option A", "slug": "option-a", "platform": "gfg", "score": 0.9},
                {"title": "Option B", "slug": "option-b", "platform": "gfg", "score": 0.88}
            ]
        )

    monkeypatch.setattr("app.services.gfg_importer.GFGImporter.import_problem", mock_import_problem)

    resp = await client.post(
        "/api/v1/problems/import",
        json={"url_or_slug": "gfg:ambiguous-term"}
    )

    assert resp.status_code == 409
    data = resp.json()
    assert data["detail"]["error_type"] == "AMBIGUOUS_MATCH"
    assert len(data["detail"]["candidates"]) == 2
    assert data["detail"]["candidates"][0]["slug"] == "option-a"

