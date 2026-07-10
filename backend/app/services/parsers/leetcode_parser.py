import re
import json
from typing import Dict, Any, List
from app.models.problem import DifficultyEnum
from app.models.problem_template import ArgStyleEnum

class LeetCodeParser:
    TAG_MAP = {
        "array": "Arrays",
        "string": "Strings",
        "hash table": "Hash Tables",
        "dynamic programming": "Dynamic Programming",
        "math": "Math",
        "two pointers": "Two Pointers",
        "binary search": "Binary Search",
        "sorting": "Sorting",
        "graph": "Graph",
        "recursion": "Recursion",
        "tree": "Trees",
        "depth-first search": "DFS",
        "breadth-first search": "BFS",
        "backtracking": "Backtracking",
        "greedy": "Greedy",
        "sliding window": "Sliding Window",
        "linked list": "Linked List",
        "stack": "Stack"
    }

    @staticmethod
    def _parse_function_name(code: str, language: str) -> str:
        if language == "python":
            class_match = re.search(r"\bclass\s+Solution\b", code)
            search_start = class_match.end() if class_match else 0
            for m in re.finditer(r"\bdef\s+([a-zA-Z0-9_]+)\s*\(", code[search_start:]):
                name = m.group(1)
                if name != "__init__":
                    return name
            for m in re.finditer(r"\bdef\s+([a-zA-Z0-9_]+)\s*\(", code):
                name = m.group(1)
                if name != "__init__":
                    return name
        elif language == "javascript":
            match = re.search(r"var\s+([a-zA-Z0-9_]+)\s*=", code)
            if match:
                return match.group(1)
            match = re.search(r"function\s+([a-zA-Z0-9_]+)\s*\(", code)
            if match:
                return match.group(1)
        return "solution"

    @staticmethod
    def _parse_arg_style(code: str, language: str, function_name: str) -> str:
        if language == "python":
            clean_code = "\n".join([line for line in code.split("\n") if not line.strip().startswith("#")])
            match = re.search(fr"def\s+{function_name}\s*\(\s*self\s*(?:,\s*([^)]*))?\)", clean_code)
            if match:
                params_str = match.group(1) or ""
                params = [p.strip() for p in params_str.split(",") if p.strip()]
                return "single" if len(params) <= 1 else "positional"
            return "single"
        else:  # javascript
            match = re.search(fr"{function_name}\s*=\s*function\s*\(\s*([^)]*)\)", code)
            if not match:
                match = re.search(fr"function\s+{function_name}\s*\(\s*([^)]*)\)", code)
            if match:
                params_str = match.group(1) or ""
                params = [p.strip() for p in params_str.split(",") if p.strip()]
                return "single" if len(params) <= 1 else "positional"
            return "single"

    @staticmethod
    def _parse_param_count(code: str, language: str, function_name: str) -> int:
        """Return the actual number of parameters for function_name in code.

        Works on both raw LeetCode snippets (which have 'self') and cleaned
        templates (where 'self' has already been stripped out).
        """
        if language == "python":
            clean_code = "\n".join([line for line in code.split("\n") if not line.strip().startswith("#")])
            # Try with self (raw snippet)
            match = re.search(fr"def\s+{re.escape(function_name)}\s*\(\s*self\s*(?:,\s*([^)]*))?\)", clean_code)
            if match:
                params_str = match.group(1) or ""
                params = [p.strip() for p in params_str.split(",") if p.strip()]
                return max(1, len(params))
            # Try without self (cleaned template)
            match = re.search(fr"def\s+{re.escape(function_name)}\s*\(\s*([^)]*)\)", clean_code)
            if match:
                params_str = match.group(1) or ""
                params = [p.strip() for p in params_str.split(",") if p.strip()]
                return max(1, len(params))
        else:  # javascript
            match = re.search(fr"{re.escape(function_name)}\s*=\s*function\s*\(\s*([^)]*)\)", code)
            if not match:
                match = re.search(fr"function\s+{re.escape(function_name)}\s*\(\s*([^)]*)\)", code)
            if match:
                params_str = match.group(1) or ""
                params = [p.strip() for p in params_str.split(",") if p.strip()]
                return max(1, len(params))
        return 1

    @staticmethod
    def _clean_python_template(code: str) -> str:
        lines = code.split("\n")
        cleaned_lines = []
        in_solution_class = False

        for line in lines:
            if line.strip().startswith("class Solution"):
                in_solution_class = True
                continue

            if in_solution_class:
                if line.strip().startswith("def "):
                    line_content = line.lstrip()
                    line_content = re.sub(r"\(\s*self\s*,\s*", "(", line_content)
                    line_content = re.sub(r"\(\s*self\s*\)", "()", line_content)
                    cleaned_lines.append(line_content)
                    cleaned_lines.append("    pass")
                    in_solution_class = False
                else:
                    cleaned_lines.append(line.lstrip())
            else:
                cleaned_lines.append(line)

        return "\n".join(cleaned_lines)

    @staticmethod
    def _extract_expected_outputs(html_content: str) -> List[str]:
        """Extract expected output values from LeetCode HTML problem content.

        Strategy:
        1. First try to extract from raw HTML using <strong>Output:</strong> tags
           (LeetCode's current format) before stripping tags, preserving value fidelity.
        2. Fall back to a plain-text regex pass with re.DOTALL so it works across
           multi-line collapsed content.
        """
        if not html_content:
            return []

        # --- Pass 1: Extract from bold-tagged HTML (LeetCode current format) ---
        # Matches: <strong>Output:</strong>\n<strong class="example">true</strong>
        # or:      <strong>Output:</strong> true
        bold_pattern = r"<strong[^>]*>\s*Output\s*:\s*</strong>\s*(.*?)(?=<strong[^>]*>|<p>|<ul>|$)"
        raw_matches = re.findall(bold_pattern, html_content, re.IGNORECASE | re.DOTALL)
        bold_outputs = []
        for rm in raw_matches:
            # Strip remaining HTML tags from the captured group
            clean = re.sub(r"<[^>]+>", " ", rm)
            clean = re.sub(r"&nbsp;", " ", clean)
            clean = re.sub(r"&lt;", "<", clean)
            clean = re.sub(r"&gt;", ">", clean)
            clean = re.sub(r"&amp;", "&", clean)
            clean = re.sub(r"\s+", " ", clean).strip()
            if clean:
                bold_outputs.append(clean)

        if bold_outputs:
            return bold_outputs

        # --- Pass 1b: Inline pattern — <p><strong>Output:</strong> value</p> ---
        # Also handles <p><strong>Output:</strong><strong class="example"> true</strong></p>
        inline_pattern = r"<p[^>]*>\s*<strong[^>]*>\s*Output\s*:\s*</strong>\s*(?:<strong[^>]*>)?\s*(.*?)\s*(?:</strong>)?\s*</p>"
        inline_matches = re.findall(inline_pattern, html_content, re.IGNORECASE | re.DOTALL)
        inline_outputs = []
        for rm in inline_matches:
            clean = re.sub(r"<[^>]+>", " ", rm)
            clean = re.sub(r"&nbsp;", " ", clean)
            clean = re.sub(r"&lt;", "<", clean)
            clean = re.sub(r"&gt;", ">", clean)
            clean = re.sub(r"&amp;", "&", clean)
            clean = re.sub(r"\s+", " ", clean).strip()
            if clean:
                inline_outputs.append(clean)

        if inline_outputs:
            return inline_outputs

        # --- Pass 2: Plain-text fallback ---
        text = html_content.replace("&nbsp;", " ").replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")
        # Strip all HTML tags, leaving plain text
        text = re.sub(r"<[^>]+>", " ", text)
        # Collapse multiple spaces / newlines
        text = re.sub(r"\s+", " ", text)

        # Find all "Output:" matches — re.DOTALL ensures we cross collapsed whitespace
        pattern = r"Output\s*:\s*(.*?)(?=\s*(?:Explanation|Input|Example|Constraints|Note|Output|$))"
        matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
        return [m.strip() for m in matches if m.strip()]

    @classmethod
    def parse_question_data(cls, slug: str, question: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parses the raw GraphQL LeetCode payload and maps it to a unified DTO dictionary.
        Does not perform DB commits or ORM generation directly.
        """
        title = question.get("title", slug.replace("-", " ").title())
        description = question.get("content") or "No description provided."

        # Parse difficulty
        difficulty_str = (question.get("difficulty") or "EASY").upper()
        if difficulty_str == "EASY":
            difficulty = DifficultyEnum.EASY
        elif difficulty_str == "MEDIUM":
            difficulty = DifficultyEnum.MEDIUM
        else:
            difficulty = DifficultyEnum.HARD

        # Parse tags
        tags = []
        for tg_data in question.get("topicTags", []):
            tg_name = tg_data["name"]
            tg_slug = tg_data["slug"].lower()
            std_name = cls.TAG_MAP.get(tg_slug, tg_name)
            tags.append(std_name)

        # Parse snippets
        snippets = question.get("codeSnippets") or []
        py_snippet = next((s for s in snippets if s["langSlug"] == "python3"), None)
        js_snippet = next((s for s in snippets if s["langSlug"] == "javascript"), None)
        cpp_snippet = next((s for s in snippets if s["langSlug"] == "cpp"), None)
        java_snippet = next((s for s in snippets if s["langSlug"] == "java"), None)

        if not py_snippet and not js_snippet:
            # Create a simple default fallback
            py_snippet = {"code": "def solve():\n    pass"}
            js_snippet = {"code": "function solve() {\n    \n}"}

        # Python Template
        func_name = "solve"
        arg_style = "single"
        python_clean_code = ""
        templates_list = []

        if py_snippet:
            raw_code = py_snippet["code"]
            func_name = cls._parse_function_name(raw_code, "python")
            arg_style = cls._parse_arg_style(raw_code, "python", func_name)
            python_clean_code = cls._clean_python_template(raw_code)

            templates_list.append({
                "language": "python",
                "template_code": python_clean_code,
                "function_name": func_name,
                "arg_style": arg_style
            })

        # Javascript Template
        if js_snippet:
            raw_code = js_snippet["code"]
            js_func_name = cls._parse_function_name(raw_code, "javascript")
            js_arg_style = cls._parse_arg_style(raw_code, "javascript", js_func_name)
            if not py_snippet:
                func_name = js_func_name
                arg_style = js_arg_style

            templates_list.append({
                "language": "javascript",
                "template_code": raw_code,
                "function_name": js_func_name,
                "arg_style": js_arg_style
            })

        # C++ Template
        if cpp_snippet:
            templates_list.append({
                "language": "cpp",
                "template_code": cpp_snippet["code"],
                "function_name": func_name,
                "arg_style": arg_style
            })
        elif py_snippet:
            from app.services.code_wrapper_service import CodeWrapperService
            cpp_code = CodeWrapperService.generate_cpp_template(func_name, python_clean_code)
            templates_list.append({
                "language": "cpp",
                "template_code": cpp_code,
                "function_name": func_name,
                "arg_style": arg_style
            })

        # Java Template
        if java_snippet:
            templates_list.append({
                "language": "java",
                "template_code": java_snippet["code"],
                "function_name": func_name,
                "arg_style": arg_style
            })
        elif py_snippet:
            from app.services.code_wrapper_service import CodeWrapperService
            java_code = CodeWrapperService.generate_java_template(func_name, python_clean_code)
            templates_list.append({
                "language": "java",
                "template_code": java_code,
                "function_name": func_name,
                "arg_style": arg_style
            })

        # Determine param count — read it from the actual template signature,
        # not a hardcoded value, so 3-param problems (e.g. Interleaving String)
        # get their inputs grouped correctly.
        num_params = 1
        ref_tpl = next((t for t in templates_list if t["language"] == "python"), None)
        if not ref_tpl:
            ref_tpl = next((t for t in templates_list if t["language"] == "javascript"), None)
        if ref_tpl:
            if ref_tpl["arg_style"] == "positional":
                num_params = cls._parse_param_count(
                    ref_tpl["template_code"],
                    ref_tpl["language"],
                    ref_tpl["function_name"]
                )
            else:
                num_params = 1

        # Parse Example Test Cases
        raw_testcases = question.get("exampleTestcases") or ""
        lines = [line.strip() for line in raw_testcases.strip().split("\n") if line.strip()]

        tc_inputs = []
        i = 0
        while i < len(lines):
            group = lines[i:i+num_params]
            if len(group) == num_params:
                parsed_group = []
                for param in group:
                    try:
                        parsed_group.append(json.loads(param))
                    except Exception:
                        parsed_group.append(param)
                tc_inputs.append(parsed_group)
            i += num_params

        # Fallback if no test cases were parsed
        if not tc_inputs:
            tc_inputs = [[1]]

        expected_outputs = cls._extract_expected_outputs(description)
        # Pad with "null" only up to the number of inputs so we can filter below
        while len(expected_outputs) < len(tc_inputs):
            expected_outputs.append("null")

        PLACEHOLDER_VALUES = {"null", '"null"', '""', ""}

        test_cases_list = []
        for idx, tc_in in enumerate(tc_inputs):
            if arg_style == "positional":
                in_str = json.dumps(tc_in)
            else:
                in_str = json.dumps(tc_in[0])

            out_val = expected_outputs[idx]
            # Skip test cases whose expected output is a placeholder — they would
            # fail validation and produce wrong-answer verdicts in the judge.
            if out_val.strip() in PLACEHOLDER_VALUES:
                continue

            test_cases_list.append({
                "input": in_str,
                "expected_output": out_val,
                "is_sample": True,
                "order_index": idx,
                "weight": 1
            })

        # Re-index order_index sequentially after filtering
        for i, tc in enumerate(test_cases_list):
            tc["order_index"] = i

        # Duplicate to generate 3 hidden test cases (only if we have at least one valid sample)
        sample_len = len(test_cases_list)
        if sample_len > 0:
            for h_idx in range(3):
                ref_case = test_cases_list[h_idx % sample_len]
                test_cases_list.append({
                    "input": ref_case["input"],
                    "expected_output": ref_case["expected_output"],
                    "is_sample": False,
                    "order_index": sample_len + h_idx,
                    "weight": 1
                })

        return {
            "slug": slug,
            "title": title,
            "description": description,
            "difficulty": difficulty,
            "tags": tags,
            "templates": templates_list,
            "test_cases": test_cases_list,
            "hints": question.get("hints", [])
        }
