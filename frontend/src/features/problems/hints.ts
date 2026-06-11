export interface Hint {
  id: number;
  text: string;
}

export const PROBLEM_HINTS: Record<string, string[]> = {
  'two-sum': [
    "A brute-force approach checks every pair, which takes O(N^2) time. Can you do it faster using a Hash Map?",
    "As you traverse the array, store each number's value and its index in a Hash Map.",
    "For each element, calculate its complement (target - num). If the complement is already in the map, you've found the solution!"
  ],
  'longest-substring-without-repeating': [
    "Use a sliding window approach with two pointers: 'left' and 'right'.",
    "Keep a Hash Map or Set of the characters in the current window to detect repeats.",
    "When a repeating character is found, shrink the window from the left until the duplicate character is removed."
  ],
  'median-of-two-sorted-arrays': [
    "A binary search approach is required to achieve O(log(M+N)) runtime complexity.",
    "Partition both arrays such that the left halves contain the same number of elements as the right halves.",
    "Find a partition where the maximum of the left side is less than or equal to the minimum of the right side."
  ],
  'climbing-stairs': [
    "This problem can be modeled as a recurrence relation. To reach step n, you must come from step n-1 or step n-2.",
    "This is exactly the Fibonacci sequence! Let f(n) = f(n-1) + f(n-2).",
    "You can solve this using dynamic programming with O(N) time and O(1) space by tracking only the last two values."
  ],
  'container-with-most-water': [
    "Use a two-pointer approach starting at the leftmost and rightmost ends of the array.",
    "At each step, calculate the area of water trapped: width * min(height[left], height[right]).",
    "To maximize the area, move the pointer that points to the shorter line inward."
  ],
  'reverse-linked-list': [
    "This can be solved either iteratively or recursively. Let's think about the iterative approach.",
    "Maintain three pointers: 'prev' (initialized to null), 'curr' (initialized to head), and 'next_temp'.",
    "In a loop, store curr.next in next_temp, reverse the pointer direction (curr.next = prev), and shift prev and curr forward."
  ],
  'binary-tree-inorder-traversal': [
    "Inorder traversal visits nodes in the order: Left, Root, Right.",
    "For a recursive approach, define a helper function that traverses node.left, pushes node.val to the list, then traverses node.right.",
    "For an iterative approach, use a Stack to simulate the recursion call stack, traversing left all the way before popping and moving right."
  ],
  'merge-k-sorted-lists': [
    "We can solve this by merging lists two at a time, or using a Min-Heap (Priority Queue).",
    "If using a Min-Heap, insert the head of each linked list. The root will always be the smallest node overall.",
    "Pop the root, append it to your result list, and if it has a next node, insert that next node into the heap."
  ],
  'trapping-rain-water': [
    "Water trapped at index i is determined by the minimum of the maximum height to its left and right, minus height[i].",
    "You can compute pre-arrays for 'left_max' and 'right_max', or use a two-pointer approach.",
    "With two pointers, maintain 'left_max' and 'right_max' variables and move pointers inward to compute trapped water in O(1) space."
  ],
  'coin-change': [
    "This is a classic dynamic programming problem. Let dp[i] be the minimum number of coins needed to make amount i.",
    "Initialize dp array with a large value (amount + 1) and dp[0] = 0.",
    "For each coin and for each amount from coin to target, update dp[i] = min(dp[i], dp[i - coin] + 1)."
  ],
  'valid-parentheses': [
    "Use a Stack data structure. When you encounter an opening bracket ('(', '{', '['), push it onto the stack.",
    "When you encounter a closing bracket, check if the stack is non-empty and the top element is the matching opening bracket.",
    "At the end, the string is valid only if the stack is completely empty — meaning every opener was matched and closed."
  ],
  'merge-two-sorted-lists': [
    "Use a dummy head node to simplify the merge logic. Compare the heads of both lists at each step.",
    "Attach the smaller node to the result list and advance that list's pointer. Continue until one list is exhausted.",
    "After the loop, append the remaining non-empty list directly to the result since it's already sorted."
  ],
  'three-sum': [
    "Sort the array first. Then fix one element and use a two-pointer technique on the remaining subarray to find pairs that sum to the negative of the fixed element.",
    "To avoid duplicate triplets, skip consecutive identical values for the fixed element and also when advancing the left/right pointers.",
    "Time complexity is O(N²) after sorting. The outer loop fixes each element, and the inner two-pointer scan is O(N) per iteration."
  ],
  'group-anagrams': [
    "Two strings are anagrams if and only if their sorted character sequences are identical. Use the sorted string as a hash key.",
    "Create a Hash Map where the key is the sorted version of each string, and the value is a list of original strings sharing that key.",
    "Alternatively, use a character frequency count (e.g., a tuple of 26 letter counts) as the key for an O(N*K) solution where K is the max string length."
  ],
  'maximum-subarray': [
    "This is solvable with Kadane's Algorithm. Maintain a running sum of the current subarray and a global maximum.",
    "At each element, decide: is it better to extend the current subarray (current_sum + nums[i]) or start a new one (nums[i])? Take the maximum.",
    "Update the global maximum after each step. The final answer is the global maximum. This runs in O(N) time and O(1) space."
  ]
};

export const getHintsForProblem = (slug: string): string[] => {
  if (slug && PROBLEM_HINTS[slug]) {
    return PROBLEM_HINTS[slug];
  }
  // Fallback default hints
  return [
    "Analyze the problem's constraints. If N is small (e.g., N <= 20), backtracking is feasible. For N <= 10^5, aim for O(N) or O(N log N).",
    "Identify if this is a standard problem type: is it about paths (DFS/BFS), subsets (Backtracking), optimization (Greedy/DP), or range queries?",
    "Write down a brute force algorithm first. See where duplicate calculations occur, and think of how to store results (Caching/Memoization) to optimize."
  ];
};
