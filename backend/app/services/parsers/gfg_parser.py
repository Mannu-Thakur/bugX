import re
import json
from typing import Dict, Any, List, Tuple
from app.models.problem import DifficultyEnum

class GFGParser:
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
    def _clean_python_template(raw_code: str) -> Tuple[str, str]:
        class_match = re.search(r"\bclass\s+Solution\b", raw_code)
        search_start = class_match.end() if class_match else 0

        match = None
        for m in re.finditer(r"\bdef\s+([a-zA-Z0-9_]+)\s*\(\s*self\s*(?:,\s*([^)]*))?\)\s*:", raw_code[search_start:]):
            if m.group(1) != "__init__":
                match = m
                break
        if not match:
            for m in re.finditer(r"\bdef\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*:", raw_code[search_start:]):
                if m.group(1) != "__init__":
                    match = m
                    break
        if not match:
            for m in re.finditer(r"\bdef\s+([a-zA-Z0-9_]+)\s*\(\s*self\s*(?:,\s*([^)]*))?\)\s*:", raw_code):
                if m.group(1) != "__init__":
                    match = m
                    break
            if not match:
                for m in re.finditer(r"\bdef\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*:", raw_code):
                    if m.group(1) != "__init__":
                        match = m
                        break

        if not match:
            return raw_code, "solve"
        func_name = match.group(1)

        lines = raw_code.split("\n")
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
                    in_solution_class = False
                else:
                    cleaned_lines.append(line.lstrip())
            else:
                if line.startswith("    "):
                    cleaned_lines.append(line[4:])
                else:
                    cleaned_lines.append(line)

        return "\n".join(cleaned_lines), func_name

    @staticmethod
    def _clean_js_template(raw_code: str) -> Tuple[str, str]:
        match = re.search(r"class\s+Solution\s*\{(?:\s*//.*)*\s*([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\{", raw_code)
        if not match:
            match = re.search(r"([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\{", raw_code)
            if not match:
                return raw_code, "solve"

        func_name = match.group(1)
        params_str = match.group(2) or ""

        lines = raw_code.split("\n")
        cleaned_lines = []
        inside_method = False
        brace_count = 0

        for line in lines:
            if line.strip().startswith("class Solution"):
                continue

            if not inside_method:
                if re.search(fr"\b{func_name}\s*\([^)]*\)\s*\{{", line):
                    inside_method = True
                    brace_count = 1
                    cleaned_lines.append(f"function {func_name}({params_str}) {{")
                    continue
            else:
                brace_count += line.count("{")
                brace_count -= line.count("}")

                if brace_count <= 0:
                    cleaned_lines.append("}")
                    inside_method = False
                    break
                else:
                    if line.startswith("    "):
                        cleaned_lines.append(line[4:])
                    else:
                        cleaned_lines.append(line)

        if not cleaned_lines:
            return raw_code, func_name

        return "\n".join(cleaned_lines), func_name

    @staticmethod
    def _parse_arg_style(code: str, function_name: str) -> str:
        clean_code = "\n".join([line for line in code.split("\n") if not line.strip().startswith("#")])
        match = re.search(fr"def\s+{function_name}\s*\(\s*([^)]*)\)", clean_code)
        if match:
            params_str = match.group(1) or ""
            params = [p.strip() for p in params_str.split(",") if p.strip()]
            return "single" if len(params) <= 1 else "positional"
        return "single"

    @staticmethod
    def _get_param_count(code: str, function_name: str) -> int:
        clean_code = "\n".join([line for line in code.split("\n") if not line.strip().startswith("#")])
        match = re.search(fr"def\s+{function_name}\s*\(\s*([^)]*)\)", clean_code)
        if match:
            params_str = match.group(1) or ""
            params = [p.strip() for p in params_str.split(",") if p.strip()]
            return len(params)
        return 1

    @staticmethod
    def _parse_examples_from_html(html_question: str) -> List[Tuple[str, str]]:
        pre_contents = re.findall(r"<pre.*?>(.*?)</pre>", html_question, re.DOTALL | re.IGNORECASE)
        if not pre_contents:
            pre_contents = [html_question]

        examples = []
        for p in pre_contents:
            clean_text = re.sub(r"<[^>]+>", "", p).strip()
            match = re.search(r"Input:\s*(.*?)\s*Output:\s*(.*?)(?:Explanation:|\Z)", clean_text, re.DOTALL | re.IGNORECASE)
            if match:
                inp_raw = match.group(1).strip()
                out_raw = match.group(2).strip()
                examples.append((inp_raw, out_raw))
            else:
                match = re.search(r"Input:\s*(.*?)\s*Output:\s*(.*)", clean_text, re.DOTALL | re.IGNORECASE)
                if match:
                    inp_raw = match.group(1).strip()
                    out_raw = match.group(2).strip()
                    examples.append((inp_raw, out_raw))
        return examples

    @staticmethod
    def _parse_single_val(val_str: str):
        val_str = val_str.strip()
        if not val_str:
            return ""
        if (val_str.startswith("[") and val_str.endswith("]")) or (val_str.startswith("{") and val_str.endswith("}")) or val_str in ("true", "false", "null") or val_str.replace("-", "", 1).isdigit():
            try:
                return json.loads(val_str)
            except Exception:
                pass
        try:
            if "." in val_str:
                return float(val_str)
            else:
                return int(val_str)
        except ValueError:
            pass
        return val_str

    @classmethod
    def _parse_gfg_input(cls, input_str: str) -> List[Any]:
        pattern = r"[a-zA-Z0-9_\[\]]+\s*=\s*(.*?)(?=\s*,\s*[a-zA-Z0-9_\[\]]+\s*=|\Z)"
        matches = re.findall(pattern, input_str)

        if not matches:
            cleaned = input_str.strip()
            if "," in cleaned and not (cleaned.startswith("[") and cleaned.endswith("]")):
                parts = [p.strip() for p in cleaned.split(",")]
                return [cls._parse_single_val(p) for p in parts]
            return [cls._parse_single_val(cleaned)]

        return [cls._parse_single_val(m) for m in matches]

    @classmethod
    def parse_question_data(cls, slug: str, prob_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parses raw GeeksforGeeks API JSON and maps it to a unified DTO dictionary.
        """
        title = prob_data.get("problem_name", slug.replace("-", " ").title())
        description = prob_data.get("problem_question", "No description provided.")

        # Difficulty Enum mapping
        difficulty_str = (prob_data.get("problem_level_text") or "EASY").upper()
        if difficulty_str == "EASY":
            difficulty = DifficultyEnum.EASY
        elif difficulty_str == "MEDIUM":
            difficulty = DifficultyEnum.MEDIUM
        else:
            difficulty = DifficultyEnum.HARD

        # Parse tags
        topic_tags = prob_data.get("tags", {}).get("topic_tags", [])
        tags = [cls.TAG_MAP.get(t.lower(), t) for t in topic_tags]

        # Parse templates
        extra = prob_data.get("extra", {})
        initial_user_func = extra.get("initial_user_func", {})

        py_snippet = initial_user_func.get("python3", {}).get("user_code", "")
        js_snippet = initial_user_func.get("javascript", {}).get("user_code", "")
        cpp_snippet = initial_user_func.get("cpp", {}).get("user_code", "")
        java_snippet = initial_user_func.get("java", {}).get("user_code", "")

        templates_list = []
        func_name = "solve"
        arg_style = "single"
        python_clean_code = ""

        # Python Template
        if py_snippet:
            python_clean_code, func_name = cls._clean_python_template(py_snippet)
            arg_style = cls._parse_arg_style(python_clean_code, func_name)
            templates_list.append({
                "language": "python",
                "template_code": python_clean_code,
                "function_name": func_name,
                "arg_style": arg_style
            })

        # Javascript Template
        if js_snippet:
            js_clean_code, js_func_name = cls._clean_js_template(js_snippet)
            js_arg_style = "single"
            if py_snippet:
                js_arg_style = arg_style
            else:
                func_name = js_func_name

            templates_list.append({
                "language": "javascript",
                "template_code": js_clean_code,
                "function_name": js_func_name,
                "arg_style": js_arg_style
            })

        # C++ Template
        if cpp_snippet:
            templates_list.append({
                "language": "cpp",
                "template_code": cpp_snippet,
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
                "template_code": java_snippet,
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

        # Determine param count
        num_params = 1
        if py_snippet:
            num_params = cls._get_param_count(python_clean_code, func_name)

        # Parse examples and build test cases
        examples = cls._parse_examples_from_html(description)
        test_cases_list = []

        for idx, (inp_raw, out_raw) in enumerate(examples):
            parsed_in = cls._parse_gfg_input(inp_raw)
            if len(parsed_in) < num_params:
                parsed_in += [None] * (num_params - len(parsed_in))
            elif len(parsed_in) > num_params:
                parsed_in = parsed_in[:num_params]

            if arg_style == "positional":
                in_str = json.dumps(parsed_in)
            else:
                in_str = json.dumps(parsed_in[0])

            parsed_out = cls._parse_single_val(out_raw)
            out_str = json.dumps(parsed_out)

            test_cases_list.append({
                "input": in_str,
                "expected_output": out_str,
                "is_sample": True,
                "order_index": idx,
                "weight": 1
            })

        # Fallback if no test cases parsed
        if not test_cases_list:
            gfg_sample = extra.get("input", "")
            if gfg_sample:
                parsed_in = cls._parse_gfg_input(gfg_sample)
                if arg_style == "positional":
                    in_str = json.dumps(parsed_in)
                else:
                    in_str = json.dumps(parsed_in[0] if parsed_in else None)
            else:
                in_str = "[]" if arg_style == "positional" else "null"

            test_cases_list.append({
                "input": in_str,
                "expected_output": "null",
                "is_sample": True,
                "order_index": 0,
                "weight": 1
            })

        # Add 3 Hidden cases (duplicating samples)
        sample_len = len(test_cases_list)
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
            "hints": []
        }
