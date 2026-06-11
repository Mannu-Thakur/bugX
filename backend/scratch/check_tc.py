import asyncio
from sqlalchemy import text
from app.core.database import get_async_session_factory

async def main():
    sf = get_async_session_factory()
    async with sf() as s:
        rows = await s.execute(text(
            "SELECT p.slug, pt.function_name, pt.arg_style, tc.input, tc.expected_output "
            "FROM test_cases tc "
            "JOIN problems p ON p.id = tc.problem_id "
            "JOIN problem_templates pt ON pt.problem_id = p.id AND pt.language = 'cpp' "
            "WHERE p.slug LIKE '%spiral%' LIMIT 2"
        ))
        for r in rows.all():
            print(r)

asyncio.run(main())
