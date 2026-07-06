"""
Regression tests for 4+1 critical bugs that caused declined submissions in Java, Python, JS, and C++.

Bug 1 (Java):   need_outer_brackets was False for 1-param positional → outer '[' never consumed
Bug 2 (Java):   TreeNode / ListNode / Node return types printed object hashcode instead of JSON
Bug 3 (Java):   void return printed nothing; Python prints "null" → WRONG_ANSWER mismatch
Bug 4 (JS):     void return printed "undefined"; Python prints "null" → WRONG_ANSWER mismatch
Bug 5 (C++):    void return printed nothing; Python prints "null" → WRONG_ANSWER mismatch
"""

import json
import asyncio
import shutil
import pytest
from app.services.code_wrapper_service import CodeWrapperService
from app.models.problem_template import ArgStyleEnum


# ─────────────────────────────────────────────────────────────────
#  Bug 1 — Java 1-param positional: outer '[' must always be consumed
# ─────────────────────────────────────────────────────────────────

def test_java_positional_single_param_outer_bracket_consumed():
    """
    Regression — Bug 1:
    For positional arg_style with exactly ONE parameter the input is still
    wrapped in an outer JSON array, e.g. [[2,7,11,15]] for an int[] param.
    Previously need_outer_brackets was False for len(params)==1, so the outer
    '[' was never consumed and parseInt() saw '[' → NumberFormatException.
    """
    source_code = """
class Solution {
    public int[] twoSum(int[] nums) {
        return new int[]{0, 1};
    }
}
"""
    python_template = "def twoSum(nums: list[int]) -> list[int]:\n    pass"
    wrapped = CodeWrapperService.wrap_code(
        "java", source_code, "twoSum", ArgStyleEnum.positional, python_template
    )
    # The outer-bracket consumer must appear regardless of param count
    assert "parser.get(); // consume '['" in wrapped, (
        "Java 1-param positional wrapper must consume the outer '['"
    )
    assert "parser.get(); // consume ']'" in wrapped, (
        "Java 1-param positional wrapper must consume the outer ']'"
    )


def test_java_positional_two_params_outer_bracket_still_consumed():
    """
    Sanity check — existing 2-param case still has bracket consumers.
    """
    source_code = """
class Solution {
    public int[] twoSum(int[] nums, int target) {
        return new int[]{0, 1};
    }
}
"""
    python_template = "def twoSum(nums: list[int], target: int) -> list[int]:\n    pass"
    wrapped = CodeWrapperService.wrap_code(
        "java", source_code, "twoSum", ArgStyleEnum.positional, python_template
    )
    assert "parser.get(); // consume '['" in wrapped
    assert "parser.get(); // consume ']'" in wrapped
    assert "parser.get(); // consume ','" in wrapped


# ─────────────────────────────────────────────────────────────────
#  Bug 2 — Java TreeNode / ListNode / Node return serialization
# ─────────────────────────────────────────────────────────────────

def test_java_treenode_return_uses_serialize_method():
    """
    Regression — Bug 2 (TreeNode):
    Previously the wrapper emitted printVal(res) for a TreeNode return, which
    falls through to printVal(Object) → System.out.print(val) → object hashcode.
    Now it must call serializeTreeNode(res).
    """
    source_code = """
class Solution {
    public TreeNode invertTree(TreeNode root) {
        return root;
    }
}
"""
    python_template = "def invertTree(root: Optional[TreeNode]) -> Optional[TreeNode]:\n    pass"
    wrapped = CodeWrapperService.wrap_code(
        "java", source_code, "invertTree", ArgStyleEnum.single, python_template
    )
    assert "serializeTreeNode(res)" in wrapped, (
        "Java TreeNode return must use serializeTreeNode(), not printVal()"
    )
    # serializeTreeNode helper must be present in the file
    assert "static String serializeTreeNode(TreeNode root)" in wrapped


def test_java_listnode_return_uses_serialize_method():
    """
    Regression — Bug 2 (ListNode):
    ListNode return must call serializeListNode(res), not printVal(res).
    """
    source_code = """
class Solution {
    public ListNode reverseList(ListNode head) {
        return head;
    }
}
"""
    python_template = "def reverseList(head: Optional[ListNode]) -> Optional[ListNode]:\n    pass"
    wrapped = CodeWrapperService.wrap_code(
        "java", source_code, "reverseList", ArgStyleEnum.single, python_template
    )
    assert "serializeListNode(res)" in wrapped, (
        "Java ListNode return must use serializeListNode(), not printVal()"
    )
    assert "static String serializeListNode(ListNode head)" in wrapped


def test_java_node_return_uses_serialize_method():
    """
    Regression — Bug 2 (Node):
    Node return must call serializeNode(res).
    """
    source_code = """
class Solution {
    public Node connect(Node root) {
        return root;
    }
}
"""
    python_template = "def connect(root: Node) -> Node:\n    pass"
    wrapped = CodeWrapperService.wrap_code(
        "java", source_code, "connect", ArgStyleEnum.single, python_template
    )
    assert "serializeNode(res)" in wrapped, (
        "Java Node return must use serializeNode(), not printVal()"
    )
    assert "static String serializeNode(Node root)" in wrapped


def test_java_serialize_helpers_present_in_every_wrapper():
    """
    All three serialization helpers must be emitted in every Java wrapper,
    not just when the return type requires them (they're in _JAVA_IO_HELPERS).
    """
    source_code = """
class Solution {
    public int[] twoSum(int[] nums, int target) {
        return new int[]{0, 1};
    }
}
"""
    python_template = "def twoSum(nums: list[int], target: int) -> list[int]:\n    pass"
    wrapped = CodeWrapperService.wrap_code(
        "java", source_code, "twoSum", ArgStyleEnum.positional, python_template
    )
    assert "static String serializeTreeNode(TreeNode root)" in wrapped
    assert "static String serializeListNode(ListNode head)" in wrapped
    assert "static String serializeNode(Node root)" in wrapped


# ─────────────────────────────────────────────────────────────────
#  Bug 3 — Java void return must print "null"
# ─────────────────────────────────────────────────────────────────

def test_java_void_return_prints_null():
    """
    Regression — Bug 3:
    Previously a void Java method produced no output at all.
    Python wrappers output json.dumps(None) == "null" for void/None returns.
    The Java wrapper must also print "null" so both sides match.
    """
    source_code = """
class Solution {
    public void rotate(int[][] matrix) {
        // in-place
    }
}
"""
    python_template = "def rotate(matrix: list[list[int]]) -> None:\n    pass"
    wrapped = CodeWrapperService.wrap_code(
        "java", source_code, "rotate", ArgStyleEnum.single, python_template
    )
    assert 'System.out.print("null")' in wrapped, (
        "Java void wrapper must print \"null\" to match Python's json.dumps(None)"
    )


def test_java_void_return_does_not_declare_res_variable():
    """
    After the fix the code should call the void method directly and then
    print null — it must NOT attempt to assign the result to a variable.
    """
    source_code = """
class Solution {
    public void sortColors(int[] nums) {}
}
"""
    python_template = "def sortColors(nums: list[int]) -> None:\n    pass"
    wrapped = CodeWrapperService.wrap_code(
        "java", source_code, "sortColors", ArgStyleEnum.single, python_template
    )
    # No "void res = ..." assignment (void can't be assigned in Java)
    assert "void res" not in wrapped


# ─────────────────────────────────────────────────────────────────
#  Bug 4 — JavaScript void return must output "null" not "undefined"
# ─────────────────────────────────────────────────────────────────

def test_js_void_return_serialize_code_is_null():
    """
    Regression — Bug 4:
    JSON.stringify(undefined) in Node.js produces the JS value `undefined`
    which console.log prints as the string "undefined".
    Python outputs "null".  The JS wrapper must output "null" for void returns.
    """
    python_template = "def rotate(matrix: list[list[int]]) -> None:\n    pass"
    user_code = "var rotate = function(matrix) {};"
    wrapped = CodeWrapperService.wrap_code(
        "javascript", user_code, "rotate", ArgStyleEnum.single, python_template
    )
    # The serialized_result should be the literal null, not the JS variable result
    assert "const serialized_result = null" in wrapped, (
        "JS void wrapper must set serialized_result = null, not result"
    )


def test_js_void_wrapper_outputs_json_null_string():
    """
    JSON.stringify(null) == "null", so console.log(JSON.stringify(null)) prints "null".
    Verify the wrapper correctly chains through to that output.
    """
    python_template = "def sortColors(nums: list[int]) -> None:\n    pass"
    user_code = "var sortColors = function(nums) {};"
    wrapped = CodeWrapperService.wrap_code(
        "javascript", user_code, "sortColors", ArgStyleEnum.single, python_template
    )
    # Must use JSON.stringify (which on null gives "null")
    assert "JSON.stringify(serialized_result)" in wrapped
    assert "const serialized_result = null" in wrapped


# ─────────────────────────────────────────────────────────────────
#  End-to-end execution tests (require Python / Node on PATH)
# ─────────────────────────────────────────────────────────────────

from app.services.local_executor import LocalExecutor


def test_e2e_python_void_outputs_null():
    """Python void wrapper must produce 'null' on stdout."""
    python_template = "def rotate(matrix: list[list[int]]) -> None:\n    pass"
    user_code = """
class Solution:
    def rotate(self, matrix):
        n = len(matrix)
        for i in range(n):
            for j in range(i + 1, n):
                matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
        for i in range(n):
            matrix[i].reverse()
"""
    wrapped = CodeWrapperService.wrap_code(
        "python", user_code, "rotate", ArgStyleEnum.single, python_template
    )
    stdin = json.dumps([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
    res = asyncio.run(LocalExecutor.execute("python", wrapped, stdin, 5000, 262144))
    assert res["status"]["id"] == 3, f"Expected Accepted, got {res['status']}: {res.get('stderr')}"
    assert res["stdout"].strip() == "null", (
        f"Python void must output 'null', got: {res['stdout']!r}"
    )


def test_e2e_js_void_outputs_null():
    """JavaScript void wrapper must produce 'null' on stdout."""
    if not shutil.which("node"):
        pytest.skip("Node.js not installed on host")

    python_template = "def rotate(matrix: list[list[int]]) -> None:\n    pass"
    user_code = """
var rotate = function(matrix) {
    const n = matrix.length;
    for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++)
            [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
    for (let i = 0; i < n; i++) matrix[i].reverse();
};
"""
    wrapped = CodeWrapperService.wrap_code(
        "javascript", user_code, "rotate", ArgStyleEnum.single, python_template
    )
    stdin = json.dumps([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
    res = asyncio.run(LocalExecutor.execute("javascript", wrapped, stdin, 5000, 262144))
    assert res["status"]["id"] == 3, f"Expected Accepted, got {res['status']}: {res.get('stderr')}"
    assert res["stdout"].strip() == "null", (
        f"JS void must output 'null', got: {res['stdout']!r}"
    )


def test_e2e_python_treenode_return():
    """Python TreeNode-returning problem serializes result as level-order JSON."""
    python_template = "def invertTree(root: Optional[TreeNode]) -> Optional[TreeNode]:\n    pass"
    user_code = """
class Solution:
    def invertTree(self, root):
        if not root:
            return None
        root.left, root.right = root.right, root.left
        self.invertTree(root.left)
        self.invertTree(root.right)
        return root
"""
    wrapped = CodeWrapperService.wrap_code(
        "python", user_code, "invertTree", ArgStyleEnum.single, python_template
    )
    stdin = json.dumps([4, 2, 7, 1, 3, 6, 9])
    res = asyncio.run(LocalExecutor.execute("python", wrapped, stdin, 5000, 262144))
    assert res["status"]["id"] == 3, f"Expected Accepted, got {res['status']}: {res.get('stderr')}"
    assert json.loads(res["stdout"].strip()) == [4, 7, 2, 9, 6, 3, 1]


def test_e2e_js_listnode_return():
    """JavaScript ListNode-returning problem serializes result as JSON int array."""
    if not shutil.which("node"):
        pytest.skip("Node.js not installed on host")

    python_template = "def reverseList(head: Optional[ListNode]) -> Optional[ListNode]:\n    pass"
    user_code = """
var reverseList = function(head) {
    let prev = null, curr = head;
    while (curr) {
        let next = curr.next;
        curr.next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
};
"""
    wrapped = CodeWrapperService.wrap_code(
        "javascript", user_code, "reverseList", ArgStyleEnum.single, python_template
    )
    stdin = json.dumps([1, 2, 3, 4, 5])
    res = asyncio.run(LocalExecutor.execute("javascript", wrapped, stdin, 5000, 262144))
    assert res["status"]["id"] == 3, f"Expected Accepted, got {res['status']}: {res.get('stderr')}"
    assert json.loads(res["stdout"].strip()) == [5, 4, 3, 2, 1]


# ─────────────────────────────────────────────────────────────────
#  Bug 5 — C++ void return must print "null"
# ─────────────────────────────────────────────────────────────────

def test_cpp_void_return_prints_null():
    """
    Regression — Bug 5:
    C++ void methods produced no output. Python outputs "null" for void/None.
    The C++ wrapper must also print "null" so output comparison passes.
    """
    source_code = """
class Solution {
public:
    void rotate(vector<vector<int>>& matrix) {
        // in-place
    }
};"""
    python_template = "def rotate(matrix: list[list[int]]) -> None:\n    pass"
    wrapped = CodeWrapperService.wrap_code(
        "cpp", source_code, "rotate", ArgStyleEnum.single, python_template
    )
    assert 'cout << "null"' in wrapped, (
        "C++ void wrapper must print \"null\" to match Python's json.dumps(None)"
    )


def test_cpp_treenode_pointer_return_uses_print_helper():
    """C++ TreeNode* return must call print_TreeNode_as_json(), not print_val."""
    source_code = """
class Solution {
public:
    TreeNode* invertTree(TreeNode* root) {
        return root;
    }
};"""
    python_template = "def invertTree(root: Optional[TreeNode]) -> Optional[TreeNode]:\n    pass"
    wrapped = CodeWrapperService.wrap_code(
        "cpp", source_code, "invertTree", ArgStyleEnum.single, python_template
    )
    assert "print_TreeNode_as_json(res)" in wrapped


def test_cpp_listnode_pointer_return_uses_print_helper():
    """C++ ListNode* return must call print_ListNode_as_json()."""
    source_code = """
class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        return head;
    }
};"""
    python_template = "def reverseList(head: Optional[ListNode]) -> Optional[ListNode]:\n    pass"
    wrapped = CodeWrapperService.wrap_code(
        "cpp", source_code, "reverseList", ArgStyleEnum.single, python_template
    )
    assert "print_ListNode_as_json(res)" in wrapped
