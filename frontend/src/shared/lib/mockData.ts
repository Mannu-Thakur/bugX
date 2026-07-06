import type { ProblemListItem, ProblemDetail, Tag, Paginated } from './api';

export const MOCK_TAGS: Tag[] = [
  { id: 'tag-1', name: 'Arrays' },
  { id: 'tag-2', name: 'Math' },
  { id: 'tag-3', name: 'Dynamic Programming' },
  { id: 'tag-4', name: 'Recursion' },
  { id: 'tag-5', name: 'Two Pointers' },
  { id: 'tag-6', name: 'Binary Search' },
  { id: 'tag-7', name: 'Graph' },
  { id: 'tag-8', name: 'Sorting' },
  { id: 'tag-9', name: 'Stack' },
  { id: 'tag-10', name: 'Linked List' },
  { id: 'tag-11', name: 'Hash Table' },
  { id: 'tag-12', name: 'String' },
];

export const MOCK_PROBLEMS: ProblemListItem[] = [
  {
    id: 'prob-1',
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'EASY',
    acceptance_rate: 48.3,
    score_base: 1,
    tags: [MOCK_TAGS[0], MOCK_TAGS[1]],
    is_published: true,
    created_at: '2026-01-10T00:00:00Z',
    user_status: { solved: true, best_score: 100 },
  },
  {
    id: 'prob-2',
    slug: 'longest-substring-without-repeating',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'MEDIUM',
    acceptance_rate: 33.7,
    score_base: 3,
    tags: [MOCK_TAGS[4]],
    is_published: true,
    created_at: '2026-01-12T00:00:00Z',
    user_status: { solved: true, best_score: 200 },
  },
  {
    id: 'prob-3',
    slug: 'median-of-two-sorted-arrays',
    title: 'Median of Two Sorted Arrays',
    difficulty: 'HARD',
    acceptance_rate: 37.1,
    score_base: 6,
    tags: [MOCK_TAGS[0], MOCK_TAGS[5]],
    is_published: true,
    created_at: '2026-01-14T00:00:00Z',
  },
  {
    id: 'prob-4',
    slug: 'climbing-stairs',
    title: 'Climbing Stairs',
    difficulty: 'EASY',
    acceptance_rate: 51.8,
    score_base: 1,
    tags: [MOCK_TAGS[2], MOCK_TAGS[3]],
    is_published: true,
    created_at: '2026-01-15T00:00:00Z',
  },
  {
    id: 'prob-5',
    slug: 'container-with-most-water',
    title: 'Container With Most Water',
    difficulty: 'MEDIUM',
    acceptance_rate: 54.2,
    score_base: 3,
    tags: [MOCK_TAGS[4], MOCK_TAGS[0]],
    is_published: true,
    created_at: '2026-01-16T00:00:00Z',
  },
  {
    id: 'prob-6',
    slug: 'reverse-linked-list',
    title: 'Reverse Linked List',
    difficulty: 'EASY',
    acceptance_rate: 73.1,
    score_base: 1,
    tags: [MOCK_TAGS[9]],
    is_published: true,
    created_at: '2026-01-17T00:00:00Z',
  },
  {
    id: 'prob-7',
    slug: 'binary-tree-inorder-traversal',
    title: 'Binary Tree Inorder Traversal',
    difficulty: 'EASY',
    acceptance_rate: 74.5,
    score_base: 1,
    tags: [MOCK_TAGS[6]],
    is_published: true,
    created_at: '2026-01-18T00:00:00Z',
  },
  {
    id: 'prob-8',
    slug: 'merge-k-sorted-lists',
    title: 'Merge k Sorted Lists',
    difficulty: 'HARD',
    acceptance_rate: 47.6,
    score_base: 6,
    tags: [MOCK_TAGS[6], MOCK_TAGS[7]],
    is_published: true,
    created_at: '2026-01-19T00:00:00Z',
  },
  {
    id: 'prob-9',
    slug: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    difficulty: 'HARD',
    acceptance_rate: 57.0,
    score_base: 6,
    tags: [MOCK_TAGS[0], MOCK_TAGS[4]],
    is_published: true,
    created_at: '2026-01-20T00:00:00Z',
  },
  {
    id: 'prob-10',
    slug: 'coin-change',
    title: 'Coin Change',
    difficulty: 'MEDIUM',
    acceptance_rate: 41.3,
    score_base: 3,
    tags: [MOCK_TAGS[2]],
    is_published: true,
    created_at: '2026-01-21T00:00:00Z',
  },
  {
    id: 'prob-11',
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'EASY',
    acceptance_rate: 40.5,
    score_base: 1,
    tags: [MOCK_TAGS[8], MOCK_TAGS[11]],
    is_published: true,
    created_at: '2026-01-22T00:00:00Z',
  },
  {
    id: 'prob-12',
    slug: 'merge-two-sorted-lists',
    title: 'Merge Two Sorted Lists',
    difficulty: 'EASY',
    acceptance_rate: 61.8,
    score_base: 1,
    tags: [MOCK_TAGS[9], MOCK_TAGS[3]],
    is_published: true,
    created_at: '2026-01-23T00:00:00Z',
  },
  {
    id: 'prob-13',
    slug: 'three-sum',
    title: '3Sum',
    difficulty: 'MEDIUM',
    acceptance_rate: 32.4,
    score_base: 3,
    tags: [MOCK_TAGS[0], MOCK_TAGS[4], MOCK_TAGS[7]],
    is_published: true,
    created_at: '2026-01-24T00:00:00Z',
  },
  {
    id: 'prob-14',
    slug: 'group-anagrams',
    title: 'Group Anagrams',
    difficulty: 'MEDIUM',
    acceptance_rate: 66.1,
    score_base: 3,
    tags: [MOCK_TAGS[10], MOCK_TAGS[11], MOCK_TAGS[7]],
    is_published: true,
    created_at: '2026-01-25T00:00:00Z',
  },
  {
    id: 'prob-15',
    slug: 'maximum-subarray',
    title: 'Maximum Subarray',
    difficulty: 'MEDIUM',
    acceptance_rate: 50.0,
    score_base: 3,
    tags: [MOCK_TAGS[0], MOCK_TAGS[2]],
    is_published: true,
    created_at: '2026-01-26T00:00:00Z',
  },
];

export const MOCK_PAGINATED_PROBLEMS: Paginated<ProblemListItem> = {
  items: MOCK_PROBLEMS,
  total: MOCK_PROBLEMS.length,
  page: 1,
  limit: 20,
  pages: 1,
};

// ─── Full Problem Details for offline fallback ───────────────────────────────

export const MOCK_PROBLEM_DETAILS: Record<string, ProblemDetail> = {
  'two-sum': {
    id: 'prob-1',
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'EASY',
    description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

Example 1:
  Input: nums = [2,7,11,15], target = 9
  Output: [0,1]
  Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

Example 2:
  Input: nums = [3,2,4], target = 6
  Output: [1,2]

Example 3:
  Input: nums = [3,3], target = 6
  Output: [0,1]`,
    constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.',
    acceptance_rate: 48.3,
    score_base: 1,
    time_limit_ms: 2000,
    memory_limit_kb: 262144,
    tags: [MOCK_TAGS[0], MOCK_TAGS[1]],
    templates: [
      {
        language: 'python',
        source_code: `class Solution:
    def twoSum(self, nums: list[int], target: int) -> list[int]:
        # Write your solution here
        pass
`,
      },
      {
        language: 'javascript',
        source_code: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Write your solution here
};
`,
      },
    ],
    sample_test_cases: [
      { id: 'tc-1-1', input: '[2,7,11,15]\n9', expected_output: '[0,1]', is_sample: true },
      { id: 'tc-1-2', input: '[3,2,4]\n6', expected_output: '[1,2]', is_sample: true },
      { id: 'tc-1-3', input: '[3,3]\n6', expected_output: '[0,1]', is_sample: true },
    ],
    is_published: true,
    created_at: '2026-01-10T00:00:00Z',
    user_status: null,
  },

  'longest-substring-without-repeating': {
    id: 'prob-2',
    slug: 'longest-substring-without-repeating',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'MEDIUM',
    description: `Given a string s, find the length of the longest substring without repeating characters.

A substring is a contiguous non-empty sequence of characters within a string.

Example 1:
  Input: s = "abcabcbb"
  Output: 3
  Explanation: The answer is "abc", with the length of 3.

Example 2:
  Input: s = "bbbbb"
  Output: 1
  Explanation: The answer is "b", with the length of 1.

Example 3:
  Input: s = "pwwkew"
  Output: 3
  Explanation: The answer is "wke", with the length of 3. Notice that the answer must be a substring, "pwke" is a subsequence and not a substring.`,
    constraints: '0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols and spaces.',
    acceptance_rate: 33.7,
    score_base: 3,
    time_limit_ms: 2000,
    memory_limit_kb: 262144,
    tags: [MOCK_TAGS[4]],
    templates: [
      {
        language: 'python',
        source_code: `class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        # Write your solution here
        pass
`,
      },
      {
        language: 'javascript',
        source_code: `/**
 * @param {string} s
 * @return {number}
 */
var lengthOfLongestSubstring = function(s) {
    // Write your solution here
};
`,
      },
    ],
    sample_test_cases: [
      { id: 'tc-2-1', input: '"abcabcbb"', expected_output: '3', is_sample: true },
      { id: 'tc-2-2', input: '"bbbbb"', expected_output: '1', is_sample: true },
      { id: 'tc-2-3', input: '"pwwkew"', expected_output: '3', is_sample: true },
    ],
    is_published: true,
    created_at: '2026-01-12T00:00:00Z',
    user_status: null,
  },

  'median-of-two-sorted-arrays': {
    id: 'prob-3',
    slug: 'median-of-two-sorted-arrays',
    title: 'Median of Two Sorted Arrays',
    difficulty: 'HARD',
    description: `Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.

The overall run time complexity should be O(log (m+n)).

Example 1:
  Input: nums1 = [1,3], nums2 = [2]
  Output: 2.00000
  Explanation: merged array = [1,2,3] and median is 2.

Example 2:
  Input: nums1 = [1,2], nums2 = [3,4]
  Output: 2.50000
  Explanation: merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5.`,
    constraints: 'nums1.length == m\nnums2.length == n\n0 <= m <= 1000\n0 <= n <= 1000\n1 <= m + n <= 2000\n-10^6 <= nums1[i], nums2[i] <= 10^6',
    acceptance_rate: 37.1,
    score_base: 6,
    time_limit_ms: 2000,
    memory_limit_kb: 262144,
    tags: [MOCK_TAGS[0], MOCK_TAGS[5]],
    templates: [
      {
        language: 'python',
        source_code: `class Solution:
    def findMedianSortedArrays(self, nums1: list[int], nums2: list[int]) -> float:
        # Write your solution here
        pass
`,
      },
      {
        language: 'javascript',
        source_code: `/**
 * @param {number[]} nums1
 * @param {number[]} nums2
 * @return {number}
 */
var findMedianSortedArrays = function(nums1, nums2) {
    // Write your solution here
};
`,
      },
    ],
    sample_test_cases: [
      { id: 'tc-3-1', input: '[1,3]\n[2]', expected_output: '2.00000', is_sample: true },
      { id: 'tc-3-2', input: '[1,2]\n[3,4]', expected_output: '2.50000', is_sample: true },
    ],
    is_published: true,
    created_at: '2026-01-14T00:00:00Z',
    user_status: null,
  },

  'climbing-stairs': {
    id: 'prob-4',
    slug: 'climbing-stairs',
    title: 'Climbing Stairs',
    difficulty: 'EASY',
    description: `You are climbing a staircase. It takes n steps to reach the top.

Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?

Example 1:
  Input: n = 2
  Output: 2
  Explanation: There are two ways to climb to the top.
  1. 1 step + 1 step
  2. 2 steps

Example 2:
  Input: n = 3
  Output: 3
  Explanation: There are three ways to climb to the top.
  1. 1 step + 1 step + 1 step
  2. 1 step + 2 steps
  3. 2 steps + 1 step`,
    constraints: '1 <= n <= 45',
    acceptance_rate: 51.8,
    score_base: 1,
    time_limit_ms: 1000,
    memory_limit_kb: 262144,
    tags: [MOCK_TAGS[2], MOCK_TAGS[3]],
    templates: [
      {
        language: 'python',
        source_code: `class Solution:
    def climbStairs(self, n: int) -> int:
        # Write your solution here
        pass
`,
      },
      {
        language: 'javascript',
        source_code: `/**
 * @param {number} n
 * @return {number}
 */
var climbStairs = function(n) {
    // Write your solution here
};
`,
      },
    ],
    sample_test_cases: [
      { id: 'tc-4-1', input: '2', expected_output: '2', is_sample: true },
      { id: 'tc-4-2', input: '3', expected_output: '3', is_sample: true },
    ],
    is_published: true,
    created_at: '2026-01-15T00:00:00Z',
    user_status: null,
  },

  'container-with-most-water': {
    id: 'prob-5',
    slug: 'container-with-most-water',
    title: 'Container With Most Water',
    difficulty: 'MEDIUM',
    description: `You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]).

Find two lines that together with the x-axis form a container, such that the container contains the most water.

Return the maximum amount of water a container can store.

Notice that you may not slant the container.

Example 1:
  Input: height = [1,8,6,2,5,4,8,3,7]
  Output: 49
  Explanation: The vertical lines are represented by array [1,8,6,2,5,4,8,3,7]. In this case, the max area of water the container can contain is 49.

Example 2:
  Input: height = [1,1]
  Output: 1`,
    constraints: 'n == height.length\n2 <= n <= 10^5\n0 <= height[i] <= 10^4',
    acceptance_rate: 54.2,
    score_base: 3,
    time_limit_ms: 2000,
    memory_limit_kb: 262144,
    tags: [MOCK_TAGS[4], MOCK_TAGS[0]],
    templates: [
      {
        language: 'python',
        source_code: `class Solution:
    def maxArea(self, height: list[int]) -> int:
        # Write your solution here
        pass
`,
      },
      {
        language: 'javascript',
        source_code: `/**
 * @param {number[]} height
 * @return {number}
 */
var maxArea = function(height) {
    // Write your solution here
};
`,
      },
    ],
    sample_test_cases: [
      { id: 'tc-5-1', input: '[1,8,6,2,5,4,8,3,7]', expected_output: '49', is_sample: true },
      { id: 'tc-5-2', input: '[1,1]', expected_output: '1', is_sample: true },
    ],
    is_published: true,
    created_at: '2026-01-16T00:00:00Z',
    user_status: null,
  },

  'reverse-linked-list': {
    id: 'prob-6',
    slug: 'reverse-linked-list',
    title: 'Reverse Linked List',
    difficulty: 'EASY',
    description: `Given the head of a singly linked list, reverse the list, and return the reversed list.

Example 1:
  Input: head = [1,2,3,4,5]
  Output: [5,4,3,2,1]

Example 2:
  Input: head = [1,2]
  Output: [2,1]

Example 3:
  Input: head = []
  Output: []`,
    constraints: 'The number of nodes in the list is the range [0, 5000].\n-5000 <= Node.val <= 5000',
    acceptance_rate: 73.1,
    score_base: 1,
    time_limit_ms: 1000,
    memory_limit_kb: 262144,
    tags: [MOCK_TAGS[9]],
    templates: [
      {
        language: 'python',
        source_code: `# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next

class Solution:
    def reverseList(self, head):
        # Write your solution here
        pass
`,
      },
      {
        language: 'javascript',
        source_code: `/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
/**
 * @param {ListNode} head
 * @return {ListNode}
 */
var reverseList = function(head) {
    // Write your solution here
};
`,
      },
    ],
    sample_test_cases: [
      { id: 'tc-6-1', input: '[1,2,3,4,5]', expected_output: '[5,4,3,2,1]', is_sample: true },
      { id: 'tc-6-2', input: '[1,2]', expected_output: '[2,1]', is_sample: true },
      { id: 'tc-6-3', input: '[]', expected_output: '[]', is_sample: true },
    ],
    is_published: true,
    created_at: '2026-01-17T00:00:00Z',
    user_status: null,
  },

  'binary-tree-inorder-traversal': {
    id: 'prob-7',
    slug: 'binary-tree-inorder-traversal',
    title: 'Binary Tree Inorder Traversal',
    difficulty: 'EASY',
    description: `Given the root of a binary tree, return the inorder traversal of its nodes' values.

Inorder traversal visits nodes in the order: left subtree, root, right subtree.

Example 1:
  Input: root = [1,null,2,3]
  Output: [1,3,2]

Example 2:
  Input: root = []
  Output: []

Example 3:
  Input: root = [1]
  Output: [1]`,
    constraints: 'The number of nodes in the tree is in the range [0, 100].\n-100 <= Node.val <= 100',
    acceptance_rate: 74.5,
    score_base: 1,
    time_limit_ms: 1000,
    memory_limit_kb: 262144,
    tags: [MOCK_TAGS[6]],
    templates: [
      {
        language: 'python',
        source_code: `# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

class Solution:
    def inorderTraversal(self, root) -> list[int]:
        # Write your solution here
        pass
`,
      },
      {
        language: 'javascript',
        source_code: `/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.left = (left===undefined ? null : left)
 *     this.right = (right===undefined ? null : right)
 * }
 */
/**
 * @param {TreeNode} root
 * @return {number[]}
 */
var inorderTraversal = function(root) {
    // Write your solution here
};
`,
      },
    ],
    sample_test_cases: [
      { id: 'tc-7-1', input: '[1,null,2,3]', expected_output: '[1,3,2]', is_sample: true },
      { id: 'tc-7-2', input: '[]', expected_output: '[]', is_sample: true },
      { id: 'tc-7-3', input: '[1]', expected_output: '[1]', is_sample: true },
    ],
    is_published: true,
    created_at: '2026-01-18T00:00:00Z',
    user_status: null,
  },

  'merge-k-sorted-lists': {
    id: 'prob-8',
    slug: 'merge-k-sorted-lists',
    title: 'Merge k Sorted Lists',
    difficulty: 'HARD',
    description: `You are given an array of k linked-lists lists, each linked-list is sorted in ascending order.

Merge all the linked-lists into one sorted linked-list and return it.

Example 1:
  Input: lists = [[1,4,5],[1,3,4],[2,6]]
  Output: [1,1,2,3,4,4,5,6]
  Explanation: The linked-lists are:
  [1->4->5, 1->3->4, 2->6]
  merging them into one sorted list: 1->1->2->3->4->4->5->6

Example 2:
  Input: lists = []
  Output: []

Example 3:
  Input: lists = [[]]
  Output: []`,
    constraints: 'k == lists.length\n0 <= k <= 10^4\n0 <= lists[i].length <= 500\n-10^4 <= lists[i][j] <= 10^4\nlists[i] is sorted in ascending order.\nThe sum of lists[i].length will not exceed 10^4.',
    acceptance_rate: 47.6,
    score_base: 6,
    time_limit_ms: 3000,
    memory_limit_kb: 262144,
    tags: [MOCK_TAGS[6], MOCK_TAGS[7]],
    templates: [
      {
        language: 'python',
        source_code: `# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next

class Solution:
    def mergeKLists(self, lists):
        # Write your solution here
        pass
`,
      },
      {
        language: 'javascript',
        source_code: `/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
/**
 * @param {ListNode[]} lists
 * @return {ListNode}
 */
var mergeKLists = function(lists) {
    // Write your solution here
};
`,
      },
    ],
    sample_test_cases: [
      { id: 'tc-8-1', input: '[[1,4,5],[1,3,4],[2,6]]', expected_output: '[1,1,2,3,4,4,5,6]', is_sample: true },
      { id: 'tc-8-2', input: '[]', expected_output: '[]', is_sample: true },
      { id: 'tc-8-3', input: '[[]]', expected_output: '[]', is_sample: true },
    ],
    is_published: true,
    created_at: '2026-01-19T00:00:00Z',
    user_status: null,
  },

  'trapping-rain-water': {
    id: 'prob-9',
    slug: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    difficulty: 'HARD',
    description: `Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.

Example 1:
  Input: height = [0,1,0,2,1,0,1,3,2,1,2,1]
  Output: 6
  Explanation: The elevation map [0,1,0,2,1,0,1,3,2,1,2,1] can trap 6 units of rain water.

Example 2:
  Input: height = [4,2,0,3,2,5]
  Output: 9`,
    constraints: 'n == height.length\n1 <= n <= 2 * 10^4\n0 <= height[i] <= 10^5',
    acceptance_rate: 57.0,
    score_base: 6,
    time_limit_ms: 2000,
    memory_limit_kb: 262144,
    tags: [MOCK_TAGS[0], MOCK_TAGS[4]],
    templates: [
      {
        language: 'python',
        source_code: `class Solution:
    def trap(self, height: list[int]) -> int:
        # Write your solution here
        pass
`,
      },
      {
        language: 'javascript',
        source_code: `/**
 * @param {number[]} height
 * @return {number}
 */
var trap = function(height) {
    // Write your solution here
};
`,
      },
    ],
    sample_test_cases: [
      { id: 'tc-9-1', input: '[0,1,0,2,1,0,1,3,2,1,2,1]', expected_output: '6', is_sample: true },
      { id: 'tc-9-2', input: '[4,2,0,3,2,5]', expected_output: '9', is_sample: true },
    ],
    is_published: true,
    created_at: '2026-01-20T00:00:00Z',
    user_status: null,
  },

  'coin-change': {
    id: 'prob-10',
    slug: 'coin-change',
    title: 'Coin Change',
    difficulty: 'MEDIUM',
    description: `You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money.

Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.

You may assume that you have an infinite number of each kind of coin.

Example 1:
  Input: coins = [1,2,5], amount = 11
  Output: 3
  Explanation: 11 = 5 + 5 + 1

Example 2:
  Input: coins = [2], amount = 3
  Output: -1

Example 3:
  Input: coins = [1], amount = 0
  Output: 0`,
    constraints: '1 <= coins.length <= 12\n1 <= coins[i] <= 2^31 - 1\n0 <= amount <= 10^4',
    acceptance_rate: 41.3,
    score_base: 3,
    time_limit_ms: 2000,
    memory_limit_kb: 262144,
    tags: [MOCK_TAGS[2]],
    templates: [
      {
        language: 'python',
        source_code: `class Solution:
    def coinChange(self, coins: list[int], amount: int) -> int:
        # Write your solution here
        pass
`,
      },
      {
        language: 'javascript',
        source_code: `/**
 * @param {number[]} coins
 * @param {number} amount
 * @return {number}
 */
var coinChange = function(coins, amount) {
    // Write your solution here
};
`,
      },
    ],
    sample_test_cases: [
      { id: 'tc-10-1', input: '[1,2,5]\n11', expected_output: '3', is_sample: true },
      { id: 'tc-10-2', input: '[2]\n3', expected_output: '-1', is_sample: true },
      { id: 'tc-10-3', input: '[1]\n0', expected_output: '0', is_sample: true },
    ],
    is_published: true,
    created_at: '2026-01-21T00:00:00Z',
    user_status: null,
  },

  'valid-parentheses': {
    id: 'prob-11',
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'EASY',
    description: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

Example 1:
  Input: s = "()"
  Output: true

Example 2:
  Input: s = "()[]{}"
  Output: true

Example 3:
  Input: s = "(]"
  Output: false

Example 4:
  Input: s = "([])"
  Output: true`,
    constraints: '1 <= s.length <= 10^4\ns consists of parentheses only \'()[]{}\'.',
    acceptance_rate: 40.5,
    score_base: 1,
    time_limit_ms: 1000,
    memory_limit_kb: 262144,
    tags: [MOCK_TAGS[8], MOCK_TAGS[11]],
    templates: [
      {
        language: 'python',
        source_code: `class Solution:
    def isValid(self, s: str) -> bool:
        # Write your solution here
        pass
`,
      },
      {
        language: 'javascript',
        source_code: `/**
 * @param {string} s
 * @return {boolean}
 */
var isValid = function(s) {
    // Write your solution here
};
`,
      },
    ],
    sample_test_cases: [
      { id: 'tc-11-1', input: '"()"', expected_output: 'true', is_sample: true },
      { id: 'tc-11-2', input: '"()[]{}"', expected_output: 'true', is_sample: true },
      { id: 'tc-11-3', input: '"(]"', expected_output: 'false', is_sample: true },
    ],
    is_published: true,
    created_at: '2026-01-22T00:00:00Z',
    user_status: null,
  },

  'merge-two-sorted-lists': {
    id: 'prob-12',
    slug: 'merge-two-sorted-lists',
    title: 'Merge Two Sorted Lists',
    difficulty: 'EASY',
    description: `You are given the heads of two sorted linked lists list1 and list2.

Merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.

Return the head of the merged linked list.

Example 1:
  Input: list1 = [1,2,4], list2 = [1,3,4]
  Output: [1,1,2,3,4,4]

Example 2:
  Input: list1 = [], list2 = []
  Output: []

Example 3:
  Input: list1 = [], list2 = [0]
  Output: [0]`,
    constraints: 'The number of nodes in both lists is in the range [0, 50].\n-100 <= Node.val <= 100\nBoth list1 and list2 are sorted in non-decreasing order.',
    acceptance_rate: 61.8,
    score_base: 1,
    time_limit_ms: 1000,
    memory_limit_kb: 262144,
    tags: [MOCK_TAGS[9], MOCK_TAGS[3]],
    templates: [
      {
        language: 'python',
        source_code: `# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next

class Solution:
    def mergeTwoLists(self, list1, list2):
        # Write your solution here
        pass
`,
      },
      {
        language: 'javascript',
        source_code: `/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
/**
 * @param {ListNode} list1
 * @param {ListNode} list2
 * @return {ListNode}
 */
var mergeTwoLists = function(list1, list2) {
    // Write your solution here
};
`,
      },
    ],
    sample_test_cases: [
      { id: 'tc-12-1', input: '[1,2,4]\n[1,3,4]', expected_output: '[1,1,2,3,4,4]', is_sample: true },
      { id: 'tc-12-2', input: '[]\n[]', expected_output: '[]', is_sample: true },
      { id: 'tc-12-3', input: '[]\n[0]', expected_output: '[0]', is_sample: true },
    ],
    is_published: true,
    created_at: '2026-01-23T00:00:00Z',
    user_status: null,
  },

  'three-sum': {
    id: 'prob-13',
    slug: 'three-sum',
    title: '3Sum',
    difficulty: 'MEDIUM',
    description: `Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.

Notice that the solution set must not contain duplicate triplets.

Example 1:
  Input: nums = [-1,0,1,2,-1,-4]
  Output: [[-1,-1,2],[-1,0,1]]
  Explanation:
  nums[0] + nums[1] + nums[2] = (-1) + 0 + 1 = 0.
  nums[1] + nums[2] + nums[4] = 0 + 1 + (-1) = 0.
  nums[0] + nums[3] + nums[4] = (-1) + 2 + (-1) = 0.
  The distinct triplets are [-1,0,1] and [-1,-1,2].
  Notice that the order of the output and the order of the triplets does not matter.

Example 2:
  Input: nums = [0,1,1]
  Output: []
  Explanation: The only possible triplet does not sum up to 0.

Example 3:
  Input: nums = [0,0,0]
  Output: [[0,0,0]]
  Explanation: The only possible triplet sums up to 0.`,
    constraints: '3 <= nums.length <= 3000\n-10^5 <= nums[i] <= 10^5',
    acceptance_rate: 32.4,
    score_base: 3,
    time_limit_ms: 3000,
    memory_limit_kb: 262144,
    tags: [MOCK_TAGS[0], MOCK_TAGS[4], MOCK_TAGS[7]],
    templates: [
      {
        language: 'python',
        source_code: `class Solution:
    def threeSum(self, nums: list[int]) -> list[list[int]]:
        # Write your solution here
        pass
`,
      },
      {
        language: 'javascript',
        source_code: `/**
 * @param {number[]} nums
 * @return {number[][]}
 */
var threeSum = function(nums) {
    // Write your solution here
};
`,
      },
    ],
    sample_test_cases: [
      { id: 'tc-13-1', input: '[-1,0,1,2,-1,-4]', expected_output: '[[-1,-1,2],[-1,0,1]]', is_sample: true },
      { id: 'tc-13-2', input: '[0,1,1]', expected_output: '[]', is_sample: true },
      { id: 'tc-13-3', input: '[0,0,0]', expected_output: '[[0,0,0]]', is_sample: true },
    ],
    is_published: true,
    created_at: '2026-01-24T00:00:00Z',
    user_status: null,
  },

  'group-anagrams': {
    id: 'prob-14',
    slug: 'group-anagrams',
    title: 'Group Anagrams',
    difficulty: 'MEDIUM',
    description: `Given an array of strings strs, group the anagrams together. You can return the answer in any order.

An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.

Example 1:
  Input: strs = ["eat","tea","tan","ate","nat","bat"]
  Output: [["bat"],["nat","tan"],["ate","eat","tea"]]

Example 2:
  Input: strs = [""]
  Output: [[""]]

Example 3:
  Input: strs = ["a"]
  Output: [["a"]]`,
    constraints: '1 <= strs.length <= 10^4\n0 <= strs[i].length <= 100\nstrs[i] consists of lowercase English letters.',
    acceptance_rate: 66.1,
    score_base: 3,
    time_limit_ms: 2000,
    memory_limit_kb: 262144,
    tags: [MOCK_TAGS[10], MOCK_TAGS[11], MOCK_TAGS[7]],
    templates: [
      {
        language: 'python',
        source_code: `class Solution:
    def groupAnagrams(self, strs: list[str]) -> list[list[str]]:
        # Write your solution here
        pass
`,
      },
      {
        language: 'javascript',
        source_code: `/**
 * @param {string[]} strs
 * @return {string[][]}
 */
var groupAnagrams = function(strs) {
    // Write your solution here
};
`,
      },
    ],
    sample_test_cases: [
      { id: 'tc-14-1', input: '["eat","tea","tan","ate","nat","bat"]', expected_output: '[["bat"],["nat","tan"],["ate","eat","tea"]]', is_sample: true },
      { id: 'tc-14-2', input: '[""]', expected_output: '[[""]]', is_sample: true },
      { id: 'tc-14-3', input: '["a"]', expected_output: '[["a"]]', is_sample: true },
    ],
    is_published: true,
    created_at: '2026-01-25T00:00:00Z',
    user_status: null,
  },

  'maximum-subarray': {
    id: 'prob-15',
    slug: 'maximum-subarray',
    title: 'Maximum Subarray',
    difficulty: 'MEDIUM',
    description: `Given an integer array nums, find the subarray with the largest sum, and return its sum.

A subarray is a contiguous non-empty sequence of elements within an array.

Example 1:
  Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
  Output: 6
  Explanation: The subarray [4,-1,2,1] has the largest sum 6.

Example 2:
  Input: nums = [1]
  Output: 1
  Explanation: The subarray [1] has the largest sum 1.

Example 3:
  Input: nums = [5,4,-1,7,8]
  Output: 23
  Explanation: The subarray [5,4,-1,7,8] has the largest sum 23.`,
    constraints: '1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4',
    acceptance_rate: 50.0,
    score_base: 3,
    time_limit_ms: 2000,
    memory_limit_kb: 262144,
    tags: [MOCK_TAGS[0], MOCK_TAGS[2]],
    templates: [
      {
        language: 'python',
        source_code: `class Solution:
    def maxSubArray(self, nums: list[int]) -> int:
        # Write your solution here
        pass
`,
      },
      {
        language: 'javascript',
        source_code: `/**
 * @param {number[]} nums
 * @return {number}
 */
var maxSubArray = function(nums) {
    // Write your solution here
};
`,
      },
    ],
    sample_test_cases: [
      { id: 'tc-15-1', input: '[-2,1,-3,4,-1,2,1,-5,4]', expected_output: '6', is_sample: true },
      { id: 'tc-15-2', input: '[1]', expected_output: '1', is_sample: true },
      { id: 'tc-15-3', input: '[5,4,-1,7,8]', expected_output: '23', is_sample: true },
    ],
    is_published: true,
    created_at: '2026-01-26T00:00:00Z',
    user_status: null,
  },
};

// ── Dynamic C++/Java Template Generator ──────────────────────────────────
// Parses a Python function signature and auto-generates the equivalent
// C++ or Java Solution class.  Works for ANY problem, not just the 15
// seeded ones.
// ─────────────────────────────────────────────────────────────────────────

const PY_TO_CPP: Record<string, string> = {
  'int': 'int', 'str': 'string', 'float': 'double', 'bool': 'bool',
  'list[int]': 'vector<int>', 'List[int]': 'vector<int>',
  'list[str]': 'vector<string>', 'List[str]': 'vector<string>',
  'list[float]': 'vector<double>', 'List[float]': 'vector<double>',
  'list[list[int]]': 'vector<vector<int>>', 'List[List[int]]': 'vector<vector<int>>',
  'list[list[str]]': 'vector<vector<string>>', 'List[List[str]]': 'vector<vector<string>>',
  'list': 'vector<int>', 'List': 'vector<int>',
};

const PY_TO_JAVA: Record<string, string> = {
  'int': 'int', 'str': 'String', 'float': 'double', 'bool': 'boolean',
  'list[int]': 'int[]', 'List[int]': 'int[]',
  'list[str]': 'String[]', 'List[str]': 'String[]',
  'list[float]': 'double[]', 'List[float]': 'double[]',
  'list[list[int]]': 'List<List<Integer>>', 'List[List[int]]': 'List<List<Integer>>',
  'list[list[str]]': 'List<List<String>>', 'List[List[str]]': 'List<List<String>>',
  'list': 'int[]', 'List': 'int[]',
};

const CPP_DEFAULTS: Record<string, string> = {
  'int': '0', 'double': '0.0', 'float': '0.0f', 'bool': 'false', 'string': '""',
};
const JAVA_DEFAULTS: Record<string, string> = {
  'int': '0', 'double': '0.0', 'float': '0.0f', 'boolean': 'false', 'String': '""',
};

function parsePySig(pyCode: string): { params: [string, string][]; ret: string | null } {
  const m = pyCode.match(/def\s+\w+\s*\(([^)]*)\)\s*(?:->\s*(.+?))?\s*:/);
  if (!m) return { params: [], ret: null };
  const rawParams = m[1].trim();
  const ret = m[2]?.trim() ?? null;
  const params: [string, string][] = [];
  if (rawParams) {
    for (const p of rawParams.split(',')) {
      const t = p.trim();
      if (t === 'self' || t === 'cls' || !t) continue;
      if (t.includes(':')) {
        const [name, type] = t.split(':').map(s => s.trim());
        params.push([name, type]);
      } else {
        params.push([t, 'int']);
      }
    }
  }
  return { params, ret };
}

function generateCppTemplate(pyCode: string): string {
  const fnMatch = pyCode.match(/def\s+(\w+)/);
  if (!fnMatch) return '// Could not auto-generate template\nclass Solution {\npublic:\n    // Write your solution here\n};';
  const fnName = fnMatch[1];
  const { params, ret } = parsePySig(pyCode);
  const cppRet = ret ? (PY_TO_CPP[ret] || 'int') : 'void';
  const cppParams = params.map(([name, type]) => {
    const ct = PY_TO_CPP[type] || 'int';
    return ct.startsWith('vector') ? `${ct}& ${name}` : `${ct} ${name}`;
  }).join(', ');
  let retStmt = '';
  if (cppRet === 'void') retStmt = '';
  else if (CPP_DEFAULTS[cppRet]) retStmt = `\n        return ${CPP_DEFAULTS[cppRet]};`;
  else retStmt = '\n        return {};';
  return `class Solution {\npublic:\n    ${cppRet} ${fnName}(${cppParams}) {\n        // Write your solution here${retStmt}\n    }\n};`;
}

function generateJavaTemplate(pyCode: string): string {
  const fnMatch = pyCode.match(/def\s+(\w+)/);
  if (!fnMatch) return '// Could not auto-generate template\nclass Solution {\n    // Write your solution here\n}';
  const fnName = fnMatch[1];
  const { params, ret } = parsePySig(pyCode);
  const javaRet = ret ? (PY_TO_JAVA[ret] || 'int') : 'void';
  const javaParams = params.map(([name, type]) => {
    const jt = PY_TO_JAVA[type] || 'int';
    return `${jt} ${name}`;
  }).join(', ');
  let retStmt = '';
  if (javaRet === 'void') retStmt = '';
  else if (JAVA_DEFAULTS[javaRet]) retStmt = `\n        return ${JAVA_DEFAULTS[javaRet]};`;
  else if (javaRet.endsWith('[]')) retStmt = `\n        return new ${javaRet.slice(0, -2)}[0];`;
  else if (javaRet.startsWith('List')) retStmt = '\n        return new ArrayList<>();';
  else retStmt = '\n        return null;';
  return `class Solution {\n    public ${javaRet} ${fnName}(${javaParams}) {\n        // Write your solution here${retStmt}\n    }\n}`;
}

// Inject C++ and Java templates for ALL mock problems dynamically
Object.keys(MOCK_PROBLEM_DETAILS).forEach(slug => {
  const prob = MOCK_PROBLEM_DETAILS[slug];
  const pyTpl = prob.templates.find((t: any) => t.language === 'python');
  if (!pyTpl) return;
  const pyCode: string = pyTpl.source_code || pyTpl.template_code || '';
  // Add C++ template if not already present
  if (!prob.templates.some((t: any) => t.language === 'cpp')) {
    prob.templates.push({ language: 'cpp', source_code: generateCppTemplate(pyCode) });
  }
  // Add Java template if not already present
  if (!prob.templates.some((t: any) => t.language === 'java')) {
    prob.templates.push({ language: 'java', source_code: generateJavaTemplate(pyCode) });
  }
});
