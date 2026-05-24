import httpx
from typing import Dict, Any, Optional

class Judge0Client:
    LANGUAGE_MAP = {
        "python": 71,
        "javascript": 63
    }

    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    async def execute(
        self, 
        language: str, 
        source_code: str, 
        stdin: str, 
        time_limit_ms: int, 
        memory_limit_kb: int
    ) -> Dict[str, Any]:
        language_id = self.LANGUAGE_MAP.get(language)
        if not language_id:
            raise ValueError(f"Unsupported language: {language}")

        payload = {
            "language_id": language_id,
            "source_code": source_code,
            "stdin": stdin,
            "cpu_time_limit": time_limit_ms / 1000.0,
            "memory_limit": memory_limit_kb,
        }

        # Use wait=true for synchronous execution
        url = f"{self.base_url}/submissions?base64_encoded=false&wait=true"

        # timeout = time limit + buffer
        timeout = (time_limit_ms / 1000.0) + 10.0

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, timeout=timeout)
                response.raise_for_status()
                return response.json()
            except httpx.RequestError as exc:
                # E.g. connection refused
                return {
                    "status": {"id": 13, "description": "Internal Error"}, # using generic internal error
                    "stderr": f"Request failed: {str(exc)}",
                    "time": "0",
                    "memory": 0
                }
            except httpx.HTTPStatusError as exc:
                return {
                    "status": {"id": 13, "description": "Internal Error"},
                    "stderr": f"HTTP error {exc.response.status_code}",
                    "time": "0",
                    "memory": 0
                }

    async def get_workers(self) -> list:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{self.base_url}/workers", timeout=5.0)
            resp.raise_for_status()
            return resp.json()

    async def get_about(self) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{self.base_url}/about", timeout=5.0)
            resp.raise_for_status()
            return resp.json()
