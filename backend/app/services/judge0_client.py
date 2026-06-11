import httpx
from typing import Dict, Any, Optional

class Judge0Client:
    LANGUAGE_MAP = {
        "python": 71,
        "javascript": 63,
        "cpp": 54,
        "c++": 54,
        "java": 62
    }

    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self._compilation_locks = {}

    async def execute(
        self,
        language: str,
        source_code: str,
        stdin: str,
        time_limit_ms: int,
        memory_limit_kb: int,
        client: Optional[httpx.AsyncClient] = None
    ) -> Dict[str, Any]:
        language_id = self.LANGUAGE_MAP.get(language)
        if not language_id:
            raise ValueError(f"Unsupported language: {language}")

        from app.core.config import get_settings
        settings = get_settings()

        if settings.USE_LOCAL_JUDGE:
            from app.services.local_executor import LocalExecutor
            return await LocalExecutor.execute(
                language=language,
                source_code=source_code,
                stdin=stdin,
                time_limit_ms=time_limit_ms,
                memory_limit_kb=memory_limit_kb
            )

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

        async def _try_api(client_to_use):
            response = await client_to_use.post(url, json=payload, timeout=timeout)
            response.raise_for_status()
            return response.json()

        if client is not None:
            return await _try_api(client)
        else:
            async with httpx.AsyncClient() as client_local:
                return await _try_api(client_local)

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
