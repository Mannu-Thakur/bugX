import asyncio
import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.submission import Submission
from app.models.problem_template import ProblemTemplate
from app.services.code_wrapper_service import CodeWrapperService

async def main():
    async with AsyncSessionLocal() as session:
        sub_id = "158068f2-1d07-4fab-b9db-7e07879a6e6f"
        stmt = select(Submission).where(Submission.id == sub_id)
        res = await session.execute(stmt)
        sub = res.scalar_one_or_none()
        if not sub:
            print("Submission not found.")
            return

        tpl_stmt = select(ProblemTemplate).where(
            ProblemTemplate.problem_id == sub.problem_id,
            ProblemTemplate.language == sub.language
        )
        tpl_res = await session.execute(tpl_stmt)
        template = tpl_res.scalar_one_or_none()
        if not template:
            print("Template not found.")
            return

        py_tpl_stmt = select(ProblemTemplate).where(
            ProblemTemplate.problem_id == sub.problem_id,
            ProblemTemplate.language == "python"
        )
        py_tpl_res = await session.execute(py_tpl_stmt)
        py_template_obj = py_tpl_res.scalar_one_or_none()
        python_template = py_template_obj.template_code if py_template_obj else None

        wrapped = CodeWrapperService.wrap_code(
            sub.language,
            sub.source_code,
            template.function_name,
            template.arg_style,
            python_template
        )
        print("Wrapped code:")
        print(wrapped)

if __name__ == "__main__":
    asyncio.run(main())
