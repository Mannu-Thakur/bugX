import pytest
import asyncio
import json
import time
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.import_orchestrator import ImportOrchestrator
from app.utils.circuit_breaker import RedisCircuitBreaker
from app.services.import_job_manager import ImportJobManager
from app.services.import_utils import AliasDatabase, IS_TESTING
from app.services.importer_exceptions import ImportProviderUnavailableError, ImportNotFoundError

# Mock Redis class to intercept Redis calls in testing environment
class MockRedis:
    def __init__(self, *args, **kwargs):
        self.store = {}
        self.lists = {}
        self.sets = {}
        self.hsets = {}
        
    async def get(self, key):
        return self.store.get(key)
        
    async def set(self, key, value, *args, **kwargs):
        self.store[key] = str(value)
        return True
        
    async def setex(self, key, ttl, value):
        self.store[key] = str(value)
        return True
        
    async def lpush(self, key, value):
        if key not in self.lists:
            self.lists[key] = []
        self.lists[key].insert(0, str(value))
        return len(self.lists[key])
        
    async def lrange(self, key, start, end):
        if key in self.lists:
            return self.lists[key][start:end+1]
        return []
        
    async def ltrim(self, key, start, end):
        if key in self.lists:
            self.lists[key] = self.lists[key][start:end+1]
        return True
        
    async def brpop(self, key, timeout=0):
        if key in self.lists and self.lists[key]:
            val = self.lists[key].pop()
            return key, val
        return None
        
    async def zincrby(self, key, amount, value):
        if key not in self.sets:
            self.sets[key] = {}
        self.sets[key][value] = self.sets[key].get(value, 0.0) + float(amount)
        return self.sets[key][value]
        
    async def zrevrange(self, key, start, end, withscores=False):
        if key not in self.sets:
            return []
        items = sorted(self.sets[key].items(), key=lambda x: x[1], reverse=True)
        sliced = items[start:end+1]
        if withscores:
            return sliced
        return [x[0] for x in sliced]
        
    async def hincrby(self, key, field, amount):
        if key not in self.hsets:
            self.hsets[key] = {}
        self.hsets[key][field] = self.hsets[key].get(field, 0) + int(amount)
        return self.hsets[key][field]
        
    async def hgetall(self, key):
        return self.hsets.get(key, {})
        
    async def incr(self, key):
        val = int(self.store.get(key, 0)) + 1
        self.store[key] = str(val)
        return val
        
    async def incrby(self, key, amount):
        val = int(self.store.get(key, 0)) + int(amount)
        self.store[key] = str(val)
        return val

    async def incrbyfloat(self, key, amount):
        val = float(self.store.get(key, 0.0)) + float(amount)
        self.store[key] = str(val)
        return val

    async def aclose(self):
        pass


@pytest.fixture
def mock_redis_patch():
    mock_inst = MockRedis()
    with patch("redis.asyncio.Redis.from_url", return_value=mock_inst):
        yield mock_inst


@pytest.mark.asyncio
async def test_circuit_breaker_transitions(mock_redis_patch):
    """
    Tests circuit breaker CLOSED -> OPEN -> HALF-OPEN -> CLOSED transitions.
    """
    cb = RedisCircuitBreaker(provider="testprovider", failure_threshold=3, cooldown_period=1)
    
    # 1. Start state is CLOSED, requests allowed
    assert await cb.get_state() == "CLOSED"
    assert await cb.check_allow_request() is True
    
    # 2. Record 3 failures -> Open state
    await cb.record_failure()
    await cb.record_failure()
    assert await cb.get_state() == "CLOSED" # failure count is 2
    
    await cb.record_failure()
    assert await cb.get_state() == "OPEN" # Transitions to OPEN
    assert await cb.check_allow_request() is False # blocked
    
    # 3. Wait for cooldown period (1 second)
    await asyncio.sleep(1.1)
    
    # 4. Check status -> transitions to HALF-OPEN
    assert await cb.check_allow_request() is True
    assert await cb.get_state() == "HALF-OPEN"
    
    # 5. Success -> CLOSED
    await cb.record_success()
    assert await cb.get_state() == "CLOSED"
    assert await cb.get_failures() == 0


@pytest.mark.asyncio
async def test_import_job_manager_flow(mock_redis_patch, monkeypatch):
    """
    Tests ImportJobManager queueing and state transitions.
    """
    # Temporarily set IS_TESTING to False in import_job_manager to trigger Redis logic
    monkeypatch.setattr("app.services.import_job_manager.IS_TESTING", False)
    
    # 1. Enqueue job
    job_id = await ImportJobManager.enqueue_import("leetcode:two-sum", user_id="user123")
    assert job_id is not None
    
    # Check initial job status
    status = await ImportJobManager.get_job_status(job_id)
    assert status["id"] == job_id
    assert status["status"] == "pending"
    assert status["progress"] == 0
    
    # 2. Dequeue job
    job_payload = await ImportJobManager.dequeue_import()
    assert job_payload["job_id"] == job_id
    assert job_payload["url_or_slug"] == "leetcode:two-sum"
    assert job_payload["user_id"] == "user123"
    
    # 3. Update progress
    await ImportJobManager.update_progress(job_id, 50)
    status = await ImportJobManager.get_job_status(job_id)
    assert status["status"] == "processing"
    assert status["progress"] == 50
    
    # 4. Complete job
    await ImportJobManager.complete_job(job_id, "two-sum", {"title": "Two Sum"})
    status = await ImportJobManager.get_job_status(job_id)
    assert status["status"] == "completed"
    assert status["progress"] == 100
    assert status["result"]["slug"] == "two-sum"
    
    # 5. Fail job
    fail_job_id = await ImportJobManager.enqueue_import("leetcode:fail-slug")
    await ImportJobManager.fail_job(fail_job_id, "Network timeout")
    status = await ImportJobManager.get_job_status(fail_job_id)
    assert status["status"] == "failed"
    assert status["progress"] == 100
    assert status["error"] == "Network timeout"


@pytest.mark.asyncio
async def test_redis_cache_candidates(mock_redis_patch, monkeypatch):
    """
    Tests that candidates list is cached in Redis on first miss,
    and retrieved from Redis on subsequent hits without hitting search APIs.
    """
    monkeypatch.setattr("app.services.import_orchestrator.IS_TESTING", False)
    monkeypatch.setattr("app.services.import_orchestrator.ProblemImportValidationService.validate_dto", lambda dto: None)
    
    # Mocks
    mock_search_count = 0
    
    async def mock_search_leetcode():
        nonlocal mock_search_count
        mock_search_count += 1
        return [{"stat": {"question__title_slug": "two-sum", "question__title": "Two Sum"}}]
        
    async def mock_search_gfg(query):
        return []
        
    async def mock_fetch_candidate(cand):
        return {
            "slug": "two-sum",
            "title": "Two Sum",
            "description": "desc",
            "difficulty": DifficultyEnum.EASY,
            "tags": [],
            "templates": [],
            "test_cases": []
        }, "leetcode"
        
    monkeypatch.setattr(ImportOrchestrator, "_search_leetcode", mock_search_leetcode)
    monkeypatch.setattr(ImportOrchestrator, "_search_gfg", mock_search_gfg)
    monkeypatch.setattr(ImportOrchestrator, "_fetch_and_parse_candidate", mock_fetch_candidate)
    
    # DB mock
    mock_session = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_res
    
    from app.models.problem import DifficultyEnum
    
    # 1. First import (cache miss) -> calls search API
    await ImportOrchestrator.import_problem(mock_session, "two sum")
    assert mock_search_count == 1
    
    # 2. Second import (cache hit) -> bypasses search API
    await ImportOrchestrator.import_problem(mock_session, "two sum")
    assert mock_search_count == 1  # Should still be 1 (retrieved from Redis candidate cache!)


@pytest.mark.asyncio
async def test_conservative_parallel_detail_fetching(mock_redis_patch, monkeypatch):
    """
    Tests parallel vs sequential detail fetching based on candidate scores.
    """
    monkeypatch.setattr("app.services.import_orchestrator.IS_TESTING", False)
    monkeypatch.setattr("app.services.import_orchestrator.ProblemImportValidationService.validate_dto", lambda dto: None)
    
    # DB Mock
    mock_session = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_res

    # Mock candidate search to return 2 candidates
    async def mock_search_leetcode():
        return [
            {"stat": {"question__title_slug": "two-sum", "question__title": "Two Sum"}},
            {"stat": {"question__title_slug": "two-sum-ii", "question__title": "Two Sum II"}}
        ]
    async def mock_search_gfg(query):
        return []

    monkeypatch.setattr(ImportOrchestrator, "_search_leetcode", mock_search_leetcode)
    monkeypatch.setattr(ImportOrchestrator, "_search_gfg", mock_search_gfg)

    # 1. Test Parallel Fetch: scores are close (e.g. both 0.95, diff = 0.0)
    parallel_fetched = []
    
    async def mock_fetch_candidate_parallel(cand):
        parallel_fetched.append(cand["slug"])
        await asyncio.sleep(0.01) # simulate minor delay
        return {
            "slug": cand["slug"],
            "title": cand["title"],
            "description": "desc",
            "difficulty": "EASY",
            "tags": [],
            "templates": [],
            "test_cases": []
        }, cand["source"]

    # We manually override compute_candidate_score to return close scores >= 0.80
    monkeypatch.setattr("app.services.import_orchestrator.compute_candidate_score", lambda *args: 0.99)
    monkeypatch.setattr(ImportOrchestrator, "_fetch_and_parse_candidate", mock_fetch_candidate_parallel)

    # Import problem
    p = await ImportOrchestrator.import_problem(mock_session, "two sum")

    # Assert both candidates were fetched concurrently
    assert "two-sum" in parallel_fetched
    assert "two-sum-ii" in parallel_fetched

    # Clear cache and run sequential test
    await mock_redis_patch.aclose()
    mock_redis_patch.store.clear()

    # 2. Test Sequential Fetch: scores are far (e.g. 0.95 and 0.70)
    sequential_fetched = []
    
    async def mock_fetch_candidate_sequential(cand):
        sequential_fetched.append(cand["slug"])
        return {
            "slug": cand["slug"],
            "title": cand["title"],
            "description": "desc",
            "difficulty": "EASY",
            "tags": [],
            "templates": [],
            "test_cases": []
        }, cand["source"]
        
    monkeypatch.setattr(ImportOrchestrator, "_fetch_and_parse_candidate", mock_fetch_candidate_sequential)

    # We override compute_candidate_score: 0.95 for the first, 0.70 for the second
    def mock_score(query, title, slug, conf):
        if "two-sum-ii" in slug:
            return 0.70
        return 0.95

    monkeypatch.setattr("app.services.import_orchestrator.compute_candidate_score", mock_score)

    await ImportOrchestrator.import_problem(mock_session, "some other query")
    
    # Assert only the top candidate was fetched sequentially
    assert "two-sum" in sequential_fetched
    assert "two-sum-ii" not in sequential_fetched


@pytest.mark.asyncio
async def test_circuit_breaker_blocks_outages(mock_redis_patch, monkeypatch):
    """
    Tests that when a provider is in an OPEN state (failing),
    the orchestrator fails fast on it or skips it.
    """
    monkeypatch.setattr("app.services.import_orchestrator.IS_TESTING", False)
    
    # DB Mock
    mock_session = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_res
    
    # Mock search calls
    monkeypatch.setattr(ImportOrchestrator, "_search_leetcode", AsyncMock(return_value=[]))
    monkeypatch.setattr(ImportOrchestrator, "_search_gfg", AsyncMock(return_value=[]))
    
    # 1. Set LeetCode circuit breaker to OPEN manually in Redis
    await mock_redis_patch.set("circuit_breaker:leetcode:state", "OPEN")
    await mock_redis_patch.set("circuit_breaker:leetcode:last_state_change", time.time())
    
    # 2. Set GFG circuit breaker to OPEN manually in Redis
    await mock_redis_patch.set("circuit_breaker:gfg:state", "OPEN")
    await mock_redis_patch.set("circuit_breaker:gfg:last_state_change", time.time())
    
    # 3. Call import_problem -> should raise ImportNotFoundError since both providers are blocked immediately
    with pytest.raises(ImportNotFoundError):
        await ImportOrchestrator.import_problem(mock_session, "some problem")
