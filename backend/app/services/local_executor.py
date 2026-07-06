import os
import sys
import time
import uuid
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional

# Prefer a project-local sandbox dir to avoid Windows WDAC/Defender App Control
# blocking compiled executables from system %TEMP% directories (WinError 4551).
_SANDBOX_BASE = Path(__file__).resolve().parents[2] / ".sandbox"
_SANDBOX_BASE.mkdir(exist_ok=True)

class LocalExecutor:
    @staticmethod
    async def execute(
        language: str,
        source_code: str,
        stdin: str,
        time_limit_ms: int,
        memory_limit_kb: int
    ) -> Dict[str, Any]:
        """
        Executes code locally using subprocess.
        Mimics the Judge0 API response format.
        """
        lang = language.lower().strip()
        timeout_sec = time_limit_ms / 1000.0

        # Use a project-local sandbox directory to avoid Windows App Control (WDAC)
        # blocking compiled binaries from system %TEMP% dirs (WinError 4551).
        # Fall back to system temp if the sandbox path contains non-ASCII characters
        # (e.g. project lives under a path with Korean/Unicode chars like '문서').
        _sandbox_path = str(_SANDBOX_BASE)
        _use_sandbox = all(ord(c) < 128 for c in _sandbox_path)
        if _use_sandbox:
            temp_dir = str(_SANDBOX_BASE / str(uuid.uuid4()))
            os.makedirs(temp_dir, exist_ok=True)
            _cleanup = lambda: shutil.rmtree(temp_dir, ignore_errors=True)
        else:
            _tmp_ctx = tempfile.TemporaryDirectory()
            temp_dir = _tmp_ctx.name
            _cleanup = _tmp_ctx.cleanup

        try:
            if "python" in lang:
                with open(os.path.join(temp_dir, "script.py"), "w", encoding="utf-8") as f:
                    f.write(source_code)
                cmd = ["python", "script.py"]
                return LocalExecutor._run_process(cmd, stdin, timeout_sec, cwd=temp_dir, language="python")

            elif "javascript" in lang or "js" in lang:
                with open(os.path.join(temp_dir, "script.js"), "w", encoding="utf-8") as f:
                    f.write(source_code)
                cmd = ["node", "script.js"]
                return LocalExecutor._run_process(cmd, stdin, timeout_sec, cwd=temp_dir, language="javascript")

            elif "c++" in lang or "cpp" in lang:
                with open(os.path.join(temp_dir, "solution.cpp"), "w", encoding="utf-8") as f:
                    f.write(source_code)

                # Compile step using relative paths - use -O0 and generous 30s timeout to prevent host compilation timeouts
                compile_cmd = ["g++", "-O0", "solution.cpp", "-o", "solution.exe"]
                try:
                    compile_proc = subprocess.run(
                        compile_cmd,
                        capture_output=True,
                        text=True,
                        encoding="utf-8",
                        timeout=30.0, # generous compilation timeout
                        cwd=temp_dir
                    )
                    if compile_proc.returncode != 0:
                        return {
                            "status": {"id": 6, "description": "Compilation Error"},
                            "compile_output": compile_proc.stderr,
                            "stdout": None,
                            "stderr": compile_proc.stderr,
                            "time": "0",
                            "memory": 0
                        }
                except subprocess.TimeoutExpired:
                    return {
                        "status": {"id": 6, "description": "Compilation Error"},
                        "compile_output": "Compilation timed out.",
                        "stdout": None,
                        "stderr": "Compilation timed out.",
                        "time": "0",
                        "memory": 0
                    }
                except Exception as e:
                    return {
                        "status": {"id": 6, "description": "Compilation Error"},
                        "compile_output": f"Compiler launch failed: {str(e)}",
                        "stdout": None,
                        "stderr": f"Compiler launch failed: {str(e)}",
                        "time": "0",
                        "memory": 0
                    }

                # Run step: use absolute path of compiled binary to work around Windows CreateProcess relative path / cwd search quirk
                exe_path = os.path.join(temp_dir, "solution.exe")
                return LocalExecutor._run_process([exe_path], stdin, timeout_sec, cwd=temp_dir, language="cpp")

            elif "java" in lang:
                # Java requires class name to match file name.
                with open(os.path.join(temp_dir, "Main.java"), "w", encoding="utf-8") as f:
                    f.write(source_code)

                # Compile step using relative paths
                compile_cmd = ["javac", "-J-Xmx128m", "Main.java"]
                try:
                    compile_proc = subprocess.run(
                        compile_cmd,
                        capture_output=True,
                        text=True,
                        encoding="utf-8",
                        timeout=30.0,
                        cwd=temp_dir
                    )
                    if compile_proc.returncode != 0:
                        return {
                            "status": {"id": 6, "description": "Compilation Error"},
                            "compile_output": compile_proc.stderr,
                            "stdout": None,
                            "stderr": compile_proc.stderr,
                            "time": "0",
                            "memory": 0
                        }
                except FileNotFoundError:
                    return {
                        "status": {"id": 6, "description": "Compilation Error"},
                        "compile_output": "Java compiler (javac) is not installed or not found in PATH. Please install a JDK (e.g., OpenJDK 17+) and ensure 'javac' is available.",
                        "stdout": None,
                        "stderr": "Java compiler (javac) is not installed or not found in PATH. Please install a JDK (e.g., OpenJDK 17+) and ensure 'javac' is available.",
                        "time": "0",
                        "memory": 0
                    }
                except Exception as e:
                    return {
                        "status": {"id": 6, "description": "Compilation Error"},
                        "compile_output": f"Java compiler launch failed: {str(e)}",
                        "stdout": None,
                        "stderr": f"Java compiler launch failed: {str(e)}",
                        "time": "0",
                        "memory": 0
                    }

                # Run step using relative paths
                cmd = ["java", "-Xmx128m", "Main"]
                return LocalExecutor._run_process(cmd, stdin, timeout_sec, cwd=temp_dir, language="java")

            else:
                return {
                    "status": {"id": 13, "description": "Internal Error"},
                    "stdout": None,
                    "stderr": f"Unsupported language locally: {language}",
                    "time": "0",
                    "memory": 0
                }
        finally:
            _cleanup()

    @staticmethod
    def _run_process(cmd: list[str], stdin: str, timeout: float, cwd: Optional[str] = None, language: str = "") -> Dict[str, Any]:
        start_time = time.perf_counter()
        try:
            # Run the process
            proc = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                cwd=cwd
            )

            stdout, stderr = proc.communicate(input=stdin, timeout=timeout)
            end_time = time.perf_counter()
            duration = end_time - start_time

            if proc.returncode == 0:
                return {
                    "status": {"id": 3, "description": "Accepted"},
                    "stdout": stdout,
                    "stderr": stderr,
                    "time": f"{duration:.3f}",
                    "memory": 0 # Local memory measurement omitted for simplicity
                }
            else:
                # Check for syntax/compile errors in interpreted languages
                status_id = 11  # Default: Runtime Error
                status_desc = "Runtime Error"
                if language in ("python",):
                    for marker in ("SyntaxError:", "IndentationError:", "TabError:"):
                        if marker in (stderr or ""):
                            status_id = 6
                            status_desc = "Compilation Error"
                            break
                elif language in ("javascript", "js"):
                    if "SyntaxError:" in (stderr or ""):
                        status_id = 6
                        status_desc = "Compilation Error"

                return {
                    "status": {"id": status_id, "description": status_desc},
                    "stdout": stdout,
                    "stderr": stderr,
                    "time": f"{duration:.3f}",
                    "memory": 0
                }

        except subprocess.TimeoutExpired:
            # Clean up the timed out process
            if 'proc' in locals():
                proc.kill()
                try:
                    proc.wait(timeout=1.0)
                except:
                    pass
            return {
                "status": {"id": 5, "description": "Time Limit Exceeded"},
                "stdout": "",
                "stderr": "Time Limit Exceeded",
                "time": f"{timeout:.3f}",
                "memory": 0
            }
        except Exception as e:
            return {
                "status": {"id": 13, "description": "Internal Error"},
                "stdout": None,
                "stderr": f"Local run failed: {str(e)}",
                "time": "0",
                "memory": 0
            }
