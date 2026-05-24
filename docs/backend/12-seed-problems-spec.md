# 12 — Seed Problems Specification (v1)

Canonical data for `scripts/seed_problems.py`. Implement as a Python constant (e.g. `SEED_PROBLEMS`) imported by the script — **do not** hand-edit the DB.

**Global defaults (all 5 problems unless noted):**

| Field | Value |
|-------|--------|
| `time_limit_ms` | 2000 |
| `memory_limit_kb` | 262144 |
| `score_base` | 100 |
| `runtime_bonus_max` | 20 |
| `weight` | 1 (every test) |
| Hidden tests | 5 per problem (`is_sample=false`, `order_index` 2–6) |
| Sample tests | 2 per problem (`is_sample=true`, `order_index` 0–1) |

Store `input` and `expected_output` as **JSON strings** (TEXT columns). Stdin to Judge0 = raw `input` string.

**Per-problem test rows (not per language):** each `test_cases` row has one `input` string. It must work with **both** python and javascript templates for that problem (pick `arg_style` per language so wrappers parse the same stdin shape — usually `positional` or `single` for both).

---

## 1. `two-sum` (EASY)

| Field | Value |
|-------|--------|
| `title` | Two Sum |
| `tags` | `array`, `hash-map` |
| `function_name` | `twoSum` |
| Python `arg_style` | `positional` |
| JS `arg_style` | `positional` |

Use **positional** for both languages so one `input` row works for python and javascript (`[nums, target]` as JSON array).

**Python template (starter):**

```python
from typing import List

def twoSum(nums: List[int], target: int) -> List[int]:
    pass
```

**JavaScript template (starter):**

```javascript
/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
}
```

| # | sample? | `input` (positional: `[nums, target]`) | `expected_output` |
|---|---------|------------------------------------------|-------------------|
| 0 | yes | `[[2,7,11,15],9]` | `[0,1]` |
| 1 | yes | `[[3,2,4],6]` | `[1,2]` |
| 2 | no | `[[3,3],6]` | `[0,1]` |
| 3 | no | `[[1,2,3,4,5],9]` | `[3,4]` |
| 4 | no | `[[-1,-2,-3,-4,-5],-8]` | `[2,4]` |
| 5 | no | `[[0,4,3,0],0]` | `[0,3]` |
| 6 | no | `[[2,5,5,11],10]` | `[1,2]` |

---

## 2. `valid-parentheses` (EASY)

| Field | Value |
|-------|--------|
| `title` | Valid Parentheses |
| `tags` | `string`, `stack` |
| `function_name` | `isValid` |
| Python `arg_style` | `single` |
| JS `arg_style` | `single` |

**Python / JS template:** `def isValid(s: str) -> bool` / `function isValid(s) { }`

| # | sample? | `input` | `expected_output` |
|---|---------|---------|-------------------|
| 0 | yes | `"()"` | `true` |
| 1 | yes | `"()[]{}"` | `true` |
| 2 | no | `"(]"` | `false` |
| 3 | no | `"([)]"` | `false` |
| 4 | no | `"{[]}"` | `true` |
| 5 | no | `""` | `true` |
| 6 | no | `"((((((("` | `false` |

---

## 3. `merge-sorted-arrays` (EASY)

| Field | Value |
|-------|--------|
| `title` | Merge Sorted Arrays |
| `tags` | `array`, `two-pointers` |
| `function_name` | `merge` |
| Python `arg_style` | `positional` |
| JS `arg_style` | `positional` |

Merge two sorted integer arrays into one sorted array.

**Templates:** `def merge(nums1: List[int], nums2: List[int]) -> List[int]` / `function merge(nums1, nums2) { }`

| # | sample? | `input` | `expected_output` |
|---|---------|---------|-------------------|
| 0 | yes | `[[1,2,3],[2,5,6]]` | `[1,2,2,3,5,6]` |
| 1 | yes | `[[1],[2,3,4]]` | `[1,2,3,4]` |
| 2 | no | `[[],[]]` | `[]` |
| 3 | no | `[[1,3,5],[2,4,6]]` | `[1,2,3,4,5,6]` |
| 4 | no | `[[1,2],[3,4,5,6]]` | `[1,2,3,4,5,6]` |
| 5 | no | `[[5,6,7],[1,2,3]]` | `[1,2,3,5,6,7]` |
| 6 | no | `[[-1,0],[0,1]]` | `[-1,0,0,1]` |

---

## 4. `binary-search` (MEDIUM)

| Field | Value |
|-------|--------|
| `title` | Binary Search |
| `tags` | `array`, `binary-search` |
| `function_name` | `search` |
| Python `arg_style` | `positional` |
| JS `arg_style` | `positional` |

Return index of `target` in sorted `nums`, or `-1`.

**Templates:** `def search(nums: List[int], target: int) -> int` / `function search(nums, target) { }`

| # | sample? | `input` | `expected_output` |
|---|---------|---------|-------------------|
| 0 | yes | `[[-1,0,3,5,9,12],9]` | `4` |
| 1 | yes | `[[-1,0,3,5,9,12],2]` | `-1` |
| 2 | no | `[[5],5]` | `0` |
| 3 | no | `[[5],-5]` | `-1` |
| 4 | no | `[[1,2,3,4,5,6,7,8,9,10],10]` | `9` |
| 5 | no | `[[1,2,3,4,5,6,7,8,9,10],1]` | `0` |
| 6 | no | `[[],1]` | `-1` |

---

## 5. `longest-substring` (MEDIUM)

| Field | Value |
|-------|--------|
| `title` | Longest Substring Without Repeating Characters |
| `tags` | `string`, `sliding-window` |
| `function_name` | `lengthOfLongestSubstring` |
| Python `arg_style` | `single` |
| JS `arg_style` | `single` |

**Python template (starter):**

```python
def lengthOfLongestSubstring(s: str) -> int:
    pass
```

**JavaScript template (starter):**

```javascript
/**
 * @param {string} s
 * @return {number}
 */
function lengthOfLongestSubstring(s) {
}
```

| # | sample? | `input` | `expected_output` |
|---|---------|---------|-------------------|
| 0 | yes | `"abcabcbb"` | `3` |
| 1 | yes | `"bbbbb"` | `1` |
| 2 | no | `"pwwkew"` | `3` |
| 3 | no | `""` | `0` |
| 4 | no | `"au"` | `2` |
| 5 | no | `"dvdf"` | `3` |
| 6 | no | `"tmmzuxt"` | `5` |

---

## `seed_problems.py` implementation notes

1. Upsert by `slug` (idempotent re-run). Script calls **repos/services directly** — no HTTP/JWT (see [04-phase-3-problems.md](./04-phase-3-problems.md#admin-bootstrap-required-before-seed)).
2. Every test `input` must be valid for **both** languages on that problem (see global rule above).
3. Insert `problem_templates` row per `(problem_id, language)` with `template_code`, `function_name`, `arg_style`.
4. Insert test cases with `order_index` 0–6 (0–1 sample, 2–6 hidden; 7 tests total).
5. Link tags via `problem_tags`.
6. Reference: [04-phase-3-problems.md](./04-phase-3-problems.md) admin bootstrap, [05-phase-4-judge.md](./05-phase-4-judge.md) wrappers.

**Smoke AC solutions (for manual QA after Phase 4):** keep reference solutions in `scripts/seed_solutions.py` (optional, not in DB) or a commented block in `seed_problems.py` — not loaded into DB.

**Scoring recovery (Phase 5):** `scripts/rescore_submission.py <submission_uuid>` — see [06-phase-5-scoring.md](./06-phase-5-scoring.md#manual-scoring-recovery-ops).
