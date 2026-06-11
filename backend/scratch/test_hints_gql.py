import asyncio
import httpx

async def main():
    q = """
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        title
        hints
      }
    }
    """
    payload = {
        "query": q,
        "variables": {"titleSlug": "two-sum"}
    }
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post("https://leetcode.com/graphql", json=payload, headers=headers, timeout=10.0)
        print("Status:", resp.status_code)
        print("JSON:", resp.json())

if __name__ == "__main__":
    asyncio.run(main())
