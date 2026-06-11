import asyncio
import httpx

async def main():
    url = "https://leetcode.com/api/problems/algorithms/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
    print("Testing LeetCode REST API...")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, timeout=10.0)
            print(f"Status: {resp.status_code}")
            if resp.status_code == 200:
                print("Success! Response size:", len(resp.text))
            else:
                print("Failed! Content:", resp.text[:200])
    except Exception as e:
        print("Error:", e)

    print("\nTesting LeetCode GraphQL API...")
    gql_url = "https://leetcode.com/graphql"
    query = """
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        title
        titleSlug
        content
      }
    }
    """
    payload = {
        "query": query,
        "variables": {"titleSlug": "two-sum"}
    }
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(gql_url, json=payload, headers=headers, timeout=10.0)
            print(f"Status: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                question = data.get("data", {}).get("question")
                if question:
                    print("Success! Question Title:", question.get("title"))
                    print("Question Description length:", len(question.get("content", "")))
                else:
                    print("No question found! Full response:", data)
            else:
                print("Failed! Content:", resp.text[:200])
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
