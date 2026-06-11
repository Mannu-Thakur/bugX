import pytest
from app.services.code_wrapper_service import CodeWrapperService
from app.models.problem_template import ArgStyleEnum

def test_generate_cpp_template():
    python_template = "def twoSum(nums: list[int], target: int) -> list[int]:\n    pass"
    tpl = CodeWrapperService.generate_cpp_template("twoSum", python_template)

    assert "class Solution" in tpl
    assert "vector<int> twoSum(vector<int>& nums, int target)" in tpl

def test_generate_java_template():
    python_template = "def twoSum(nums: list[int], target: int) -> list[int]:\n    pass"
    tpl = CodeWrapperService.generate_java_template("twoSum", python_template)

    assert "class Solution" in tpl
    assert "int[] twoSum(int[] nums, int target)" in tpl

def test_wrap_python():
    user_code = "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]"
    wrapped = CodeWrapperService.wrap_code("python", user_code, "twoSum", ArgStyleEnum.single)

    assert "sys.stdin.read()" in wrapped
    assert "json.dumps" in wrapped
    assert "Solution().twoSum(data)" in wrapped

def test_wrap_python_standalone():
    user_code = "def twoSum(nums, target):\n    return [0, 1]"
    wrapped = CodeWrapperService.wrap_code("python", user_code, "twoSum", ArgStyleEnum.single)

    assert "sys.stdin.read()" in wrapped
    assert "json.dumps" in wrapped
    assert "twoSum(data)" in wrapped
    assert "Solution()" not in wrapped

def test_wrap_javascript():
    user_code = "class Solution {\n    twoSum(nums, target) {\n        return [0, 1];\n    }\n}"
    wrapped = CodeWrapperService.wrap_code("javascript", user_code, "twoSum", ArgStyleEnum.single)

    assert "fs.readFileSync" in wrapped
    assert "JSON.stringify" in wrapped
    assert "new Solution().twoSum(data)" in wrapped

def test_wrap_javascript_standalone():
    user_code = "function twoSum(nums, target) {\n    return [0, 1];\n}"
    wrapped = CodeWrapperService.wrap_code("javascript", user_code, "twoSum", ArgStyleEnum.single)

    assert "fs.readFileSync" in wrapped
    assert "JSON.stringify" in wrapped
    assert "twoSum(data)" in wrapped
    assert "new Solution()" not in wrapped

def test_wrap_cpp():
    user_code = """
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        return {0, 1};
    }
};
"""
    python_template = "def twoSum(nums: list[int], target: int) -> list[int]:\n    pass"
    wrapped = CodeWrapperService.wrap_code("cpp", user_code, "twoSum", ArgStyleEnum.single, python_template)

    assert "int main(" in wrapped
    assert "Solution sol;" in wrapped
    assert "sol.twoSum(" in wrapped
    assert "parse_val(cin, nums)" in wrapped

def test_wrap_java():
    user_code = """
class Solution {
    public int[] twoSum(int[] nums, int target) {
        return new int[]{0, 1};
    }
}
"""
    python_template = "def twoSum(nums: list[int], target: int) -> list[int]:\n    pass"
    wrapped = CodeWrapperService.wrap_code("java", user_code, "twoSum", ArgStyleEnum.single, python_template)

    assert "public static void main(" in wrapped
    assert "Solution sol = new Solution();" in wrapped
    assert "sol.twoSum(" in wrapped
    assert "parser.parseIntArray()" in wrapped

def test_wrap_cpp_with_init_recovery():
    user_code = """
class Solution {
public:
    vector<int> rightSideView(TreeNode* root) {
        return {1, 3, 4};
    }
};
"""
    python_template = """
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def rightSideView(self, root: Optional[TreeNode]) -> List[int]:
        pass
"""
    wrapped = CodeWrapperService.wrap_code("cpp", user_code, "__init__", ArgStyleEnum.single, python_template)

    assert "sol.rightSideView(" in wrapped
    assert "sol.__init__(" not in wrapped
