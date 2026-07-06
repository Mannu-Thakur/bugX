from app.services.code_wrapper_service import CodeWrapperService
from app.models.problem_template import ArgStyleEnum

def test_python_commented_class_detection():
    source_code = """
# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def hasPathSum(self, root: Optional[TreeNode], targetSum: int) -> bool:
        pass
"""
    class_name = CodeWrapperService._detect_python_class(source_code, "hasPathSum")
    assert class_name == "Solution"

def test_js_commented_class_detection():
    source_code = """
// class ListNode {
//     val: number;
//     next: ListNode | null;
// }

class Solution {
    hasPathSum(root, targetSum) {
        return true;
    }
}
"""
    class_name = CodeWrapperService._detect_js_class(source_code, "hasPathSum")
    assert class_name == "Solution"

def test_cpp_commented_class_detection():
    source_code = """
// class TreeNode {
//     int val;
// };

class Solution {
public:
    bool hasPathSum(TreeNode* root, int targetSum) {
        return true;
    }
};
"""
    # Test C++ invoker generation to ensure Solution is selected
    invoker = CodeWrapperService._build_cpp_invoker("hasPathSum", ArgStyleEnum.positional, source_code)
    assert "Solution sol;" in invoker
    assert "TreeNode sol;" not in invoker
