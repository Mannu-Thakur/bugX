from typing import Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status, Response

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert, select
from app.models.problem import user_problems
from app.core.database import get_db
from app.core.deps import get_optional_user, require_admin, get_current_active_user
from app.models.user import User
from app.controllers.problem_controller import ProblemController
from app.schemas.problem import (
    ProblemListItem,
    ProblemDetail,
    PaginatedProblems,
    BestSubmissionResponse,
    LastSubmissionResponse,
    ProblemCreate,
    ProblemUpdate,
    TagResponse
)

router = APIRouter()

# ── Public routes ───────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedProblems)
async def list_problems(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    difficulty: Optional[str] = Query(None, pattern="^(EASY|MEDIUM|HARD)$"),
    tag: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: str = Query(
        "newest",
        pattern="^(newest|oldest|title|title_asc|title_desc|difficulty_asc|difficulty_desc|acceptance|acceptance_asc|acceptance_desc)$",
    ),
    company: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    solved: Optional[str] = Query(None),
    bookmarked: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    controller = ProblemController(db)
    return await controller.list_problems(
        current_user=current_user,
        page=page,
        limit=limit,
        difficulty=difficulty,
        tag=tag,
        search=search,
        sort=sort,
        company=company,
        topic=topic,
        source=source,
        solved=solved,
        bookmarked=bookmarked
    )

@router.get("/tags", response_model=List[TagResponse])
async def list_tags(
    db: AsyncSession = Depends(get_db)
) -> Any:
    controller = ProblemController(db)
    return await controller.list_tags()

@router.post("/tags", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    name: str = Query(..., min_length=1, max_length=50),
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
) -> Any:
    controller = ProblemController(db)
    return await controller.create_tag(name)

@router.get("/random", response_model=ProblemDetail)
async def get_random_problem(
    difficulty: Optional[str] = Query(None, pattern="^(EASY|MEDIUM|HARD)$"),
    tag: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    controller = ProblemController(db)
    return await controller.get_random_problem(
        current_user=current_user,
        difficulty=difficulty,
        tag=tag
    )

@router.get("/import/metrics")
async def import_metrics(current_user: User = Depends(require_admin)) -> Any:
    from app.services.import_orchestrator import get_metrics
    return await get_metrics()

@router.get("/{slug}", response_model=ProblemDetail)
async def get_problem(
    slug: str = Path(..., min_length=1, max_length=100),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    controller = ProblemController(db)
    return await controller.get_problem(slug, current_user)


@router.get("/{slug}/submissions/best", response_model=BestSubmissionResponse)
async def get_best_submission(
    slug: str = Path(..., min_length=1, max_length=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    controller = ProblemController(db)
    return await controller.get_best_submission(slug, current_user)


@router.get("/{slug}/submissions/last", response_model=LastSubmissionResponse)
async def get_last_submission(
    slug: str = Path(..., min_length=1, max_length=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    controller = ProblemController(db)
    return await controller.get_last_submission(slug, current_user)


@router.post("/{slug}/bookmark", status_code=status.HTTP_200_OK)
async def bookmark_problem(
    slug: str = Path(..., min_length=1, max_length=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    from app.services.bookmark_service import BookmarkService
    return await BookmarkService.toggle_bookmark(db, current_user.id, slug)


@router.delete("/{slug}/bookmark", status_code=status.HTTP_204_NO_CONTENT)
async def unbookmark_problem(
    slug: str = Path(..., min_length=1, max_length=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    from app.services.bookmark_service import BookmarkService
    await BookmarkService.toggle_bookmark(db, current_user.id, slug)


from pydantic import BaseModel

class ProblemImportRequest(BaseModel):
    url_or_slug: str

async def create_dynamic_fallback_problem(db: AsyncSession, url_or_slug: str) -> Any:
    import re
    import json
    from app.models.problem import Problem, DifficultyEnum
    from app.models.problem_template import ProblemTemplate, ArgStyleEnum
    from app.models.tag import Tag
    from app.models.test_case import TestCase
    from sqlalchemy import select

    # 1. Normalize the slug and title
    slug = url_or_slug.strip().lower()
    # Strip any prefix like "gfg:" or "google:"
    slug = re.sub(r"^(google|leetcode|gfg):", "", slug, flags=re.IGNORECASE)
    # Extract slug from URL if it is a URL
    if "/" in slug:
        parts = [p for p in slug.split("/") if p]
        if "problems" in parts:
            idx = parts.index("problems")
            if idx + 1 < len(parts):
                slug = parts[idx + 1]
        else:
            slug = parts[-1]

    slug = re.sub(r"[^a-z0-9-]", "", re.sub(r"\s+", "-", slug)).strip("-")
    if not slug:
        slug = "dynamic-problem"

    is_two_sum = slug in ("2sum", "two-sum", "twosum", "2-sum")
    if is_two_sum:
        slug = "two-sum"

    # Check if this slug already exists to prevent duplicate key errors
    exist_stmt = select(Problem).where(Problem.slug == slug)
    res = await db.execute(exist_stmt)
    existing = res.scalar_one_or_none()
    if existing:
        is_bad = False
        if is_two_sum and (existing.difficulty.name != "EASY" or "target" not in existing.description):
            is_bad = True
        else:
            for tpl in existing.templates:
                if tpl.function_name and tpl.function_name[0].isdigit():
                    is_bad = True
                    break
        if is_bad:
            print(f"[create_dynamic_fallback_problem] Stale or invalid fallback problem '{slug}' detected. Purging...")
            await db.delete(existing)
            await db.flush()
        else:
            return existing

    # Generate a clean title and function name
    if is_two_sum:
        title = "Two Sum"
        func_name = "twoSum"
    else:
        title_words = [w.capitalize() for w in slug.split("-") if w]
        title = " ".join(title_words) if title_words else "Dynamic Code Challenge"
        if title_words:
            func_name = title_words[0].lower() + "".join(title_words[1:])
            func_name = re.sub(r'[^a-zA-Z0-9_]', '', func_name)
        else:
            func_name = "solve"
        if not func_name:
            func_name = "solve"

        # Ensure function name doesn't start with a digit
        if func_name[0].isdigit():
            if func_name.startswith("2sum") or func_name.startswith("2Sum"):
                func_name = "twoSum" + func_name[4:]
            elif func_name.startswith("3sum") or func_name.startswith("3Sum"):
                func_name = "threeSum" + func_name[4:]
            elif func_name.startswith("4sum") or func_name.startswith("4Sum"):
                func_name = "fourSum" + func_name[4:]
            else:
                func_name = "solve" + func_name

    # Get or create standard tags
    tag_stmt = select(Tag).where(Tag.name == "Arrays")
    arrays_res = await db.execute(tag_stmt)
    arrays_tag = arrays_res.scalar_one_or_none()
    if not arrays_tag:
        arrays_tag = Tag(name="Arrays")
        db.add(arrays_tag)
        await db.flush()

    tag_stmt = select(Tag).where(Tag.name == "Hash Tables")
    ht_res = await db.execute(tag_stmt)
    ht_tag = ht_res.scalar_one_or_none()
    if not ht_tag:
        ht_tag = Tag(name="Hash Tables")
        db.add(ht_tag)
        await db.flush()

    tag_stmt = select(Tag).where(Tag.name == "Dynamic")
    dyn_res = await db.execute(tag_stmt)
    dyn_tag = dyn_res.scalar_one_or_none()
    if not dyn_tag:
        dyn_tag = Tag(name="Dynamic")
        db.add(dyn_tag)
        await db.flush()

    # Formulate templates and test cases
    if is_two_sum:
        python_tpl = """def twoSum(nums: list[int], target: int) -> list[int]:
    # Write your python code here
    # Solve the Two Sum challenge
    seen = {}
    for i, num in enumerate(nums):
        comp = target - num
        if comp in seen:
            return [seen[comp], i]
        seen[num] = i
    return []
"""

        js_tpl = """function twoSum(nums, target) {
    // Write your javascript code here
    const seen = new Map();
    for (let i = 0; i < nums.length; i++) {
        const comp = target - nums[i];
        if (seen.has(comp)) {
            return [seen.get(comp), i];
        }
        seen.set(nums[i], i);
    }
    return [];
}"""

        cpp_tpl = """#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your C++ code here
        unordered_map<int, int> seen;
        for (int i = 0; i < nums.size(); ++i) {
            int comp = target - nums[i];
            if (seen.count(comp))
                return {seen[comp], i};
            seen[nums[i]] = i;
        }
        return {};
    }
};"""

        java_tpl = """import java.util.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your Java code here
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int comp = target - nums[i];
            if (seen.containsKey(comp)) {
                return new int[] { seen.get(comp), i };
            }
            seen.put(nums[i], i);
        }
        return new int[0];
    }
}"""

        templates = [
            ProblemTemplate(language="python", template_code=python_tpl, function_name=func_name, arg_style=ArgStyleEnum.positional),
            ProblemTemplate(language="javascript", template_code=js_tpl, function_name=func_name, arg_style=ArgStyleEnum.positional),
            ProblemTemplate(language="cpp", template_code=cpp_tpl, function_name=func_name, arg_style=ArgStyleEnum.positional),
            ProblemTemplate(language="java", template_code=java_tpl, function_name=func_name, arg_style=ArgStyleEnum.positional),
        ]

        test_cases_data = [
            ("[[2, 7, 11, 15], 9]", "[0, 1]", True, 0),
            ("[[3, 2, 4], 6]", "[1, 2]", True, 1),
            ("[[3, 3], 6]", "[0, 1]", True, 2),
            ("[[2, 5, 5, 11], 10]", "[1, 2]", False, 3),
            ("[[1, 5, 9], 10]", "[0, 2]", False, 4),
            ("[[-1, -2, -3, -4, -5], -8]", "[2, 4]", False, 5)
        ]

        desc = """<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return <em>indices of the two numbers such that they add up to <code>target</code></em>.</p>

<p>You may assume that each input would have <strong><em>exactly</em> one solution</strong>, and you may not use the <em>same</em> element twice.</p>

<p>You can return the answer in any order.</p>

<h3>Example 1:</h3>
<pre><strong>Input:</strong> nums = [2,7,11,15], target = 9
<strong>Output:</strong> [0,1]
<strong>Explanation:</strong> Because nums[0] + nums[1] == 9, we return [0, 1].</pre>

<h3>Example 2:</h3>
<pre><strong>Input:</strong> nums = [3,2,4], target = 6
<strong>Output:</strong> [1,2]</pre>

<h3>Example 3:</h3>
<pre><strong>Input:</strong> nums = [3,3], target = 6
<strong>Output:</strong> [0,1]</pre>

<h3>Constraints:</h3>
<ul>
    <li><code>2 &lt;= nums.length &lt;= 10<sup>4</sup></code></li>
    <li><code>-10<sup>9</sup> &lt;= nums[i] &lt;= 10<sup>9</sup></code></li>
    <li><code>-10<sup>9</sup> &lt;= target &lt;= 10<sup>9</sup></code></li>
    <li><strong>Only one valid answer exists.</strong></li>
</ul>"""

    else:
        python_tpl = f"""def {func_name}(arr: list[int]) -> int:
    # Write your python code here
    # Solve the {title} challenge

    return 0
"""

        js_tpl = f"""function {func_name}(arr) {{
    // Write your javascript code here

    return 0;
}}"""

        cpp_tpl = f"""#include <vector>
#include <numeric>
using namespace std;

class Solution {{
public:
    int {func_name}(vector<int>& arr) {{
        // Write your C++ code here

        return 0;
    }}
}};"""

        java_tpl = f"""import java.util.*;

class Solution {{
    public int {func_name}(int[] arr) {{
        // Write your Java code here

        return 0;
    }}
}}"""

        templates = [
            ProblemTemplate(language="python", template_code=python_tpl, function_name=func_name, arg_style=ArgStyleEnum.single),
            ProblemTemplate(language="javascript", template_code=js_tpl, function_name=func_name, arg_style=ArgStyleEnum.single),
            ProblemTemplate(language="cpp", template_code=cpp_tpl, function_name=func_name, arg_style=ArgStyleEnum.single),
            ProblemTemplate(language="java", template_code=java_tpl, function_name=func_name, arg_style=ArgStyleEnum.single),
        ]

        test_cases_data = [
            ("[1, 2, 3]", "6", True, 0),
            ("[4, 5]", "9", True, 1),
            ("[10]", "10", True, 2),
            ("[1, 1, 1, 1]", "4", False, 3),
            ("[2, 4, 6]", "12", False, 4),
            ("[]", "0", False, 5)
        ]

        desc = f"""<p>Implement the function <code>{func_name}</code> to process the array <code>arr</code> and compute the target result.</p>

<p>Analyze the inputs to optimize both runtime and space complexity. All submissions are automatically evaluated against multiple hidden test cases for score allocation.</p>

<h3>Example 1:</h3>
<pre><strong>Input:</strong> arr = [1, 2, 3]
<strong>Output:</strong> 6
<strong>Explanation:</strong> Processing of the elements yields 6.</pre>

<h3>Example 2:</h3>
<pre><strong>Input:</strong> arr = [4, 5]
<strong>Output:</strong> 9
<strong>Explanation:</strong> Processing of the elements yields 9.</pre>

<h3>Constraints:</h3>
<ul>
    <li><code>0 &lt;= arr.length &lt;= 10<sup>4</sup></code></li>
    <li><code>-100 &lt;= arr[i] &lt;= 100</code></li>
</ul>"""

    test_cases = [
        TestCase(
            input=tc[0],
            expected_output=tc[1],
            is_sample=tc[2],
            order_index=tc[3],
            weight=1
        )
        for tc in test_cases_data
    ]

    problem = Problem(
        slug=slug,
        title=title,
        description=desc,
        difficulty=DifficultyEnum.EASY if is_two_sum else DifficultyEnum.MEDIUM,
        time_limit_ms=2000,
        memory_limit_kb=262144,
        score_base=1 if is_two_sum else 3,
        runtime_bonus_max=20,
        is_published=True,
        tags=[arrays_tag, ht_tag] if is_two_sum else [dyn_tag, arrays_tag],
        templates=templates,
        test_cases=test_cases
    )

    db.add(problem)
    await db.flush()
    return problem

@router.post("/import", response_model=Any, status_code=status.HTTP_201_CREATED)
async def import_problem(
    req: ProblemImportRequest,
    response: Response,
    background: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    from app.services.import_orchestrator import ImportOrchestrator
    from app.services.google_importer import GoogleImporter
    from app.services.import_job_manager import ImportJobManager
    from app.services.importer_exceptions import (
        ImportNetworkError,
        ImportProviderUnavailableError,
        ImportParserError,
        ImportValidationError,
        ImportDatabaseError,
        ImportNotFoundError,
        AmbiguousProblemException
    )
    import re

    url_or_slug = req.url_or_slug

    if background:
        # Async background processing
        job_id = await ImportJobManager.enqueue_import(
            url_or_slug,
            user_id=str(current_user.id) if current_user else None
        )
        response.status_code = status.HTTP_202_ACCEPTED
        return {"job_id": job_id, "status": "pending", "progress": 0}

    # Sync processing (default behavior)
    try:
        if url_or_slug.startswith("google:"):
            # Curated / Google interview questions route
            clean_url = url_or_slug[len("google:"):]
            problem = await GoogleImporter.resolve_and_import(db, clean_url)
        else:
            # Let the orchestrator handle all other queries (and prefix strip if needed)
            problem = await ImportOrchestrator.import_problem(db, url_or_slug)

        # Mark imported problems as non-public
        problem.is_public = False
        db.add(problem)
        await db.flush()

        # Add mapping to user_problems
        if current_user:
            assoc_stmt = select(user_problems).where(
                user_problems.c.user_id == current_user.id,
                user_problems.c.problem_id == problem.id
            )
            assoc_res = await db.execute(assoc_stmt)
            if not assoc_res.first():
                insert_stmt = insert(user_problems).values(
                    user_id=current_user.id,
                    problem_id=problem.id
                )
                await db.execute(insert_stmt)

        await db.commit()

        # Retrieve using controller to guarantee exact response format
        controller = ProblemController(db)
        problem_data = await controller.get_problem(problem.slug, current_user)
        from app.schemas.problem import ProblemDetail
        return ProblemDetail.model_validate(problem_data)
    except ImportNotFoundError as nf_exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_type": "NOT_FOUND", "message": nf_exc.message}
        )
    except AmbiguousProblemException as amb_exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error_type": "AMBIGUOUS_MATCH", "message": amb_exc.message, "candidates": amb_exc.candidates}
        )
    except (ImportProviderUnavailableError, ImportNetworkError) as pu_exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error_type": "PROVIDER_UNAVAILABLE", "message": pu_exc.message}
        )
    except (ImportParserError, ImportValidationError, ImportDatabaseError) as parse_exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error_type": "IMPORT_FAILED", "message": parse_exc.message}
        )
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        import traceback
        print(f"[ImportEndpoint] Failed to import problem: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error_type": "IMPORT_FAILED", "message": str(e)}
        )

@router.get("/import/job/{job_id}")
async def get_import_job(
    job_id: str = Path(..., description="The unique ID of the import job"),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    from app.services.import_job_manager import ImportJobManager
    job = await ImportJobManager.get_job_status(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_type": "NOT_FOUND", "message": f"Import job '{job_id}' not found."}
        )
    return job

@router.get("/import/analytics")
async def get_import_analytics(
    current_user: User = Depends(require_admin)
) -> Any:
    """
    Returns dashboard analytics for the importer pipeline.
    """
    import json
    from redis.asyncio import Redis
    from app.core.config import get_settings
    from app.services.import_orchestrator import get_metrics
    
    settings = get_settings()
    
    # 1. Fetch main metrics
    metrics = await get_metrics()
    
    # 2. Redis-based stats
    latency_histogram = {}
    failure_categories = {}
    top_queries = []
    ranking_log = []
    
    provider_health = {
        "leetcode": {"status": "healthy", "avg_response_time_ms": 0.0, "timeout_frequency": 0.0, "consecutive_failures": 0},
        "gfg": {"status": "healthy", "avg_response_time_ms": 0.0, "timeout_frequency": 0.0, "consecutive_failures": 0}
    }
    
    try:
        redis = Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=0.5, socket_timeout=0.5)
        try:
            # Latency histogram
            hist = await redis.hgetall("metrics:latency_histogram")
            for k, v in hist.items():
                latency_histogram[k] = int(v)
                
            # Failure categories
            failures = await redis.hgetall("metrics:failure_categories")
            for k, v in failures.items():
                failure_categories[k] = int(v)
                
            # Top queries
            top = await redis.zrevrange("metrics:top_queries", 0, 9, withscores=True)
            for query, score in top:
                top_queries.append({"query": query, "count": int(score)})
                
            # Ranking log
            log_entries = await redis.lrange("metrics:ranking_log", 0, 19)
            for entry in log_entries:
                try:
                    ranking_log.append(json.loads(entry))
                except Exception:
                    pass
                    
            # Provider health & circuit breaker states
            for provider in ("leetcode", "gfg"):
                cb_state = await redis.get(f"circuit_breaker:{provider}:state") or "CLOSED"
                cb_failures = int(await redis.get(f"circuit_breaker:{provider}:failures") or 0)
                
                status_str = "healthy"
                if cb_state == "OPEN":
                    status_str = "unhealthy"
                elif cb_state == "HALF-OPEN" or cb_failures > 0:
                    status_str = "degraded"
                    
                total_calls = int(await redis.get(f"health:{provider}:total_calls") or 0)
                total_time = float(await redis.get(f"health:{provider}:total_time_ms") or 0.0)
                timeouts = int(await redis.get(f"health:{provider}:timeouts") or 0)
                
                avg_time = total_time / total_calls if total_calls > 0 else 0.0
                timeout_freq = timeouts / total_calls if total_calls > 0 else 0.0
                
                provider_health[provider] = {
                    "status": status_str,
                    "avg_response_time_ms": avg_time,
                    "timeout_frequency": timeout_freq,
                    "consecutive_failures": cb_failures
                }
        finally:
            await redis.aclose()
    except Exception as e:
        # If Redis is unavailable, provide fallback empty structures
        pass
        
    return {
        "cache_statistics": {
            "hits": metrics.get("cache_hits", 0),
            "misses": metrics.get("cache_misses", 0),
            "hit_rate": metrics.get("cache_hit_rate", 0.0)
        },
        "successful_imports": metrics.get("successful_imports", 0),
        "failed_imports": metrics.get("failed_imports", 0),
        "parser_failures": metrics.get("parser_failures", 0),
        "average_import_time_s": metrics.get("average_import_time_s", 0.0),
        "source_distribution": metrics.get("source_distribution", {}),
        "latency_histogram": latency_histogram,
        "failure_categories": failure_categories,
        "top_queries": top_queries,
        "provider_health": provider_health,
        "ranking_log": ranking_log
    }

@router.get("/import/prometheus")
async def get_import_prometheus(current_user: User = Depends(require_admin)) -> Response:
    """
    Exposes Prometheus-compliant plaintext metrics.
    """
    from redis.asyncio import Redis
    from app.core.config import get_settings
    from app.services.import_orchestrator import get_metrics
    
    settings = get_settings()
    metrics = await get_metrics()
    
    lines = []
    
    # 1. Main counts
    lines.append("# HELP import_successful_imports_total Total successful imports")
    lines.append("# TYPE import_successful_imports_total counter")
    lines.append(f"import_successful_imports_total {metrics.get('successful_imports', 0)}")
    
    lines.append("# HELP import_failed_imports_total Total failed imports")
    lines.append("# TYPE import_failed_imports_total counter")
    lines.append(f"import_failed_imports_total {metrics.get('failed_imports', 0)}")
    
    lines.append("# HELP import_parser_failures_total Total parser failures")
    lines.append("# TYPE import_parser_failures_total counter")
    lines.append(f"import_parser_failures_total {metrics.get('parser_failures', 0)}")
    
    # Hit rate
    lines.append("# HELP import_cache_hit_rate Importer cache hit rate")
    lines.append("# TYPE import_cache_hit_rate gauge")
    lines.append(f"import_cache_hit_rate {metrics.get('cache_hit_rate', 0.0)}")
    
    # Latency
    lines.append("# HELP import_average_latency_seconds Average import latency in seconds")
    lines.append("# TYPE import_average_latency_seconds gauge")
    lines.append(f"import_average_latency_seconds {metrics.get('average_import_time_s', 0.0)}")
    
    # Provider usage
    lines.append("# HELP import_provider_usage_total Total imports by provider")
    lines.append("# TYPE import_provider_usage_total counter")
    for provider, count in metrics.get("source_distribution", {}).items():
        lines.append(f'import_provider_usage_total{{provider="{provider}"}} {count}')
        
    # Provider failures & health from Redis
    try:
        redis = Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=0.5, socket_timeout=0.5)
        try:
            lines.append("# HELP import_provider_failures_total Total failures by provider")
            lines.append("# TYPE import_provider_failures_total counter")
            for provider in ("leetcode", "gfg"):
                fails = int(await redis.get(f"metrics:provider_failures:{provider}") or 0)
                lines.append(f'import_provider_failures_total{{provider="{provider}"}} {fails}')
                
                # Health states
                cb_state = await redis.get(f"circuit_breaker:{provider}:state") or "CLOSED"
                state_val = 1.0 if cb_state == "CLOSED" else (0.5 if cb_state == "HALF-OPEN" else 0.0)
                lines.append(f"# HELP import_provider_health Provider circuit breaker health status (1=healthy, 0.5=degraded, 0=unhealthy)")
                lines.append(f"# TYPE import_provider_health gauge")
                lines.append(f'import_provider_health{{provider="{provider}"}} {state_val}')
        finally:
            await redis.aclose()
    except Exception:
        pass
        
    return Response(
        content="\n".join(lines) + "\n",
        media_type="text/plain"
    )
 
# ── Admin routes ────────────────────────────────────────────────────────────


@router.post("", response_model=ProblemDetail, status_code=status.HTTP_201_CREATED)
async def create_problem(
    req: ProblemCreate,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
) -> Any:
    controller = ProblemController(db)
    return await controller.create_problem(req)

@router.patch("/{slug}", response_model=ProblemDetail)
async def update_problem(
    req: ProblemUpdate,
    slug: str = Path(..., min_length=1, max_length=100),
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
) -> Any:
    controller = ProblemController(db)
    return await controller.update_problem(slug, req)
