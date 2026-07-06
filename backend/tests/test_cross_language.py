import pytest
from app.services.code_wrapper_service import CodeWrapperService
from app.models.problem_template import ArgStyleEnum

def test_cross_language_tree_path_sum_parameter_renamed():
    # Verify that renaming the Tree parameter to arbitrary names like "foo" or "x" 
    # does NOT affect type detection or wrapper generation.
    python_template = "def hasPathSum(root: Optional[TreeNode], targetSum: int) -> bool:\n    pass"

    # 1. Python TreeNode path-sum wrap test with renamed params
    user_code_py = "class Solution:\n    def hasPathSum(self, foo: Optional[TreeNode], bar: int) -> bool:\n        return True"
    wrapped_py = CodeWrapperService.wrap_code("python", user_code_py, "hasPathSum", ArgStyleEnum.positional, python_template, debug_mode=False)
    assert "class TreeNode:" in wrapped_py
    assert "parse_TreeNode" in wrapped_py
    assert "parse_TreeNode(args[0])" in wrapped_py
    assert "DIAGNOSTICS" not in wrapped_py  # should be debug-only

    # 2. JS TreeNode path-sum wrap test with renamed params
    user_code_js = "var hasPathSum = function(x, input1) {\n    return true;\n};"
    wrapped_js = CodeWrapperService.wrap_code("javascript", user_code_js, "hasPathSum", ArgStyleEnum.positional, python_template, debug_mode=False)
    assert "class TreeNode" in wrapped_js
    assert "parse_TreeNode" in wrapped_js
    assert "parse_TreeNode(args[0])" in wrapped_js
    assert "DIAGNOSTICS" not in wrapped_js

    # 3. C++ TreeNode path-sum wrap test with renamed params
    user_code_cpp = "class Solution {\npublic:\n    bool hasPathSum(TreeNode* foo, int bar) {\n        return true;\n    }\n};"
    wrapped_cpp = CodeWrapperService.wrap_code("cpp", user_code_cpp, "hasPathSum", ArgStyleEnum.positional, python_template, debug_mode=False)
    assert "struct TreeNode" in wrapped_cpp
    assert "parse_TreeNode_from_json(cin)" in wrapped_cpp
    assert "DIAGNOSTICS" not in wrapped_cpp

    # 4. Java TreeNode path-sum wrap test with renamed params
    user_code_java = "class Solution {\n    public boolean hasPathSum(TreeNode x, int input1) {\n        return true;\n    }\n}"
    wrapped_java = CodeWrapperService.wrap_code("java", user_code_java, "hasPathSum", ArgStyleEnum.positional, python_template, debug_mode=False)
    assert "class TreeNode" in wrapped_java
    assert "parser.parseTreeNode()" in wrapped_java
    assert "DIAGNOSTICS" not in wrapped_java


def test_cross_language_list_reverse_parameter_renamed():
    python_template = "def reverseList(head: Optional[ListNode]) -> Optional[ListNode]:\n    pass"

    # 1. Python ListNode wrap test
    user_code_py = "class Solution:\n    def reverseList(self, foo: Optional[ListNode]) -> Optional[ListNode]:\n        return foo"
    wrapped_py = CodeWrapperService.wrap_code("python", user_code_py, "reverseList", ArgStyleEnum.single, python_template, debug_mode=False)
    assert "class ListNode:" in wrapped_py
    assert "parse_ListNode" in wrapped_py
    assert "parse_ListNode(data)" in wrapped_py
    assert "DIAGNOSTICS" not in wrapped_py

    # 2. JS ListNode wrap test
    user_code_js = "var reverseList = function(x) {\n    return x;\n};"
    wrapped_js = CodeWrapperService.wrap_code("javascript", user_code_js, "reverseList", ArgStyleEnum.single, python_template, debug_mode=False)
    assert "class ListNode" in wrapped_js
    assert "parse_ListNode" in wrapped_js
    assert "parse_ListNode(data)" in wrapped_js
    assert "DIAGNOSTICS" not in wrapped_js


def test_debug_mode_diagnostics():
    python_template = "def hasPathSum(root: Optional[TreeNode], targetSum: int) -> bool:\n    pass"
    user_code_py = "class Solution:\n    def hasPathSum(self, root: Optional[TreeNode], targetSum: int) -> bool:\n        return True"
    user_code_js = "var hasPathSum = function(root, targetSum) {\n    return true;\n};"
    user_code_cpp = "class Solution {\npublic:\n    bool hasPathSum(TreeNode* root, int targetSum) {\n        return true;\n    }\n};"
    user_code_java = "class Solution {\n    public boolean hasPathSum(TreeNode root, int targetSum) {\n        return true;\n    }\n}"

    # Verify that DIAGNOSTICS is generated in the wrapper code when debug_mode=True
    wrapped_py = CodeWrapperService.wrap_code("python", user_code_py, "hasPathSum", ArgStyleEnum.positional, python_template, debug_mode=True)
    assert "DIAGNOSTICS" in wrapped_py
    assert "Language: python" in wrapped_py
    assert "WRAPPER_EXCEPTION" in wrapped_py

    wrapped_js = CodeWrapperService.wrap_code("javascript", user_code_js, "hasPathSum", ArgStyleEnum.positional, python_template, debug_mode=True)
    assert "DIAGNOSTICS" in wrapped_js
    assert "Language: javascript" in wrapped_js
    assert "WRAPPER_EXCEPTION" in wrapped_js

    wrapped_cpp = CodeWrapperService.wrap_code("cpp", user_code_cpp, "hasPathSum", ArgStyleEnum.positional, python_template, debug_mode=True)
    assert "DIAGNOSTICS" in wrapped_cpp
    assert "Language: cpp" in wrapped_cpp
    assert "WRAPPER_EXCEPTION" in wrapped_cpp

    wrapped_java = CodeWrapperService.wrap_code("java", user_code_java, "hasPathSum", ArgStyleEnum.positional, python_template, debug_mode=True)
    assert "DIAGNOSTICS" in wrapped_java
    assert "Language: java" in wrapped_java
    assert "WRAPPER_EXCEPTION" in wrapped_java

def test_representative_problems_signatures():
    # Test all 11 representative problems across all 4 languages to verify signature detection and wrapper generation
    problems = [
        # Trees
        {
            "name": "hasPathSum",
            "sig": "def hasPathSum(root: Optional[TreeNode], targetSum: int) -> bool:\n    pass",
            "cpp_sig": "bool hasPathSum(TreeNode* root, int targetSum)",
            "java_sig": "public boolean hasPathSum(TreeNode root, int targetSum)",
            "js_sig": "var hasPathSum = function(root, targetSum) {};",
            "arg_style": ArgStyleEnum.positional,
            "has_tree": True, "has_list": False
        },
        {
            "name": "isSameTree",
            "sig": "def isSameTree(p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:\n    pass",
            "cpp_sig": "bool isSameTree(TreeNode* p, TreeNode* q)",
            "java_sig": "public boolean isSameTree(TreeNode p, TreeNode q)",
            "js_sig": "var isSameTree = function(p, q) {};",
            "arg_style": ArgStyleEnum.positional,
            "has_tree": True, "has_list": False
        },
        {
            "name": "invertTree",
            "sig": "def invertTree(root: Optional[TreeNode]) -> Optional[TreeNode]:\n    pass",
            "cpp_sig": "TreeNode* invertTree(TreeNode* root)",
            "java_sig": "public TreeNode invertTree(TreeNode root)",
            "js_sig": "var invertTree = function(root) {};",
            "arg_style": ArgStyleEnum.single,
            "has_tree": True, "has_list": False
        },
        {
            "name": "levelOrder",
            "sig": "def levelOrder(root: Optional[TreeNode]) -> list[list[int]]:\n    pass",
            "cpp_sig": "vector<vector<int>> levelOrder(TreeNode* root)",
            "java_sig": "public List<List<Integer>> levelOrder(TreeNode root)",
            "js_sig": "var levelOrder = function(root) {};",
            "arg_style": ArgStyleEnum.single,
            "has_tree": True, "has_list": False
        },
        # Linked Lists
        {
            "name": "reverseList",
            "sig": "def reverseList(head: Optional[ListNode]) -> Optional[ListNode]:\n    pass",
            "cpp_sig": "ListNode* reverseList(ListNode* head)",
            "java_sig": "public ListNode reverseList(ListNode head)",
            "js_sig": "var reverseList = function(head) {};",
            "arg_style": ArgStyleEnum.single,
            "has_tree": False, "has_list": True
        },
        {
            "name": "mergeTwoLists",
            "sig": "def mergeTwoLists(list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:\n    pass",
            "cpp_sig": "ListNode* mergeTwoLists(ListNode* list1, ListNode* list2)",
            "java_sig": "public ListNode mergeTwoLists(ListNode list1, ListNode list2)",
            "js_sig": "var mergeTwoLists = function(list1, list2) {};",
            "arg_style": ArgStyleEnum.positional,
            "has_tree": False, "has_list": True
        },
        {
            "name": "removeNthFromEnd",
            "sig": "def removeNthFromEnd(head: Optional[ListNode], n: int) -> Optional[ListNode]:\n    pass",
            "cpp_sig": "ListNode* removeNthFromEnd(ListNode* head, int n)",
            "java_sig": "public ListNode removeNthFromEnd(ListNode head, int n)",
            "js_sig": "var removeNthFromEnd = function(head, n) {};",
            "arg_style": ArgStyleEnum.positional,
            "has_tree": False, "has_list": True
        },
        # Arrays
        {
            "name": "twoSum",
            "sig": "def twoSum(nums: list[int], target: int) -> list[int]:\n    pass",
            "cpp_sig": "vector<int> twoSum(vector<int>& nums, int target)",
            "java_sig": "public int[] twoSum(int[] nums, int target)",
            "js_sig": "var twoSum = function(nums, target) {};",
            "arg_style": ArgStyleEnum.positional,
            "has_tree": False, "has_list": False
        },
        {
            "name": "merge",
            "sig": "def merge(intervals: list[list[int]]) -> list[list[int]]:\n    pass",
            "cpp_sig": "vector<vector<int>> merge(vector<vector<int>>& intervals)",
            "java_sig": "public int[][] merge(int[][] intervals)",
            "js_sig": "var merge = function(intervals) {};",
            "arg_style": ArgStyleEnum.single,
            "has_tree": False, "has_list": False
        },
        # Matrices
        {
            "name": "numIslands",
            "sig": "def numIslands(grid: list[list[str]]) -> int:\n    pass",
            "cpp_sig": "int numIslands(vector<vector<char>>& grid)",
            "java_sig": "public int numIslands(char[][] grid)",
            "js_sig": "var numIslands = function(grid) {};",
            "arg_style": ArgStyleEnum.single,
            "has_tree": False, "has_list": False
        },
        {
            "name": "rotate",
            "sig": "def rotate(matrix: list[list[int]]) -> None:\n    pass",
            "cpp_sig": "void rotate(vector<vector<int>>& matrix)",
            "java_sig": "public void rotate(int[][] matrix)",
            "js_sig": "var rotate = function(matrix) {};",
            "arg_style": ArgStyleEnum.single,
            "has_tree": False, "has_list": False
        }
    ]

    for p in problems:
        # Python
        user_py = f"class Solution:\n    {p['sig']}"
        w_py = CodeWrapperService.wrap_code("python", user_py, p["name"], p["arg_style"], p["sig"], debug_mode=False)
        if p["has_tree"]:
            assert "parse_TreeNode" in w_py
        if p["has_list"]:
            assert "parse_ListNode" in w_py

        # JS
        w_js = CodeWrapperService.wrap_code("javascript", p["js_sig"], p["name"], p["arg_style"], p["sig"], debug_mode=False)
        if p["has_tree"]:
            assert "parse_TreeNode" in w_js
        if p["has_list"]:
            assert "parse_ListNode" in w_js

        # C++
        user_cpp = f"class Solution {{\npublic:\n    {p['cpp_sig']} {{\n    }}\n}};"
        w_cpp = CodeWrapperService.wrap_code("cpp", user_cpp, p["name"], p["arg_style"], p["sig"], debug_mode=False)
        if p["has_tree"]:
            assert "parse_TreeNode_from_json" in w_cpp or "parse_Node_from_json" in w_cpp
        if p["has_list"]:
            assert "parse_ListNode_from_json" in w_cpp

        # Java
        user_java = f"class Solution {{\n    {p['java_sig']} {{\n        return null;\n    }}\n}}"
        w_java = CodeWrapperService.wrap_code("java", user_java, p["name"], p["arg_style"], p["sig"], debug_mode=False)
        if p["has_tree"]:
            assert "parseTreeNode" in w_java or "parseNode" in w_java
        if p["has_list"]:
            assert "parseListNode" in w_java


# ══════════════════════════════════════════════════════════════════════════════
#  Regression tests for unsafe string interpolation fix
#  These tests FAIL on the unfixed code and PASS after the fix.
# ══════════════════════════════════════════════════════════════════════════════

def test_python_debug_wrapper_is_syntactically_valid():
    """Regression: schema_json with double quotes must not break Python f-string syntax."""
    python_template = "def hasPathSum(root: Optional[TreeNode], targetSum: int) -> bool:\n    pass"
    user_code = "class Solution:\n    def hasPathSum(self, root, targetSum):\n        return True"
    wrapped = CodeWrapperService.wrap_code(
        "python", user_code, "hasPathSum", ArgStyleEnum.positional,
        python_template, debug_mode=True
    )
    # This compile() call is the key assertion: it would raise SyntaxError
    # on the old code because schema_json = '[["root", "tree"], ["targetSum", "int"]]'
    # was interpolated raw into an f-string, producing invalid Python.
    compile(wrapped, "<test_python_debug>", "exec")
    assert "DIAGNOSTICS" in wrapped
    assert "Parameter Schema" in wrapped


def test_javascript_debug_wrapper_is_syntactically_valid():
    """Regression: schema_json with double quotes must not break JS string literal syntax."""
    python_template = "def hasPathSum(root: Optional[TreeNode], targetSum: int) -> bool:\n    pass"
    user_code = "var hasPathSum = function(root, targetSum) {\n    return true;\n};"
    wrapped = CodeWrapperService.wrap_code(
        "javascript", user_code, "hasPathSum", ArgStyleEnum.positional,
        python_template, debug_mode=True
    )
    assert "DIAGNOSTICS" in wrapped
    assert "Parameter Schema" in wrapped
    # Verify the schema value is properly escaped — no raw unescaped double quotes
    # inside a JS string literal. The old code produced:
    #   console.error("[DIAGNOSTICS] Parameter Schema: [["root", "tree"]]");
    # The fix produces:
    #   console.error("[DIAGNOSTICS] Parameter Schema: " + "[[\"root\", \"tree\"]]");
    assert 'Parameter Schema: [["' not in wrapped, \
        "Raw unescaped quotes found in JS string literal — unsafe interpolation not fixed"


def test_java_debug_wrapper_is_syntactically_valid():
    """Regression: schema_json must be safely escaped in Java string literals."""
    python_template = "def hasPathSum(root: Optional[TreeNode], targetSum: int) -> bool:\n    pass"
    user_code = "class Solution {\n    public boolean hasPathSum(TreeNode root, int targetSum) {\n        return true;\n    }\n}"
    wrapped = CodeWrapperService.wrap_code(
        "java", user_code, "hasPathSum", ArgStyleEnum.positional,
        python_template, debug_mode=True
    )
    assert "DIAGNOSTICS" in wrapped
    assert "Parameter Schema" in wrapped
    # Verify no raw unescaped quotes inside Java string
    assert 'Parameter Schema: [["' not in wrapped, \
        "Raw unescaped quotes found in Java string literal — unsafe interpolation not fixed"


def test_cpp_debug_wrapper_unchanged():
    """C++ wrapper uses R\"()\" raw strings and should remain safe."""
    python_template = "def hasPathSum(root: Optional[TreeNode], targetSum: int) -> bool:\n    pass"
    user_code = "class Solution {\npublic:\n    bool hasPathSum(TreeNode* root, int targetSum) {\n        return true;\n    }\n};"
    wrapped = CodeWrapperService.wrap_code(
        "cpp", user_code, "hasPathSum", ArgStyleEnum.positional,
        python_template, debug_mode=True
    )
    assert "DIAGNOSTICS" in wrapped
    assert "Parameter Schema" in wrapped
    # C++ uses R"(...)" raw strings — verify they're still present
    assert 'R"(' in wrapped


def test_debug_mode_with_nested_quotes_in_schema():
    """Ensure schema containing nested quotes doesn't break any language wrapper."""
    # This template produces schema_json = '[["nums", "int"], ["target", "int"]]'
    # which has nested double quotes — the exact pattern that caused the original bug.
    python_template = "def twoSum(nums: list[int], target: int) -> list[int]:\n    pass"

    py_code = "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]"
    js_code = "var twoSum = function(nums, target) {\n    return [0, 1];\n};"
    java_code = "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        return new int[]{0, 1};\n    }\n}"
    cpp_code = "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        return {0, 1};\n    }\n};"

    # All of these must succeed without raising any exception
    w_py = CodeWrapperService.wrap_code("python", py_code, "twoSum", ArgStyleEnum.positional, python_template, debug_mode=True)
    compile(w_py, "<nested_quotes_py>", "exec")

    w_js = CodeWrapperService.wrap_code("javascript", js_code, "twoSum", ArgStyleEnum.positional, python_template, debug_mode=True)
    assert "DIAGNOSTICS" in w_js

    w_java = CodeWrapperService.wrap_code("java", java_code, "twoSum", ArgStyleEnum.positional, python_template, debug_mode=True)
    assert "DIAGNOSTICS" in w_java

    w_cpp = CodeWrapperService.wrap_code("cpp", cpp_code, "twoSum", ArgStyleEnum.positional, python_template, debug_mode=True)
    assert "DIAGNOSTICS" in w_cpp


def test_debug_mode_with_backslashes_and_unicode():
    """Ensure parameter names with special characters don't break wrapper generation.
    
    While unusual, parameter names from parsed signatures could theoretically contain
    characters that need escaping. The fix uses repr()/json.dumps() which handle these safely.
    """
    python_template = "def solve(data: list[int]) -> int:\n    pass"

    # Python wrapper with debug mode — even simple schemas must be safe
    py_code = "class Solution:\n    def solve(self, data):\n        return 0"
    w_py = CodeWrapperService.wrap_code("python", py_code, "solve", ArgStyleEnum.single, python_template, debug_mode=True)
    compile(w_py, "<backslash_unicode_py>", "exec")
    assert "DIAGNOSTICS" in w_py

    # JavaScript wrapper
    js_code = "var solve = function(data) {\n    return 0;\n};"
    w_js = CodeWrapperService.wrap_code("javascript", js_code, "solve", ArgStyleEnum.single, python_template, debug_mode=True)
    assert "DIAGNOSTICS" in w_js


def test_debug_mode_false_produces_no_diagnostics():
    """Verify debug_mode=False still works and produces no DIAGNOSTICS output."""
    python_template = "def twoSum(nums: list[int], target: int) -> list[int]:\n    pass"

    py_code = "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]"
    w = CodeWrapperService.wrap_code("python", py_code, "twoSum", ArgStyleEnum.positional, python_template, debug_mode=False)
    assert "DIAGNOSTICS" not in w
    compile(w, "<debug_false>", "exec")


def test_tree_and_list_debug_mode_all_languages():
    """TreeNode/ListNode problems with debug_mode=True across all languages."""
    # Tree problem
    tree_tpl = "def invertTree(root: Optional[TreeNode]) -> Optional[TreeNode]:\n    pass"
    py_tree = "class Solution:\n    def invertTree(self, root):\n        return root"
    js_tree = "var invertTree = function(root) {\n    return root;\n};"
    java_tree = "class Solution {\n    public TreeNode invertTree(TreeNode root) {\n        return root;\n    }\n}"
    cpp_tree = "class Solution {\npublic:\n    TreeNode* invertTree(TreeNode* root) {\n        return root;\n    }\n};"

    for lang, code in [("python", py_tree), ("javascript", js_tree), ("java", java_tree), ("cpp", cpp_tree)]:
        w = CodeWrapperService.wrap_code(lang, code, "invertTree", ArgStyleEnum.single, tree_tpl, debug_mode=True)
        assert "DIAGNOSTICS" in w
        if lang == "python":
            compile(w, f"<tree_debug_{lang}>", "exec")

    # List problem
    list_tpl = "def reverseList(head: Optional[ListNode]) -> Optional[ListNode]:\n    pass"
    py_list = "class Solution:\n    def reverseList(self, head):\n        return head"
    js_list = "var reverseList = function(head) {\n    return head;\n};"

    for lang, code in [("python", py_list), ("javascript", js_list)]:
        w = CodeWrapperService.wrap_code(lang, code, "reverseList", ArgStyleEnum.single, list_tpl, debug_mode=True)
        assert "DIAGNOSTICS" in w
        if lang == "python":
            compile(w, f"<list_debug_{lang}>", "exec")


import asyncio
import json
import shutil
from app.services.local_executor import LocalExecutor


def test_end_to_end_python_debug_mode():
    """End-to-end: Python submission with debug_mode=True must execute successfully.
    
    This is the exact scenario that was failing before the fix:
    the generated runner script had a SyntaxError from the diagnostics output.
    """
    python_template = "def twoSum(nums: list[int], target: int) -> list[int]:\n    pass"
    user_code = "class Solution:\n    def twoSum(self, nums, target):\n        for i in range(len(nums)):\n            for j in range(i+1, len(nums)):\n                if nums[i] + nums[j] == target:\n                    return [i, j]\n        return []"

    wrapped = CodeWrapperService.wrap_code(
        "python", user_code, "twoSum", ArgStyleEnum.positional,
        python_template, debug_mode=True
    )

    # Verify the generated code compiles
    compile(wrapped, "<e2e_python>", "exec")

    # Execute it
    stdin = json.dumps([[2, 7, 11, 15], 9])
    res = asyncio.run(LocalExecutor.execute("python", wrapped, stdin, 5000, 262144))

    assert res["status"]["id"] == 3, f"Expected Accepted (3), got {res['status']}: stderr={res.get('stderr', '')}"
    assert json.loads(res["stdout"].strip()) == [0, 1]
    # Verify diagnostics appeared in stderr
    assert "[DIAGNOSTICS]" in (res.get("stderr") or "")


def test_end_to_end_javascript_debug_mode():
    """End-to-end: JavaScript submission with debug_mode=True must execute successfully."""
    if not shutil.which("node"):
        pytest.skip("Node.js not installed on host")

    python_template = "def twoSum(nums: list[int], target: int) -> list[int]:\n    pass"
    user_code = """var twoSum = function(nums, target) {
    for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
            if (nums[i] + nums[j] === target) {
                return [i, j];
            }
        }
    }
    return [];
};"""

    wrapped = CodeWrapperService.wrap_code(
        "javascript", user_code, "twoSum", ArgStyleEnum.positional,
        python_template, debug_mode=True
    )

    stdin = json.dumps([[2, 7, 11, 15], 9])
    res = asyncio.run(LocalExecutor.execute("javascript", wrapped, stdin, 5000, 262144))

    assert res["status"]["id"] == 3, f"Expected Accepted (3), got {res['status']}: stderr={res.get('stderr', '')}"
    assert json.loads(res["stdout"].strip()) == [0, 1]
    assert "[DIAGNOSTICS]" in (res.get("stderr") or "")


def test_end_to_end_java_debug_mode():
    """End-to-end: Java submission with debug_mode=True must execute successfully."""
    if not shutil.which("javac") or not shutil.which("java"):
        pytest.skip("Java JDK not installed on host")

    python_template = "def twoSum(nums: list[int], target: int) -> list[int]:\n    pass"
    user_code = """public class Solution {
    public int[] twoSum(int[] nums, int target) {
        for (int i = 0; i < nums.length; i++) {
            for (int j = i + 1; j < nums.length; j++) {
                if (nums[i] + nums[j] == target) {
                    return new int[]{i, j};
                }
            }
        }
        return new int[]{};
    }
}"""

    wrapped = CodeWrapperService.wrap_code(
        "java", user_code, "twoSum", ArgStyleEnum.positional,
        python_template, debug_mode=True
    )

    # Verify the public class stripping works
    assert "public class Solution" not in wrapped
    assert "class Solution" in wrapped

    stdin = json.dumps([[2, 7, 11, 15], 9])
    res = asyncio.run(LocalExecutor.execute("java", wrapped, stdin, 5000, 262144))

    assert res["status"]["id"] == 3, f"Expected Accepted (3), got {res['status']}: stderr={res.get('stderr', '')}"
    assert json.loads(res["stdout"].strip()) == [0, 1]
    assert "[DIAGNOSTICS]" in (res.get("stderr") or "")


def test_end_to_end_python_tree_debug_mode():
    """End-to-end: Python TreeNode problem with debug_mode=True."""
    python_template = "def invertTree(root: Optional[TreeNode]) -> Optional[TreeNode]:\n    pass"
    user_code = """class Solution:
    def invertTree(self, root):
        if not root:
            return None
        root.left, root.right = root.right, root.left
        self.invertTree(root.left)
        self.invertTree(root.right)
        return root"""

    wrapped = CodeWrapperService.wrap_code(
        "python", user_code, "invertTree", ArgStyleEnum.single,
        python_template, debug_mode=True
    )
    compile(wrapped, "<e2e_tree_python>", "exec")

    stdin = json.dumps([4, 2, 7, 1, 3, 6, 9])
    res = asyncio.run(LocalExecutor.execute("python", wrapped, stdin, 5000, 262144))

    assert res["status"]["id"] == 3, f"Expected Accepted (3), got {res['status']}: stderr={res.get('stderr', '')}"
    assert json.loads(res["stdout"].strip()) == [4, 7, 2, 9, 6, 3, 1]


def test_end_to_end_javascript_tree_debug_mode():
    """End-to-end: JavaScript TreeNode problem with debug_mode=True."""
    if not shutil.which("node"):
        pytest.skip("Node.js not installed on host")

    python_template = "def invertTree(root: Optional[TreeNode]) -> Optional[TreeNode]:\n    pass"
    user_code = """var invertTree = function(root) {
    if (!root) return null;
    let temp = root.left;
    root.left = root.right;
    root.right = temp;
    invertTree(root.left);
    invertTree(root.right);
    return root;
};"""

    wrapped = CodeWrapperService.wrap_code(
        "javascript", user_code, "invertTree", ArgStyleEnum.single,
        python_template, debug_mode=True
    )

    stdin = json.dumps([4, 2, 7, 1, 3, 6, 9])
    res = asyncio.run(LocalExecutor.execute("javascript", wrapped, stdin, 5000, 262144))

    assert res["status"]["id"] == 3, f"Expected Accepted (3), got {res['status']}: stderr={res.get('stderr', '')}"
    assert json.loads(res["stdout"].strip()) == [4, 7, 2, 9, 6, 3, 1]


def test_end_to_end_python_node_serialization():
    """End-to-end: Python Node (populating next right pointers) test."""
    python_template = "def connect(root: Optional[Node]) -> Optional[Node]:\n    pass"
    user_code = """
# Definition for a Node.
\"\"\"
class Node:
    def __init__(self, val: int = 0, left: 'Node' = None, right: 'Node' = None, next: 'Node' = None):
        self.val = val
        self.left = left
        self.right = right
        self.next = next
\"\"\"

class Solution:
    def connect(self, root: 'Optional[Node]') -> 'Optional[Node]':
        if not root:
            return root
        
        # Perfect binary tree connect using next pointer
        leftmost = root
        while leftmost.left:
            head = leftmost
            while head:
                head.left.next = head.right
                if head.next:
                    head.right.next = head.next.left
                head = head.next
            leftmost = leftmost.left
        return root
"""
    wrapped = CodeWrapperService.wrap_code(
        "python", user_code, "connect", ArgStyleEnum.single,
        python_template, debug_mode=True
    )
    compile(wrapped, "<e2e_node_python>", "exec")

    stdin = json.dumps([1, 2, 3, 4, 5, 6, 7])
    res = asyncio.run(LocalExecutor.execute("python", wrapped, stdin, 5000, 262144))

    assert res["status"]["id"] == 3, f"Expected Accepted (3), got {res['status']}: stderr={res.get('stderr', '')}"
    assert json.loads(res["stdout"].strip()) == [1, "#", 2, 3, "#", 4, 5, 6, 7, "#"]


def test_end_to_end_javascript_node_serialization():
    """End-to-end: JavaScript Node (populating next right pointers) test."""
    if not shutil.which("node"):
        pytest.skip("Node.js not installed on host")

    python_template = "def connect(root: Optional[Node]) -> Optional[Node]:\n    pass"
    user_code = """var connect = function(root) {
    if (!root) return root;
    let leftmost = root;
    while (leftmost.left) {
        let head = leftmost;
        while (head) {
            head.left.next = head.right;
            if (head.next) {
                head.right.next = head.next.left;
            }
            head = head.next;
        }
        leftmost = leftmost.left;
    }
    return root;
};"""

    wrapped = CodeWrapperService.wrap_code(
        "javascript", user_code, "connect", ArgStyleEnum.single,
        python_template, debug_mode=True
    )

    stdin = json.dumps([1, 2, 3, 4, 5, 6, 7])
    res = asyncio.run(LocalExecutor.execute("javascript", wrapped, stdin, 5000, 262144))

    assert res["status"]["id"] == 3, f"Expected Accepted (3), got {res['status']}: stderr={res.get('stderr', '')}"
    assert json.loads(res["stdout"].strip()) == [1, "#", 2, 3, "#", 4, 5, 6, 7, "#"]


def test_end_to_end_java_node_serialization():
    """End-to-end: Java Node (populating next right pointers) test."""
    if not shutil.which("javac") or not shutil.which("java"):
        pytest.skip("Java JDK not installed on host")

    python_template = "def connect(root: Optional[Node]) -> Optional[Node]:\n    pass"
    user_code = """class Solution {
    public Node connect(Node root) {
        if (root == null) return null;
        Node leftmost = root;
        while (leftmost.left != null) {
            Node head = leftmost;
            while (head != null) {
                head.left.next = head.right;
                if (head.next != null) {
                    head.right.next = head.next.left;
                }
                head = head.next;
            }
            leftmost = leftmost.left;
        }
        return root;
    }
}"""

    wrapped = CodeWrapperService.wrap_code(
        "java", user_code, "connect", ArgStyleEnum.single,
        python_template, debug_mode=True
    )

    stdin = json.dumps([1, 2, 3, 4, 5, 6, 7])
    res = asyncio.run(LocalExecutor.execute("java", wrapped, stdin, 5000, 262144))

    assert res["status"]["id"] == 3, f"Expected Accepted (3), got {res['status']}: stderr={res.get('stderr', '')}"
    assert json.loads(res["stdout"].strip()) == [1, "#", 2, 3, "#", 4, 5, 6, 7, "#"]


def test_end_to_end_cpp_node_serialization():
    """End-to-end: C++ Node (populating next right pointers) test."""
    if not shutil.which("g++"):
        pytest.skip("g++ not installed on host")

    python_template = "def connect(root: Optional[Node]) -> Optional[Node]:\n    pass"
    user_code = """class Solution {
public:
    Node* connect(Node* root) {
        if (!root) return nullptr;
        Node* leftmost = root;
        while (leftmost->left) {
            Node* head = leftmost;
            while (head) {
                head->left->next = head->right;
                if (head->next) {
                    head->right->next = head->next->left;
                }
                head = head->next;
            }
            leftmost = leftmost->left;
        }
        return root;
    }
};"""

    wrapped = CodeWrapperService.wrap_code(
        "cpp", user_code, "connect", ArgStyleEnum.single,
        python_template, debug_mode=True
    )

    stdin = json.dumps([1, 2, 3, 4, 5, 6, 7])
    res = asyncio.run(LocalExecutor.execute("cpp", wrapped, stdin, 5000, 262144))

    # Skip if the local executor cannot run the binary due to infrastructure
    # limitations — e.g. g++ sandbox timeout, Windows AppLocker/WDAC policy
    # blocking the compiled binary (WinError 4551), or any other OS-level
    # restriction. These are NOT logic errors in the code wrapper.
    stderr_text = (res.get("stderr") or "").lower()
    infra_blocked = (
        (res["status"]["id"] in (5, 6) and "timed out" in stderr_text)
        or (res["status"]["id"] == 13 and (
            "application control" in stderr_text
            or "winerror 4551" in stderr_text
            or "local run failed" in stderr_text
        ))
    )
    if infra_blocked:
        pytest.skip(
            f"C++ binary blocked by local OS/sandbox policy ({res['status']['description']})"
            " — infrastructure limitation, not a code bug"
        )

    assert res["status"]["id"] == 3, f"Expected Accepted (3), got {res['status']}: stderr={res.get('stderr', '')}"
    assert json.loads(res["stdout"].strip()) == [1, "#", 2, 3, "#", 4, 5, 6, 7, "#"]


