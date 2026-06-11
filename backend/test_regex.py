import re

code = """
# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right
class Solution:
    def rightSideView(self, root: Optional[TreeNode]) -> List[int]:
"""

function_name = "rightSideView"
match = re.search(r"def\s+" + re.escape(function_name) + r"\s*\(\s*self\s*(?:,\s*([^)]*))?\)", code)
if match:
    params_str = match.group(1) or ""
    print("params_str:", repr(params_str))
    params = [p.strip() for p in params_str.split(",") if p.strip()]
    print("params:", params)
    print("len(params):", len(params))
else:
    print("No match")
