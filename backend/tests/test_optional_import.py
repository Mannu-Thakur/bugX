import asyncio
from app.services.code_wrapper_service import CodeWrapperService
from app.services.local_executor import LocalExecutor
from app.models.problem_template import ArgStyleEnum
import json

def test_optional_import_in_python():
    source_code = """
class Solution:
    def hasPathSum(self, root: Optional[TreeNode], targetSum: int) -> bool:
        if not root:
            return False
        if root.left is None and root.right is None:
            return targetSum == root.val
        return self.hasPathSum(root.left, targetSum - root.val) or self.hasPathSum(root.right, targetSum - root.val)
"""
    python_template = "def hasPathSum(root: Optional[TreeNode], targetSum: int) -> bool:\n    pass"
    wrapped = CodeWrapperService.wrap_code(
        "python", source_code, "hasPathSum", ArgStyleEnum.positional, python_template
    )
    
    # Assert typing imports are present in the wrapped code
    assert "from typing import" in wrapped
    assert "Optional" in wrapped

    # Let's execute it locally using LocalExecutor
    stdin = json.dumps([[5,4,8,11,None,13,4,7,2,None,None,None,1], 22])
    res = asyncio.run(LocalExecutor.execute("python", wrapped, stdin, 5000, 262144))
    
    print("Execution output:", res)
    assert res["status"]["id"] == 3  # Should succeed
    assert res["stdout"].strip() == "true"
