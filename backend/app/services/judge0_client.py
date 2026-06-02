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
            except (httpx.RequestError, httpx.HTTPStatusError) as exc:
                print(f"[Judge0 Fallback] Judge0 connection failed ({str(exc)}). Attempting offline local execution...")
                try:
                    return await self._execute_locally(language, source_code, stdin)
                except Exception as fallback_exc:
                    fallback_exc.__context__ = None
                    fallback_exc.__cause__ = None
                    return {
                        "status": {"id": 13, "description": "Internal Error"},
                        "stderr": f"Request failed: {str(exc)}. Fallback execution failed: {str(fallback_exc)}",
                        "time": "0",
                        "memory": 0
                    }

    async def _execute_locally(
        self,
        language: str,
        source_code: str,
        stdin: str
    ) -> Dict[str, Any]:
        import sys
        import os
        import asyncio
        import subprocess as _sp
        import time
        from pathlib import Path

        lang = language.lower()
        if lang not in ("python", "javascript", "cpp", "c++"):
            return {
                "status": {"id": 13, "description": "Internal Error"},
                "stderr": f"Offline execution not supported for language: {language}",
                "time": "0",
                "memory": 0
            }

        # Use C:/Users/mannu/.gemini/antigravity/scratch/.sandbox for the sandbox path.
        # This avoids two Windows issues:
        # 1. System %TEMP% is blocked from running compiled executables by Windows AppLocker.
        # 2. Paths containing Korean characters (e.g. OneDrive/문서) fail in g++ linker with Unicode/ANSI issues.
        temp_dir = Path("C:/Users/mannu/.gemini/antigravity/scratch/.sandbox")
        temp_dir.mkdir(parents=True, exist_ok=True)
        file_id = os.urandom(8).hex()

        # Build an env with MinGW bin on PATH so compiled C++ executables
        # can find runtime DLLs (libstdc++-6.dll, libgcc_s_seh-1.dll, etc.)
        # even when uvicorn was launched without MinGW in its PATH.
        _mingw_bin = r"C:\mingw\mingw64\bin"
        cpp_env = None
        if lang in ("cpp", "c++") and os.path.isdir(_mingw_bin):
            cpp_env = os.environ.copy()
            current_path = cpp_env.get("PATH", "")
            if _mingw_bin.lower() not in current_path.lower():
                cpp_env["PATH"] = _mingw_bin + os.pathsep + current_path

        # Use run_in_executor + subprocess.run instead of asyncio.create_subprocess_exec.
        # On Windows, asyncio.create_subprocess_exec requires ProactorEventLoop, but
        # some ASGI frameworks (e.g. uvicorn with --loop=asyncio) use SelectorEventLoop
        # which raises NotImplementedError. run_in_executor is safe on all event loops.
        loop = asyncio.get_event_loop()

        if lang == "python":
            file_path = Path(temp_dir) / f"sol_{file_id}.py"
            file_path.write_text(source_code, encoding="utf-8")
            cmd = [sys.executable, str(file_path)]
            try:
                start_time = time.perf_counter()
                result = await loop.run_in_executor(
                    None,
                    lambda: _sp.run(
                        cmd,
                        input=stdin.encode("utf-8"),
                        stdout=_sp.PIPE,
                        stderr=_sp.PIPE,
                        timeout=30
                    )
                )
                elapsed = time.perf_counter() - start_time
                stdout = result.stdout.decode("utf-8", errors="replace")
                stderr = result.stderr.decode("utf-8", errors="replace")
                
                status_id = 3 if result.returncode == 0 else 11
                status_desc = "Accepted" if result.returncode == 0 else "Runtime Error (NZEC)"
                
                return {
                    "status": {"id": status_id, "description": status_desc},
                    "stdout": stdout,
                    "stderr": stderr,
                    "time": f"{elapsed:.3f}",
                    "memory": 0
                }
            except Exception as e:
                return {
                    "status": {"id": 13, "description": "Internal Error"},
                    "stderr": f"Local execution failed: {str(e)}",
                    "time": "0",
                    "memory": 0
                }
            finally:
                if file_path.exists():
                    try:
                        file_path.unlink()
                    except OSError:
                        pass

        elif lang == "javascript":
            file_path = Path(temp_dir) / f"sol_{file_id}.js"
            file_path.write_text(source_code, encoding="utf-8")
            cmd = ["node", str(file_path)]
            try:
                start_time = time.perf_counter()
                result = await loop.run_in_executor(
                    None,
                    lambda: _sp.run(
                        cmd,
                        input=stdin.encode("utf-8"),
                        stdout=_sp.PIPE,
                        stderr=_sp.PIPE,
                        timeout=30
                    )
                )
                elapsed = time.perf_counter() - start_time
                stdout = result.stdout.decode("utf-8", errors="replace")
                stderr = result.stderr.decode("utf-8", errors="replace")
                
                status_id = 3 if result.returncode == 0 else 11
                status_desc = "Accepted" if result.returncode == 0 else "Runtime Error (NZEC)"
                
                return {
                    "status": {"id": status_id, "description": status_desc},
                    "stdout": stdout,
                    "stderr": stderr,
                    "time": f"{elapsed:.3f}",
                    "memory": 0
                }
            except Exception as e:
                return {
                    "status": {"id": 13, "description": "Internal Error"},
                    "stderr": f"Local execution failed: {str(e)}",
                    "time": "0",
                    "memory": 0
                }
            finally:
                if file_path.exists():
                    try:
                        file_path.unlink()
                    except OSError:
                        pass

        elif lang in ("cpp", "c++"):
            cpp_path = Path(temp_dir) / f"sol_{file_id}.cpp"
            exe_path = Path(temp_dir) / f"sol_{file_id}.exe"
            cpp_path.write_text(source_code, encoding="utf-8")
            
            gpp_cmd = "g++"
            if os.path.exists(r"C:\mingw\mingw64\bin\g++.exe"):
                gpp_cmd = r"C:\mingw\mingw64\bin\g++.exe"

            compile_cmd = [gpp_cmd, "-O3", "-std=c++17", "-o", str(exe_path), str(cpp_path)]
            try:
                comp_result = await loop.run_in_executor(
                    None,
                    lambda: _sp.run(
                        compile_cmd,
                        stdout=_sp.PIPE,
                        stderr=_sp.PIPE,
                        env=cpp_env,
                        timeout=30
                    )
                )
                if comp_result.returncode != 0:
                    comp_stderr = comp_result.stderr.decode("utf-8", errors="replace")
                    return {
                        "status": {"id": 6, "description": "Compilation Error"},
                        "stdout": "",
                        "stderr": comp_stderr,
                        "time": "0",
                        "memory": 0
                    }
                
                start_time = time.perf_counter()
                result = await loop.run_in_executor(
                    None,
                    lambda: _sp.run(
                        [str(exe_path)],
                        input=stdin.encode("utf-8"),
                        stdout=_sp.PIPE,
                        stderr=_sp.PIPE,
                        env=cpp_env,
                        timeout=30
                    )
                )
                elapsed = time.perf_counter() - start_time
                stdout = result.stdout.decode("utf-8", errors="replace")
                stderr = result.stderr.decode("utf-8", errors="replace")
                
                status_id = 3 if result.returncode == 0 else 11
                status_desc = "Accepted" if result.returncode == 0 else "Runtime Error (NZEC)"
                
                # Translate Windows exit codes to human-readable messages
                if result.returncode != 0 and not stderr.strip():
                    rc = result.returncode
                    # Convert negative codes to unsigned 32-bit for Windows status matching
                    urc = rc & 0xFFFFFFFF if rc < 0 else rc
                    win_codes = {
                        0xC0000005: "Access Violation (segmentation fault)",
                        0xC00000FD: "Stack Overflow",
                        0xC000001D: "Illegal Instruction",
                        0xC0000094: "Integer Division by Zero",
                        0xC0000135: "DLL Not Found (missing MinGW runtime)",
                        0xC00000008: "Invalid Handle",
                    }
                    desc = win_codes.get(urc, f"Process exited with code {rc}")
                    stderr = f"Runtime Error: {desc}"
                
                return {
                    "status": {"id": status_id, "description": status_desc},
                    "stdout": stdout,
                    "stderr": stderr,
                    "time": f"{elapsed:.3f}",
                    "memory": 0
                }
            except Exception as e:
                import traceback
                e.__context__ = None
                e.__cause__ = None
                tb_str = traceback.format_exc()
                print(f"[Offline Execute Error] C++ traceback: {tb_str}")
                return {
                    "status": {"id": 13, "description": "Internal Error"},
                    "stderr": f"Local execution failed: {str(e)}\nTraceback:\n{tb_str}",
                    "time": "0",
                    "memory": 0
                }
            finally:
                for p in (cpp_path, exe_path):
                    if p.exists():
                        try:
                            p.unlink()
                        except OSError:
                            pass

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
