import uuid
import json
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.problem import Problem, DifficultyEnum
from app.models.tag import Tag
from app.models.problem_template import ProblemTemplate, ArgStyleEnum
from app.models.test_case import TestCase

# A base list of 15 classic coding problems to populate the database
BASE_SEED_PROBLEMS = [
    {
        "slug": "two-sum",
        "title": "Two Sum",
        "difficulty": "EASY",
        "score_base": 100,
        "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
        "expected_complexity": "O(N)",
        "tags": ["Arrays", "Hash Tables"],
        "templates": [
            {
                "language": "python",
                "template_code": "def twoSum(nums: list[int], target: int) -> list[int]:\n    # Write your solution here\n    pass",
                "function_name": "twoSum",
                "arg_style": "positional"
            },
            {
                "language": "javascript",
                "template_code": "var twoSum = function(nums, target) {\n    // Write your solution here\n};",
                "function_name": "twoSum",
                "arg_style": "positional"
            }
        ],
        "test_cases": [
            {"input": "[[2, 7, 11, 15], 9]", "expected_output": "[0, 1]", "is_sample": True},
            {"input": "[[3, 2, 4], 6]", "expected_output": "[1, 2]", "is_sample": False},
            {"input": "[[3, 3], 6]", "expected_output": "[0, 1]", "is_sample": False},
            {"input": "[[1, 5, 8, 3], 11]", "expected_output": "[2, 3]", "is_sample": False}
        ]
    },
    {
        "slug": "longest-substring-without-repeating",
        "title": "Longest Substring Without Repeating Characters",
        "difficulty": "MEDIUM",
        "score_base": 200,
        "description": "Given a string s, find the length of the longest substring without repeating characters.",
        "expected_complexity": "O(N)",
        "tags": ["Strings", "Sliding Window"],
        "templates": [
            {
                "language": "python",
                "template_code": "def lengthOfLongestSubstring(s: str) -> int:\n    # Write your solution here\n    pass",
                "function_name": "lengthOfLongestSubstring",
                "arg_style": "single"
            },
            {
                "language": "javascript",
                "template_code": "var lengthOfLongestSubstring = function(s) {\n    // Write your solution here\n};",
                "function_name": "lengthOfLongestSubstring",
                "arg_style": "single"
            }
        ],
        "test_cases": [
            {"input": "\"abcabcbb\"", "expected_output": "3", "is_sample": True},
            {"input": "\"bbbbb\"", "expected_output": "1", "is_sample": False},
            {"input": "\"pwwkew\"", "expected_output": "3", "is_sample": False},
            {"input": "\"\"", "expected_output": "0", "is_sample": False}
        ]
    },
    {
        "slug": "median-of-two-sorted-arrays",
        "title": "Median of Two Sorted Arrays",
        "difficulty": "HARD",
        "score_base": 400,
        "description": "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.\n\nThe overall run time complexity should be O(log (m+n)).",
        "expected_complexity": "O(log(M+N))",
        "tags": ["Arrays", "Binary Search"],
        "templates": [
            {
                "language": "python",
                "template_code": "def findMedianSortedArrays(nums1: list[int], nums2: list[int]) -> float:\n    # Write your solution here\n    pass",
                "function_name": "findMedianSortedArrays",
                "arg_style": "positional"
            },
            {
                "language": "javascript",
                "template_code": "var findMedianSortedArrays = function(nums1, nums2) {\n    // Write your solution here\n};",
                "function_name": "findMedianSortedArrays",
                "arg_style": "positional"
            }
        ],
        "test_cases": [
            {"input": "[[1, 3], [2]]", "expected_output": "2.0", "is_sample": True},
            {"input": "[[1, 2], [3, 4]]", "expected_output": "2.5", "is_sample": False},
            {"input": "[[0, 0], [0, 0]]", "expected_output": "0.0", "is_sample": False},
            {"input": "[[], [1]]", "expected_output": "1.0", "is_sample": False}
        ]
    },
    {
        "slug": "climbing-stairs",
        "title": "Climbing Stairs",
        "difficulty": "EASY",
        "score_base": 100,
        "description": "You are climbing a staircase. It takes n steps to reach the top.\n\nEach time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
        "expected_complexity": "O(N)",
        "tags": ["Dynamic Programming", "Math"],
        "templates": [
            {
                "language": "python",
                "template_code": "def climbStairs(n: int) -> int:\n    # Write your solution here\n    pass",
                "function_name": "climbStairs",
                "arg_style": "single"
            },
            {
                "language": "javascript",
                "template_code": "var climbStairs = function(n) {\n    // Write your solution here\n};",
                "function_name": "climbStairs",
                "arg_style": "single"
            }
        ],
        "test_cases": [
            {"input": "2", "expected_output": "2", "is_sample": True},
            {"input": "3", "expected_output": "3", "is_sample": False},
            {"input": "4", "expected_output": "5", "is_sample": False},
            {"input": "5", "expected_output": "8", "is_sample": False}
        ]
    },
    {
        "slug": "container-with-most-water",
        "title": "Container With Most Water",
        "difficulty": "MEDIUM",
        "score_base": 200,
        "description": "You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the line i are (i, 0) and (i, height[i]).\n\nFind two lines that together with the x-axis form a container, such that the container contains the most water.\n\nReturn the maximum amount of water a container can store.",
        "expected_complexity": "O(N)",
        "tags": ["Arrays", "Two Pointers"],
        "templates": [
            {
                "language": "python",
                "template_code": "def maxArea(height: list[int]) -> int:\n    # Write your solution here\n    pass",
                "function_name": "maxArea",
                "arg_style": "single"
            },
            {
                "language": "javascript",
                "template_code": "var maxArea = function(height) {\n    // Write your solution here\n};",
                "function_name": "maxArea",
                "arg_style": "single"
            }
        ],
        "test_cases": [
            {"input": "[1, 8, 6, 2, 5, 4, 8, 3, 7]", "expected_output": "49", "is_sample": True},
            {"input": "[1, 1]", "expected_output": "1", "is_sample": False},
            {"input": "[4, 3, 2, 1, 4]", "expected_output": "16", "is_sample": False},
            {"input": "[1, 2, 1]", "expected_output": "2", "is_sample": False}
        ]
    },
    {
        "slug": "reverse-linked-list",
        "title": "Reverse Linked List",
        "difficulty": "EASY",
        "score_base": 100,
        "description": "Given the head of a singly linked list, reverse the list, and return the reversed list.\n\n*Note*: Input is represented as an array of values.",
        "expected_complexity": "O(N)",
        "tags": ["Linked List", "Recursion"],
        "templates": [
            {
                "language": "python",
                "template_code": "def reverseList(head: list[int]) -> list[int]:\n    # Write your solution here\n    # In sandbox, head is passed as a standard list for convenience\n    return head[::-1]",
                "function_name": "reverseList",
                "arg_style": "single"
            },
            {
                "language": "javascript",
                "template_code": "var reverseList = function(head) {\n    // Write your solution here\n    return head.reverse();\n};",
                "function_name": "reverseList",
                "arg_style": "single"
            }
        ],
        "test_cases": [
            {"input": "[1, 2, 3, 4, 5]", "expected_output": "[5, 4, 3, 2, 1]", "is_sample": True},
            {"input": "[1, 2]", "expected_output": "[2, 1]", "is_sample": False},
            {"input": "[]", "expected_output": "[]", "is_sample": False},
            {"input": "[9]", "expected_output": "[9]", "is_sample": False}
        ]
    },
    {
        "slug": "binary-tree-inorder-traversal",
        "title": "Binary Tree Inorder Traversal",
        "difficulty": "EASY",
        "score_base": 100,
        "description": "Given the root of a binary tree, return the inorder traversal of its nodes' values.\n\n*Note*: Input tree is represented as a list in level-order.",
        "expected_complexity": "O(N)",
        "tags": ["Trees", "DFS"],
        "templates": [
            {
                "language": "python",
                "template_code": "def inorderTraversal(root: list) -> list:\n    # Write your solution here\n    pass",
                "function_name": "inorderTraversal",
                "arg_style": "single"
            },
            {
                "language": "javascript",
                "template_code": "var inorderTraversal = function(root) {\n    // Write your solution here\n};",
                "function_name": "inorderTraversal",
                "arg_style": "single"
            }
        ],
        "test_cases": [
            {"input": "[1, null, 2, 3]", "expected_output": "[1, 3, 2]", "is_sample": True},
            {"input": "[]", "expected_output": "[]", "is_sample": False},
            {"input": "[1]", "expected_output": "[1]", "is_sample": False},
            {"input": "[1, 2, 3]", "expected_output": "[2, 1, 3]", "is_sample": False}
        ]
    },
    {
        "slug": "merge-k-sorted-lists",
        "title": "Merge k Sorted Lists",
        "difficulty": "HARD",
        "score_base": 400,
        "description": "You are given an array of k linked-lists lists, each linked-list is sorted in ascending order.\n\nMerge all the linked-lists into one sorted linked-list and return it.",
        "expected_complexity": "O(N*log(K))",
        "tags": ["Linked List", "Sorting"],
        "templates": [
            {
                "language": "python",
                "template_code": "def mergeKLists(lists: list[list[int]]) -> list[int]:\n    # Write your solution here\n    pass",
                "function_name": "mergeKLists",
                "arg_style": "single"
            },
            {
                "language": "javascript",
                "template_code": "var mergeKLists = function(lists) {\n    // Write your solution here\n};",
                "function_name": "mergeKLists",
                "arg_style": "single"
            }
        ],
        "test_cases": [
            {"input": "[[1, 4, 5], [1, 3, 4], [2, 6]]", "expected_output": "[1, 1, 2, 3, 4, 4, 5, 6]", "is_sample": True},
            {"input": "[]", "expected_output": "[]", "is_sample": False},
            {"input": "[[]]", "expected_output": "[]", "is_sample": False},
            {"input": "[[1, 2], [3]]", "expected_output": "[1, 2, 3]", "is_sample": False}
        ]
    },
    {
        "slug": "trapping-rain-water",
        "title": "Trapping Rain Water",
        "difficulty": "HARD",
        "score_base": 400,
        "description": "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
        "expected_complexity": "O(N)",
        "tags": ["Arrays", "Two Pointers"],
        "templates": [
            {
                "language": "python",
                "template_code": "def trap(height: list[int]) -> int:\n    # Write your solution here\n    pass",
                "function_name": "trap",
                "arg_style": "single"
            },
            {
                "language": "javascript",
                "template_code": "var trap = function(height) {\n    // Write your solution here\n};",
                "function_name": "trap",
                "arg_style": "single"
            }
        ],
        "test_cases": [
            {"input": "[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]", "expected_output": "6", "is_sample": True},
            {"input": "[4, 2, 0, 3, 2, 5]", "expected_output": "9", "is_sample": False},
            {"input": "[3, 0, 3]", "expected_output": "3", "is_sample": False},
            {"input": "[]", "expected_output": "0", "is_sample": False}
        ]
    },
    {
        "slug": "coin-change",
        "title": "Coin Change",
        "difficulty": "MEDIUM",
        "score_base": 200,
        "description": "You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.",
        "expected_complexity": "O(N*A)",
        "tags": ["Dynamic Programming"],
        "templates": [
            {
                "language": "python",
                "template_code": "def coinChange(coins: list[int], amount: int) -> int:\n    # Write your solution here\n    pass",
                "function_name": "coinChange",
                "arg_style": "positional"
            },
            {
                "language": "javascript",
                "template_code": "var coinChange = function(coins, amount) {\n    // Write your solution here\n};",
                "function_name": "coinChange",
                "arg_style": "positional"
            }
        ],
        "test_cases": [
            {"input": "[[1, 2, 5], 11]", "expected_output": "3", "is_sample": True},
            {"input": "[[2], 3]", "expected_output": "-1", "is_sample": False},
            {"input": "[[1], 0]", "expected_output": "0", "is_sample": False},
            {"input": "[[186, 419, 83, 408], 6249]", "expected_output": "20", "is_sample": False}
        ]
    },
    {
        "slug": "valid-parentheses",
        "title": "Valid Parentheses",
        "difficulty": "EASY",
        "score_base": 100,
        "description": "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nAn input string is valid if open brackets are closed by the same type of brackets, and closed in the correct order.",
        "expected_complexity": "O(N)",
        "tags": ["Strings", "Stack"],
        "templates": [
            {
                "language": "python",
                "template_code": "def isValid(s: str) -> bool:\n    # Write your solution here\n    pass",
                "function_name": "isValid",
                "arg_style": "single"
            },
            {
                "language": "javascript",
                "template_code": "var isValid = function(s) {\n    // Write your solution here\n};",
                "function_name": "isValid",
                "arg_style": "single"
            }
        ],
        "test_cases": [
            {"input": "\"()\"", "expected_output": "true", "is_sample": True},
            {"input": "\"()[]{}\"", "expected_output": "true", "is_sample": False},
            {"input": "\"(]\"", "expected_output": "false", "is_sample": False},
            {"input": "\"]\"", "expected_output": "false", "is_sample": False}
        ]
    },
    {
        "slug": "merge-two-sorted-lists",
        "title": "Merge Two Sorted Lists",
        "difficulty": "EASY",
        "score_base": 100,
        "description": "You are given the heads of two sorted linked lists list1 and list2.\n\nMerge the two lists into one sorted list and return it.\n\n*Note*: Input is represented as arrays of values.",
        "expected_complexity": "O(N+M)",
        "tags": ["Linked List", "Sorting"],
        "templates": [
            {
                "language": "python",
                "template_code": "def mergeTwoLists(list1: list[int], list2: list[int]) -> list[int]:\n    # Write your solution here\n    pass",
                "function_name": "mergeTwoLists",
                "arg_style": "positional"
            },
            {
                "language": "javascript",
                "template_code": "var mergeTwoLists = function(list1, list2) {\n    // Write your solution here\n};",
                "function_name": "mergeTwoLists",
                "arg_style": "positional"
            }
        ],
        "test_cases": [
            {"input": "[[1, 2, 4], [1, 3, 4]]", "expected_output": "[1, 1, 2, 3, 4, 4]", "is_sample": True},
            {"input": "[[], []]", "expected_output": "[]", "is_sample": False},
            {"input": "[[], [0]]", "expected_output": "[0]", "is_sample": False},
            {"input": "[[1], [2, 3]]", "expected_output": "[1, 2, 3]", "is_sample": False}
        ]
    },
    {
        "slug": "three-sum",
        "title": "3Sum",
        "difficulty": "MEDIUM",
        "score_base": 200,
        "description": "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.\n\nNotice that the solution set must not contain duplicate triplets.",
        "expected_complexity": "O(N^2)",
        "tags": ["Arrays", "Two Pointers"],
        "templates": [
            {
                "language": "python",
                "template_code": "def threeSum(nums: list[int]) -> list[list[int]]:\n    # Write your solution here\n    pass",
                "function_name": "threeSum",
                "arg_style": "single"
            },
            {
                "language": "javascript",
                "template_code": "var threeSum = function(nums) {\n    // Write your solution here\n};",
                "function_name": "threeSum",
                "arg_style": "single"
            }
        ],
        "test_cases": [
            {"input": "[-1, 0, 1, 2, -1, -4]", "expected_output": "[[-1, -1, 2], [-1, 0, 1]]", "is_sample": True},
            {"input": "[0, 1, 1]", "expected_output": "[]", "is_sample": False},
            {"input": "[0, 0, 0]", "expected_output": "[[0, 0, 0]]", "is_sample": False},
            {"input": "[-2, 0, 0, 2, 2]", "expected_output": "[[-2, 0, 2]]", "is_sample": False}
        ]
    },
    {
        "slug": "group-anagrams",
        "title": "Group Anagrams",
        "difficulty": "MEDIUM",
        "score_base": 200,
        "description": "Given an array of strings strs, group the anagrams together. You can return the answer in any order.\n\nAn Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.",
        "expected_complexity": "O(N*K*log(K))",
        "tags": ["Strings", "Hash Tables"],
        "templates": [
            {
                "language": "python",
                "template_code": "def groupAnagrams(strs: list[str]) -> list[list[str]]:\n    # Write your solution here\n    pass",
                "function_name": "groupAnagrams",
                "arg_style": "single"
            },
            {
                "language": "javascript",
                "template_code": "var groupAnagrams = function(strs) {\n    // Write your solution here\n};",
                "function_name": "groupAnagrams",
                "arg_style": "single"
            }
        ],
        "test_cases": [
            {"input": "[\"eat\", \"tea\", \"tan\", \"ate\", \"nat\", \"bat\"]", "expected_output": "[[\"bat\"], [\"nat\", \"tan\"], [\"ate\", \"eat\", \"tea\"]]", "is_sample": True},
            {"input": "[\"\"]", "expected_output": "[[\"\"]]", "is_sample": False},
            {"input": "[\"a\"]", "expected_output": "[[\"a\"]]", "is_sample": False},
            {"input": "[\"abc\", \"bca\", \"cab\", \"xyz\"]", "expected_output": "[[\"abc\", \"bca\", \"cab\"], [\"xyz\"]]", "is_sample": False}
        ]
    },
    {
        "slug": "maximum-subarray",
        "title": "Maximum Subarray",
        "difficulty": "MEDIUM",
        "score_base": 200,
        "description": "Given an integer array nums, find the subarray with the largest sum, and return its sum.",
        "expected_complexity": "O(N)",
        "tags": ["Arrays", "Dynamic Programming"],
        "templates": [
            {
                "language": "python",
                "template_code": "def maxSubArray(nums: list[int]) -> int:\n    # Write your solution here\n    pass",
                "function_name": "maxSubArray",
                "arg_style": "single"
            },
            {
                "language": "javascript",
                "template_code": "var maxSubArray = function(nums) {\n    // Write your solution here\n};",
                "function_name": "maxSubArray",
                "arg_style": "single"
            }
        ],
        "test_cases": [
            {"input": "[-2, 1, -3, 4, -1, 2, 1, -5, 4]", "expected_output": "6", "is_sample": True},
            {"input": "[1]", "expected_output": "1", "is_sample": False},
            {"input": "[5, 4, -1, 7, 8]", "expected_output": "23", "is_sample": False},
            {"input": "[-1, -2, -3, -4]", "expected_output": "-1", "is_sample": False}
        ]
    },
    {
        "slug": "populating-next-right-pointers",
        "title": "Populating Next Right Pointers in Each Node",
        "difficulty": "MEDIUM",
        "score_base": 200,
        "description": (
            "You are given a perfect binary tree where all leaves are on the same level, "
            "and every parent has two children. The binary tree has the following definition:\n\n"
            "```\nstruct Node {\n  int val;\n  Node *left;\n  Node *right;\n  Node *next;\n}\n```\n\n"
            "Populate each next pointer to point to its next right node. "
            "If there is no next right node, the next pointer should be set to NULL.\n\n"
            "Initially, all next pointers are set to NULL.\n\n"
            "*Note*: The tree is given as a level-order array. "
            "Output is serialized as a level-order list where `\"#\"` marks the end of each level."
        ),
        "expected_complexity": "O(N)",
        "tags": ["Trees", "BFS"],
        "templates": [
            {
                "language": "python",
                "template_code": (
                    "from typing import Optional\n\n"
                    "class Solution:\n"
                    "    def connect(self, root: Optional[Node]) -> Optional[Node]:\n"
                    "        # Write your solution here\n"
                    "        pass"
                ),
                "function_name": "connect",
                "arg_style": "single"
            },
            {
                "language": "javascript",
                "template_code": (
                    "/**\n"
                    " * @param {Node} root\n"
                    " * @return {Node}\n"
                    " */\n"
                    "var connect = function(root) {\n"
                    "    // Write your solution here\n"
                    "    return root;\n"
                    "};"
                ),
                "function_name": "connect",
                "arg_style": "single"
            },
            {
                "language": "cpp",
                "template_code": (
                    "class Solution {\n"
                    "public:\n"
                    "    Node* connect(Node* root) {\n"
                    "        // Write your solution here\n"
                    "        return root;\n"
                    "    }\n"
                    "};"
                ),
                "function_name": "connect",
                "arg_style": "single"
            },
            {
                "language": "java",
                "template_code": (
                    "class Solution {\n"
                    "    public Node connect(Node root) {\n"
                    "        // Write your solution here\n"
                    "        return root;\n"
                    "    }\n"
                    "}"
                ),
                "function_name": "connect",
                "arg_style": "single"
            }
        ],
        "test_cases": [
            {
                "input": "[1, 2, 3, 4, 5, 6, 7]",
                "expected_output": "[1, \"#\", 2, 3, \"#\", 4, 5, 6, 7, \"#\"]",
                "is_sample": True,
                "weight": 1
            },
            {
                "input": "[]",
                "expected_output": "[]",
                "is_sample": True,
                "weight": 1
            },
            {
                "input": "[1]",
                "expected_output": "[1, \"#\"]",
                "is_sample": False,
                "weight": 1
            },
            {
                "input": "[1, 2, 3]",
                "expected_output": "[1, \"#\", 2, 3, \"#\"]",
                "is_sample": False,
                "weight": 1
            },
            {
                "input": "[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]",
                "expected_output": "[1, \"#\", 2, 3, \"#\", 4, 5, 6, 7, \"#\", 8, 9, 10, 11, 12, 13, 14, 15, \"#\"]",
                "is_sample": False,
                "weight": 2
            }
        ]
    },
    {
        "slug": "reverse-nodes-in-k-group",
        "title": "Reverse Nodes in K Group",
        "difficulty": "HARD",
        "score_base": 400,
        "description": (
            "Given the head of a linked list, reverse the nodes of the list k at a time, "
            "and return the modified list.\n\n"
            "k is a positive integer and is less than or equal to the length of the linked list. "
            "If the number of nodes is not a multiple of k then left-out nodes, in the end, should "
            "remain as is.\n\n"
            "You may not alter the values in the list's nodes, only nodes themselves may be changed.\n\n"
            "*Note*: Input is represented as an array of values and an integer k."
        ),
        "expected_complexity": "O(N)",
        "tags": ["Linked List", "Recursion"],
        "templates": [
            {
                "language": "python",
                "template_code": (
                    "def reverseKGroup(head: list[int], k: int) -> list[int]:\n"
                    "    # Write your solution here\n"
                    "    pass"
                ),
                "function_name": "reverseKGroup",
                "arg_style": "positional"
            },
            {
                "language": "javascript",
                "template_code": (
                    "var reverseKGroup = function(head, k) {\n"
                    "    // Write your solution here\n"
                    "};"
                ),
                "function_name": "reverseKGroup",
                "arg_style": "positional"
            }
        ],
        "test_cases": [
            {"input": "[[1, 2, 3, 4, 5], 2]", "expected_output": "[2, 1, 4, 3, 5]",  "is_sample": True},
            {"input": "[[1, 2, 3, 4, 5], 3]", "expected_output": "[3, 2, 1, 4, 5]",  "is_sample": False},
            {"input": "[[1, 2, 3, 4, 5], 1]", "expected_output": "[1, 2, 3, 4, 5]",  "is_sample": False},
            {"input": "[[1, 2, 3, 4, 5], 5]", "expected_output": "[5, 4, 3, 2, 1]",  "is_sample": False},
            {"input": "[[1, 2], 2]",           "expected_output": "[2, 1]",             "is_sample": False},
            {"input": "[[1], 1]",              "expected_output": "[1]",                "is_sample": False}
        ]
    }
]

async def seed_problems(session: AsyncSession) -> None:
    from app.services.code_wrapper_service import CodeWrapperService
    from app.models.company import Company
    from app.models.topic import Topic
    from sqlalchemy.orm import selectinload

    # 1. Seed companies
    companies_data = [
        {"name": "Google", "slug": "google", "logo_light": None, "logo_dark": None, "brand_color": "#4285F4"},
        {"name": "Amazon", "slug": "amazon", "logo_light": None, "logo_dark": None, "brand_color": "#FF9900"},
        {"name": "Meta", "slug": "meta", "logo_light": None, "logo_dark": None, "brand_color": "#1877F2"},
        {"name": "Microsoft", "slug": "microsoft", "logo_light": None, "logo_dark": None, "brand_color": "#F25022"},
        {"name": "Apple", "slug": "apple", "logo_light": None, "logo_dark": None, "brand_color": "#000000"},
        {"name": "Uber", "slug": "uber", "logo_light": None, "logo_dark": None, "brand_color": "#000000"}
    ]
    
    companies_map = {}
    for c_info in companies_data:
        c_stmt = select(Company).where(Company.slug == c_info["slug"])
        c_res = await session.execute(c_stmt)
        company = c_res.scalar_one_or_none()
        if not company:
            company = Company(
                name=c_info["name"],
                slug=c_info["slug"],
                logo_light=c_info["logo_light"],
                logo_dark=c_info["logo_dark"],
                brand_color=c_info["brand_color"]
            )
            session.add(company)
            await session.flush()
        companies_map[c_info["slug"]] = company

    # 2. Seed topics (corresponding to standard tags)
    topics_list = [
        "Arrays", "Strings", "Hash Tables", "Dynamic Programming", "Math", 
        "Two Pointers", "Binary Search", "Sorting", "Graph", "Recursion", 
        "Trees", "DFS", "BFS", "Backtracking", "Greedy", "Sliding Window", 
        "Linked List", "Stack"
    ]
    
    topics_map = {}
    for t_name in topics_list:
        from app.services.topic_service import slugify
        t_slug = slugify(t_name)
        t_stmt = select(Topic).where(Topic.slug == t_slug)
        t_res = await session.execute(t_stmt)
        topic = t_res.scalar_one_or_none()
        if not topic:
            topic = Topic(name=t_name, slug=t_slug)
            session.add(topic)
            await session.flush()
        topics_map[t_slug] = topic

    # 3. For any existing problems, link them to topics based on their tags,
    # and link some of them to companies.
    prob_stmt = select(Problem).options(selectinload(Problem.tags), selectinload(Problem.companies), selectinload(Problem.topics))
    prob_res = await session.execute(prob_stmt)
    existing_problems = prob_res.scalars().all()
    
    for problem in existing_problems:
        # Link to Topic if tag name matches a topic
        for tag in problem.tags:
            from app.services.topic_service import slugify
            tag_slug = slugify(tag.name)
            if tag_slug in topics_map and topics_map[tag_slug] not in problem.topics:
                problem.topics.append(topics_map[tag_slug])
        
        # Explicit company links for base problems
        slug = problem.slug.lower()
        linked_cos = []
        if "two-sum" in slug or "2sum" in slug:
            linked_cos = ["google", "amazon", "meta"]
        elif "longest-substring" in slug:
            linked_cos = ["google", "amazon", "microsoft"]
        elif "median-of-two" in slug:
            linked_cos = ["google", "uber"]
        elif "climbing-stairs" in slug:
            linked_cos = ["apple", "amazon"]
        elif "container-with-most-water" in slug:
            linked_cos = ["google", "meta"]
        elif "reverse-linked-list" in slug:
            linked_cos = ["microsoft", "apple", "uber"]
        elif "binary-tree" in slug:
            linked_cos = ["google", "amazon", "meta"]
        elif "merge-k-sorted" in slug:
            linked_cos = ["google", "amazon", "meta"]
        elif "trapping-rain-water" in slug:
            linked_cos = ["google", "amazon"]
        elif "coin-change" in slug:
            linked_cos = ["amazon", "meta"]
        elif "valid-parentheses" in slug:
            linked_cos = ["google", "amazon", "meta", "microsoft"]
        elif "three-sum" in slug or "3sum" in slug:
            linked_cos = ["meta"]
        elif "group-anagrams" in slug:
            linked_cos = ["google", "amazon"]
        
        for co_slug in linked_cos:
            if co_slug in companies_map and companies_map[co_slug] not in problem.companies:
                problem.companies.append(companies_map[co_slug])
                
    await session.flush()

    # Check if problems already exist
    stmt = select(func.count(Problem.id))
    res = await session.execute(stmt)
    count = res.scalar() or 0
    if count > 0:
        return
        
    print(f"Database contains 0 problems. Auto-seeding {len(BASE_SEED_PROBLEMS)} base problems...")
    
    for p_data in BASE_SEED_PROBLEMS:
        # Create or fetch tags
        tags_objs = []
        for tg_name in p_data["tags"]:
            tag_stmt = select(Tag).where(Tag.name == tg_name)
            tag_res = await session.execute(tag_stmt)
            tag_obj = tag_res.scalar_one_or_none()
            if not tag_obj:
                tag_obj = Tag(name=tg_name)
                session.add(tag_obj)
                await session.flush()
            tags_objs.append(tag_obj)
            
        # Create templates
        templates_objs = []
        for t_data in p_data["templates"]:
            templates_objs.append(ProblemTemplate(
                language=t_data["language"],
                template_code=t_data["template_code"],
                function_name=t_data["function_name"],
                arg_style=ArgStyleEnum(t_data["arg_style"])
            ))

        # Dynamically generate C++ and Java templates from the Python template,
        # but only if they are not already explicitly provided in the problem definition.
        py_tpl = next(t for t in p_data["templates"] if t["language"] == "python")
        fn_name = py_tpl["function_name"]
        arg_style = py_tpl["arg_style"]

        has_cpp = any(t["language"] == "cpp" for t in p_data["templates"])
        has_java = any(t["language"] == "java" for t in p_data["templates"])

        if not has_cpp:
            cpp_code = CodeWrapperService.generate_cpp_template(fn_name, py_tpl["template_code"])
            templates_objs.append(ProblemTemplate(
                language="cpp",
                template_code=cpp_code,
                function_name=fn_name,
                arg_style=ArgStyleEnum(arg_style)
            ))
        if not has_java:
            java_code = CodeWrapperService.generate_java_template(fn_name, py_tpl["template_code"])
            templates_objs.append(ProblemTemplate(
                language="java",
                template_code=java_code,
                function_name=fn_name,
                arg_style=ArgStyleEnum(arg_style)
            ))
            
        # Create test cases
        testcase_objs = []
        for tc_idx, tc_data in enumerate(p_data["test_cases"]):
            testcase_objs.append(TestCase(
                input=tc_data["input"],
                expected_output=tc_data["expected_output"],
                is_sample=tc_data["is_sample"],
                order_index=tc_idx,
                weight=1
            ))
            
        # Create problem
        mapping = {"EASY": 3, "MEDIUM": 6, "HARD": 10}
        score_base = mapping.get(p_data["difficulty"].upper(), 3)
        comp_mode = "order_agnostic" if any(kw in p_data["slug"].lower() for kw in ["three-sum", "3sum", "3-sum", "two-sum", "group-anagrams"]) else "strict"

        problem = Problem(
            slug=p_data["slug"],
            title=p_data["title"],
            description=p_data["description"],
            difficulty=DifficultyEnum(p_data["difficulty"]),
            time_limit_ms=2000,
            memory_limit_kb=262144,
            score_base=score_base,
            runtime_bonus_max=20,
            is_published=True,
            tags=tags_objs,
            templates=templates_objs,
            test_cases=testcase_objs,
            comparison_mode=comp_mode
        )
        
        session.add(problem)

    # 4. Link newly added base problems as well before final commit
    prob_stmt = select(Problem).options(selectinload(Problem.tags), selectinload(Problem.companies), selectinload(Problem.topics))
    prob_res = await session.execute(prob_stmt)
    all_problems = prob_res.scalars().all()
    
    for problem in all_problems:
        # Link to Topic if tag name matches a topic
        for tag in problem.tags:
            from app.services.topic_service import slugify
            tag_slug = slugify(tag.name)
            if tag_slug in topics_map and topics_map[tag_slug] not in problem.topics:
                problem.topics.append(topics_map[tag_slug])
        
        # Explicit company links for base problems
        slug = problem.slug.lower()
        linked_cos = []
        if "two-sum" in slug or "2sum" in slug:
            linked_cos = ["google", "amazon", "meta"]
        elif "longest-substring" in slug:
            linked_cos = ["google", "amazon", "microsoft"]
        elif "median-of-two" in slug:
            linked_cos = ["google", "uber"]
        elif "climbing-stairs" in slug:
            linked_cos = ["apple", "amazon"]
        elif "container-with-most-water" in slug:
            linked_cos = ["google", "meta"]
        elif "reverse-linked-list" in slug:
            linked_cos = ["microsoft", "apple", "uber"]
        elif "binary-tree" in slug:
            linked_cos = ["google", "amazon", "meta"]
        elif "merge-k-sorted" in slug:
            linked_cos = ["google", "amazon", "meta"]
        elif "trapping-rain-water" in slug:
            linked_cos = ["google", "amazon"]
        elif "coin-change" in slug:
            linked_cos = ["amazon", "meta"]
        elif "valid-parentheses" in slug:
            linked_cos = ["google", "amazon", "meta", "microsoft"]
        elif "three-sum" in slug or "3sum" in slug:
            linked_cos = ["meta"]
        elif "group-anagrams" in slug:
            linked_cos = ["google", "amazon"]
        
        for co_slug in linked_cos:
            if co_slug in companies_map and companies_map[co_slug] not in problem.companies:
                problem.companies.append(companies_map[co_slug])
        
    await session.flush()
    print("Database seeding completed successfully.")
