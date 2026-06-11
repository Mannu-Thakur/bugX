import os
import sys
import time
import subprocess
import tempfile
from typing import Dict, Any, Optional

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

        # Use the system default temporary directory to prevent compilation/linkage errors
        # (e.g. "cannot open output file: No error" with g++/ld) when the project
        # path contains non-ASCII characters (e.g., "문서").
        with tempfile.TemporaryDirectory() as temp_dir:
            if "python" in lang:
                file_path = os.path.join(temp_dir, "script.py")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(source_code)
                cmd = [sys.executable, file_path]
                return LocalExecutor._run_process(cmd, stdin, timeout_sec)

            elif "javascript" in lang or "js" in lang:
                file_path = os.path.join(temp_dir, "script.js")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(source_code)
                cmd = ["node", file_path]
                return LocalExecutor._run_process(cmd, stdin, timeout_sec)

            elif "c++" in lang or "cpp" in lang:
                source_path = os.path.join(temp_dir, "solution.cpp")
                exe_path = os.path.join(temp_dir, "solution.exe")
                with open(source_path, "w", encoding="utf-8") as f:
                    f.write(source_code)

                # Compile step
                compile_cmd = ["g++", "-O3", source_path, "-o", exe_path]
                try:
                    compile_proc = subprocess.run(
                        compile_cmd,
                        capture_output=True,
                        text=True,
                        timeout=10.0 # generous compilation timeout
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

                # Run step
                return LocalExecutor._run_process([exe_path], stdin, timeout_sec)

            elif "java" in lang:
                # Java requires class name to match file name.
                # Let's assume Main.java is used or find the public class in code.
                file_path = os.path.join(temp_dir, "Main.java")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(source_code)

                # Compile step
                compile_cmd = ["javac", file_path]
                try:
                    compile_proc = subprocess.run(
                        compile_cmd,
                        capture_output=True,
                        text=True,
                        timeout=10.0
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
                except Exception as e:
                    return {
                        "status": {"id": 6, "description": "Compilation Error"},
                        "compile_output": f"Java compiler launch failed: {str(e)}",
                        "stdout": None,
                        "stderr": f"Java compiler launch failed: {str(e)}",
                        "time": "0",
                        "memory": 0
                    }

                # Run step
                cmd = ["java", "-cp", temp_dir, "Main"]
                return LocalExecutor._run_process(cmd, stdin, timeout_sec)

            else:
                return {
                    "status": {"id": 13, "description": "Internal Error"},
                    "stdout": None,
                    "stderr": f"Unsupported language locally: {language}",
                    "time": "0",
                    "memory": 0
                }

    @staticmethod
    def _run_process(cmd: list[str], stdin: str, timeout: float) -> Dict[str, Any]:
        start_time = time.perf_counter()
        try:
            # Run the process
            proc = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
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
                return {
                    "status": {"id": 11, "description": "Runtime Error"},
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
