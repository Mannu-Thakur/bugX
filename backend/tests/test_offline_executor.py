import pytest
from app.services.judge0_client import Judge0Client

@pytest.mark.asyncio
async def test_execute_python_locally():
    client = Judge0Client("http://localhost:2358")
    
    # Test valid Python program execution
    res = await client._execute_locally(
        language="python",
        source_code="import sys; data = sys.stdin.read(); print(f'Hello {data}')",
        stdin="World"
    )
    assert res["status"]["id"] == 3
    assert "Hello World" in res["stdout"]
    assert float(res["time"]) >= 0

    # Test Python runtime error
    res_err = await client._execute_locally(
        language="python",
        source_code="raise ValueError('boom')",
        stdin=""
    )
    assert res_err["status"]["id"] == 11
    assert "ValueError: boom" in res_err["stderr"]

@pytest.mark.asyncio
async def test_execute_javascript_locally():
    client = Judge0Client("http://localhost:2358")
    
    # Test valid JavaScript program execution
    res = await client._execute_locally(
        language="javascript",
        source_code="const fs = require('fs'); const data = fs.readFileSync(0, 'utf-8'); console.log('Hello ' + data);",
        stdin="Vite"
    )
    assert res["status"]["id"] == 3
    assert "Hello Vite" in res["stdout"]
    assert float(res["time"]) >= 0

@pytest.mark.asyncio
async def test_execute_cpp_locally():
    client = Judge0Client("http://localhost:2358")
    
    # Test valid C++ program execution
    source_code = """#include <iostream>
using namespace std;
int main() {
    int val;
    if (cin >> val) {
        cout << (val * 2) << endl;
    }
    return 0;
}
"""
    res = await client._execute_locally(
        language="cpp",
        source_code=source_code,
        stdin="21"
    )
    assert res["status"]["id"] == 3
    assert "42" in res["stdout"]
    assert float(res["time"]) >= 0
