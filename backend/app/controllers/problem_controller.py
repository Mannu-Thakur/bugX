from uuid import UUID
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.problem import Problem, DifficultyEnum
from app.models.problem_template import ProblemTemplate, ArgStyleEnum
from app.models.test_case import TestCase
from app.models.tag import Tag
from app.models.user import User
from app.repositories.problem_repo import ProblemRepo
from app.schemas.problem import ProblemCreate, ProblemUpdate, ProblemListItem, ProblemDetail, UserStatusEmbed, BestSubmissionResponse, LastSubmissionResponse

class ProblemController:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_problems(
        self,
        current_user: Optional[User],
        page: int,
        limit: int,
        difficulty: Optional[str],
        tag: Optional[str],
        search: Optional[str],
        sort: str
    ) -> dict:
        items, total = await ProblemRepo.list_problems(
            self.db,
            page=page,
            limit=limit,
            difficulty=difficulty,
            tag=tag,
            search=search,
            sort=sort
        )
        pages = (total + limit - 1) // limit if total > 0 else 0

        # Populate user_status dynamically if user is logged in
        for problem in items:
            problem.user_status = None
            if current_user:
                res = await ProblemRepo.get_user_status(self.db, current_user.id, problem.id)
                problem.user_status = UserStatusEmbed(solved=res["solved"], best_score=res["best_score"])

        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages
        }

    async def get_problem(self, slug: str, current_user: Optional[User]) -> dict:
        problem = await ProblemRepo.get_by_slug(self.db, slug)
        if not problem:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")

        # Admin can view unpublished problems
        if not problem.is_published:
            if not current_user or current_user.role.value != "ADMIN":
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")

        # Get user status if logged in
        user_status = None
        if current_user:
            res = await ProblemRepo.get_user_status(self.db, current_user.id, problem.id)
            user_status = UserStatusEmbed(solved=res["solved"], best_score=res["best_score"])

        # Filter sample test cases for public view
        sample_test_cases = [tc for tc in problem.test_cases if tc.is_sample]

        # Convert to schema fields properly
        return {
            "id": problem.id,
            "slug": problem.slug,
            "title": problem.title,
            "description": problem.description,
            "difficulty": problem.difficulty.value,
            "time_limit_ms": problem.time_limit_ms,
            "memory_limit_kb": problem.memory_limit_kb,
            "score_base": problem.score_base,
            "runtime_bonus_max": problem.runtime_bonus_max,
            "expected_complexity": problem.expected_complexity,
            "acceptance_rate": problem.acceptance_rate,
            "tags": problem.tags,
            "templates": problem.templates,
            "sample_test_cases": sample_test_cases,
            "user_status": user_status
        }

    async def get_random_problem(
        self,
        current_user: Optional[User],
        difficulty: Optional[str],
        tag: Optional[str],
    ) -> dict:
        problem = await ProblemRepo.get_random_problem(
            self.db,
            difficulty=difficulty,
            tag=tag
        )
        if not problem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No problems found matching criteria"
            )

        # Get user status if logged in
        user_status = None
        if current_user:
            res = await ProblemRepo.get_user_status(self.db, current_user.id, problem.id)
            user_status = UserStatusEmbed(solved=res["solved"], best_score=res["best_score"])

        # Filter sample test cases for public view
        sample_test_cases = [tc for tc in problem.test_cases if tc.is_sample]

        return {
            "id": problem.id,
            "slug": problem.slug,
            "title": problem.title,
            "description": problem.description,
            "difficulty": problem.difficulty.value,
            "time_limit_ms": problem.time_limit_ms,
            "memory_limit_kb": problem.memory_limit_kb,
            "score_base": problem.score_base,
            "runtime_bonus_max": problem.runtime_bonus_max,
            "expected_complexity": problem.expected_complexity,
            "acceptance_rate": problem.acceptance_rate,
            "tags": problem.tags,
            "templates": problem.templates,
            "sample_test_cases": sample_test_cases,
            "user_status": user_status
        }


    async def get_best_submission(self, slug: str, current_user: User) -> dict:
        problem = await ProblemRepo.get_by_slug(self.db, slug)
        if not problem:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")

        sub = await ProblemRepo.get_best_qualifying_submission(self.db, current_user.id, problem.id)
        if not sub:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Best submission not found")

        return sub

    async def get_last_submission(self, slug: str, current_user: User) -> dict:
        problem = await ProblemRepo.get_by_slug(self.db, slug)
        if not problem:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")

        sub = await ProblemRepo.get_last_submission(self.db, current_user.id, problem.id)
        if not sub:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No submissions found")

        return sub

    # ── Admin CRUD methods ───────────────────────────────────────────────────

    async def create_problem(self, req: ProblemCreate) -> dict:
        # Validate slug unique
        if await ProblemRepo.slug_exists(self.db, req.slug):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="SLUG_TAKEN")

        # Fetch tags by ID
        tags = await ProblemRepo.get_tags_by_ids(self.db, req.tag_ids)
        if len(tags) != len(req.tag_ids):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="INVALID_TAG_ID")

        # Create templates
        templates = []
        provided_languages = set()
        python_tpl_data = None
        fn_name = None
        arg_style_val = None

        for t in req.templates:
            provided_languages.add(t.language)
            templates.append(ProblemTemplate(
                language=t.language,
                template_code=t.template_code,
                function_name=t.function_name,
                arg_style=ArgStyleEnum(t.arg_style)
            ))
            if t.language == "python":
                python_tpl_data = t.template_code
                fn_name = t.function_name
                arg_style_val = t.arg_style

        # Auto-generate C++ and Java templates if not provided
        if python_tpl_data and fn_name:
            from app.services.code_wrapper_service import CodeWrapperService
            if "cpp" not in provided_languages:
                cpp_code = CodeWrapperService.generate_cpp_template(fn_name, python_tpl_data)
                templates.append(ProblemTemplate(
                    language="cpp",
                    template_code=cpp_code,
                    function_name=fn_name,
                    arg_style=ArgStyleEnum(arg_style_val)
                ))
            if "java" not in provided_languages:
                java_code = CodeWrapperService.generate_java_template(fn_name, python_tpl_data)
                templates.append(ProblemTemplate(
                    language="java",
                    template_code=java_code,
                    function_name=fn_name,
                    arg_style=ArgStyleEnum(arg_style_val)
                ))

        # Create test cases
        test_cases = []
        for tc in req.test_cases:
            test_cases.append(TestCase(
                input=tc.input,
                expected_output=tc.expected_output,
                is_sample=tc.is_sample,
                order_index=tc.order_index,
                weight=tc.weight
            ))

        # Create Problem object
        problem = Problem(
            slug=req.slug,
            title=req.title,
            description=req.description,
            difficulty=DifficultyEnum(req.difficulty),
            time_limit_ms=req.time_limit_ms,
            memory_limit_kb=req.memory_limit_kb,
            score_base=req.score_base,
            runtime_bonus_max=req.runtime_bonus_max,
            expected_complexity=req.expected_complexity,
            is_published=False,  # unpublished by default
            tags=tags,
            templates=templates,
            test_cases=test_cases
        )

        created = await ProblemRepo.create(self.db, problem)
        await self.db.commit()

        # Build response detail
        sample_test_cases = [tc for tc in created.test_cases if tc.is_sample]
        return {
            "id": created.id,
            "slug": created.slug,
            "title": created.title,
            "description": created.description,
            "difficulty": created.difficulty.value,
            "time_limit_ms": created.time_limit_ms,
            "memory_limit_kb": created.memory_limit_kb,
            "score_base": created.score_base,
            "runtime_bonus_max": created.runtime_bonus_max,
            "expected_complexity": created.expected_complexity,
            "acceptance_rate": created.acceptance_rate,
            "tags": created.tags,
            "templates": created.templates,
            "sample_test_cases": sample_test_cases,
            "user_status": None
        }

    async def update_problem(self, slug: str, req: ProblemUpdate) -> dict:
        problem = await ProblemRepo.get_by_slug(self.db, slug)
        if not problem:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")

        # Update simple fields if provided
        if req.title is not None:
            problem.title = req.title
        if req.description is not None:
            problem.description = req.description
        if req.difficulty is not None:
            problem.difficulty = DifficultyEnum(req.difficulty)
        if req.time_limit_ms is not None:
            problem.time_limit_ms = req.time_limit_ms
        if req.memory_limit_kb is not None:
            problem.memory_limit_kb = req.memory_limit_kb
        if req.score_base is not None:
            problem.score_base = req.score_base
        if req.runtime_bonus_max is not None:
            problem.runtime_bonus_max = req.runtime_bonus_max
        if req.expected_complexity is not None:
            problem.expected_complexity = req.expected_complexity
        if req.is_published is not None:
            problem.is_published = req.is_published

        # Update tags if provided
        if req.tag_ids is not None:
            tags = await ProblemRepo.get_tags_by_ids(self.db, req.tag_ids)
            if len(tags) != len(req.tag_ids):
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="INVALID_TAG_ID")
            problem.tags = tags

        await self.db.commit()

        # Build response detail
        sample_test_cases = [tc for tc in problem.test_cases if tc.is_sample]
        return {
            "id": problem.id,
            "slug": problem.slug,
            "title": problem.title,
            "description": problem.description,
            "difficulty": problem.difficulty.value,
            "time_limit_ms": problem.time_limit_ms,
            "memory_limit_kb": problem.memory_limit_kb,
            "score_base": problem.score_base,
            "runtime_bonus_max": problem.runtime_bonus_max,
            "expected_complexity": problem.expected_complexity,
            "acceptance_rate": problem.acceptance_rate,
            "tags": problem.tags,
            "templates": problem.templates,
            "sample_test_cases": sample_test_cases,
            "user_status": None
        }

    async def list_tags(self) -> List[Tag]:
        return await ProblemRepo.list_all_tags(self.db)

    async def create_tag(self, name: str) -> Tag:
        # Check if already exists
        existing = await ProblemRepo.get_tag_by_name(self.db, name)
        if existing:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="TAG_EXISTS")

        tag = await ProblemRepo.create_tag(self.db, name)
        await self.db.commit()
        return tag
