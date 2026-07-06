import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.problem import Problem, DifficultyEnum
from app.models.company import Company
from app.models.topic import Topic
from app.services.seeder_service import seed_problems

@pytest.mark.asyncio
async def test_seeding_and_live_counts(client: AsyncClient, db: AsyncSession):
    from sqlalchemy import select, func, delete
    from app.models.problem import Problem
    from app.models.company import Company
    from app.models.topic import Topic
    
    # Force clean database state for test isolation
    await db.execute(delete(Problem))
    await db.execute(delete(Company))
    await db.execute(delete(Topic))
    await db.flush()
    
    # Check count before seeder
    cnt_before = (await db.execute(select(func.count(Problem.id)))).scalar() or 0
    print(f"\nDIAGNOSTIC: Problems in DB before seeder: {cnt_before}")

    # Run seeder in test database
    await seed_problems(db)

    # Check count after seeder
    cnt_after = (await db.execute(select(func.count(Problem.id)))).scalar() or 0
    comp_cnt = (await db.execute(select(func.count(Company.id)))).scalar() or 0
    print(f"DIAGNOSTIC: Problems in DB after seeder: {cnt_after}, Companies: {comp_cnt}")

    # Let's inspect problem-company links
    from app.models.problem import problem_companies
    link_cnt = (await db.execute(select(func.count()).select_from(problem_companies))).scalar() or 0
    print(f"DIAGNOSTIC: Problem-Company links count in DB: {link_cnt}")

    # 1. Test GET /companies
    response = await client.get("/api/v1/companies")
    assert response.status_code == 200
    companies = response.json()
    print(f"DIAGNOSTIC: API returned companies: {companies}")
    assert len(companies) >= 6
    google = next(c for c in companies if c["slug"] == "google")
    assert google["name"] == "Google"
    assert google["totalProblems"] > 0

    # 2. Test GET /companies/{slug}
    response = await client.get("/api/v1/companies/google")
    assert response.status_code == 200
    comp_detail = response.json()
    assert comp_detail["company"]["name"] == "Google"
    assert comp_detail["problems"]["total"] > 0
    assert len(comp_detail["problems"]["items"]) > 0

    # 3. Test GET /topics
    response = await client.get("/api/v1/topics")
    assert response.status_code == 200
    topics = response.json()
    assert len(topics) >= 18
    arrays = next(t for t in topics if t["slug"] == "arrays")
    assert arrays["name"] == "Arrays"
    assert arrays["totalProblems"] > 0

    # 4. Test GET /topics/{slug}
    response = await client.get("/api/v1/topics/arrays")
    assert response.status_code == 200
    topic_detail = response.json()
    assert topic_detail["topic"]["name"] == "Arrays"
    assert topic_detail["problems"]["total"] > 0

    # 5. Test GET /stats/overview
    response = await client.get("/api/v1/stats/overview")
    assert response.status_code == 200
    overview = response.json()
    assert overview["totalProblems"] > 0
    assert overview["totalCompanies"] >= 6
    assert overview["totalTopics"] >= 18
