"""
Code Wrapper Service — Fully Dynamic, Zero Hardcoding
======================================================

Wraps user-submitted solution code with I/O scaffolding (stdin parsing,
stdout printing) so it can be executed on Judge0 for ANY problem.

Parses method signatures dynamically from the source code — no hardcoded
function-specific invokers.  Works with any new, custom, or imported
problem out of the box.

Supports: Python, JavaScript, C++ (g++17), Java (JDK 17+)
"""

import re
import json
from app.models.problem_template import ArgStyleEnum


class CodeWrapperService:
    """Wraps solution code with input parsing and output printing for Judge0."""

    # ── C++ type → parser expression ──────────────────────────────────
    _CPP_PARSERS = {
        "int":                       "parse_int(cin)",
        "long":                      "parse_int(cin)",
        "long long":                 "parse_int(cin)",
        "double":                    "parse_double(cin)",
        "float":                     "parse_double(cin)",
        "bool":                      "parse_bool(cin)",
        "string":                    "parse_string(cin)",
        "vector<int>":               "parse_vector_int(cin)",
        "vector<double>":            "parse_vector_double(cin)",
        "vector<string>":            "parse_vector_string(cin)",
        "vector<bool>":              "parse_vector_int(cin)",
        "vector<vector<int>>":       "parse_vector_vector_int(cin)",
        "vector<vector<string>>":    "parse_vector_vector_string(cin)",
    }

    # ── Java type → parser expression ─────────────────────────────────
    _JAVA_PARSERS = {
        "int":                  "parser.parseInt()",
        "Integer":              "parser.parseInt()",
        "long":                 "parser.parseLong()",
        "Long":                 "parser.parseLong()",
        "double":               "parser.parseDouble()",
        "Double":               "parser.parseDouble()",
        "float":                "parser.parseFloat()",
        "Float":                "parser.parseFloat()",
        "boolean":              "parser.parseBool()",
        "Boolean":              "parser.parseBool()",
        "char":                 "parser.parseChar()",
        "Character":            "parser.parseChar()",
        "String":               "parser.parseString()",

        # Arrays
        "int[]":                "parser.parseIntArray()",
        "Integer[]":            "parser.parseIntegerArray()",
        "long[]":               "parser.parseLongArray()",
        "Long[]":               "parser.parseLongArray()",
        "double[]":             "parser.parseDoubleArray()",
        "Double[]":             "parser.parseDoubleArray()",
        "float[]":              "parser.parseFloatArray()",
        "Float[]":              "parser.parseFloatArray()",
        "String[]":             "parser.parseStringArray()",
        "char[]":               "parser.parseCharArray()",
        "Character[]":          "parser.parseCharArray()",

        "int[][]":              "parser.parseIntMatrix()",
        "double[][]":           "parser.parseDoubleMatrix()",

        # Lists
        "List<Integer>":        "parser.parseIntegerList()",
        "List<Long>":           "parser.parseLongList()",
        "List<Double>":         "parser.parseDoubleList()",
        "List<Float>":          "parser.parseFloatList()",
        "List<String>":         "parser.parseStringList()",
        "List<Boolean>":        "parser.parseBoolList()",
        "List<Character>":      "parser.parseCharList()",

        # Nested Lists
        "List<List<Integer>>":  "parser.parseIntegerMatrix()",
        "List<List<String>>":   "parser.parseStringMatrix()",
        "List<List<Double>>":   "parser.parseDoubleMatrixList()",
        "List<List<Long>>":     "parser.parseLongMatrixList()",

        # Custom Data Structures
        "TreeNode":             "parser.parseTreeNode()",
        "ListNode":             "parser.parseListNode()",
        "Node":                 "parser.parseNode()",
    }

    # ── Python annotation → C++ type ──────────────────────────────────
    _PY_TO_CPP = {
        "int": "int", "str": "string", "float": "double", "bool": "bool",
        "list[int]": "vector<int>",       "List[int]": "vector<int>",
        "list[str]": "vector<string>",    "List[str]": "vector<string>",
        "list[float]": "vector<double>",  "List[float]": "vector<double>",
        "list[bool]": "vector<bool>",     "List[bool]": "vector<bool>",
        "list[list[int]]": "vector<vector<int>>",
        "List[List[int]]": "vector<vector<int>>",
        "list[list[str]]": "vector<vector<string>>",
        "List[List[str]]": "vector<vector<string>>",
        "list": "vector<int>", "List": "vector<int>",
        # Custom tree/linked-list node types (raw Python type annotation variants)
        "TreeNode": "TreeNode*", "Optional[TreeNode]": "TreeNode*",
        "Node": "Node*",        "Optional[Node]": "Node*",
        "ListNode": "ListNode*", "Optional[ListNode]": "ListNode*",
        # Normalized type keys (returned by _normalize_type) — NOTE: no "list" here
        # because "list" already maps to "vector<int>" above (bare Python list annotation).
        # ListNode is handled by the explicit "ListNode" / "Optional[ListNode]" keys.
        "tree": "TreeNode*", "node": "Node*",
    }

    # ── Python annotation → Java type ─────────────────────────────────
    _PY_TO_JAVA = {
        "int": "int", "str": "String", "float": "double", "bool": "boolean",
        "list[int]": "int[]",             "List[int]": "int[]",
        "list[str]": "String[]",          "List[str]": "String[]",
        "list[float]": "double[]",        "List[float]": "double[]",
        "list[list[int]]": "List<List<Integer>>",
        "List[List[int]]": "List<List<Integer>>",
        "list[list[str]]": "List<List<String>>",
        "List[List[str]]": "List<List<String>>",
        "list": "int[]", "List": "int[]",
        "None": "void",
        # Custom tree/linked-list node types (raw Python type annotation variants)
        "TreeNode": "TreeNode", "Optional[TreeNode]": "TreeNode",
        "Node": "Node",         "Optional[Node]": "Node",
        "ListNode": "ListNode", "Optional[ListNode]": "ListNode",
        # Normalized type keys (returned by _normalize_type)
        "tree": "TreeNode", "node": "Node",
    }

    # ── Default return values ─────────────────────────────────────────
    _CPP_DEFAULTS = {
        "int": "0", "long": "0", "long long": "0",
        "double": "0.0", "float": "0.0f", "bool": "false",
        "string": '""',
    }
    _JAVA_DEFAULTS = {
        "int": "0", "long": "0L", "double": "0.0", "float": "0.0f",
        "boolean": "false", "String": '""',
    }

    @classmethod
    def _normalize_type(cls, t: str) -> str:
        if not t:
            return "int"
        t = t.strip()
        # Strip Python forward-reference quotes: 'Node' -> Node, "TreeNode" -> TreeNode
        if len(t) >= 2 and ((t[0] == "'" and t[-1] == "'") or (t[0] == '"' and t[-1] == '"')):
            t = t[1:-1].strip()
        t = re.sub(r'Optional\s*\[(.*?)\]', r'\1', t)
        t = re.sub(r'Union\s*\[(.*?)\]', r'\1', t)
        t = re.sub(r'(.*?)\s*\|\s*None', r'\1', t)
        t = re.sub(r'None\s*\|\s*(.*?)', r'\1', t)
        t = t.strip()
        # Handle Optional['Node'] style after stripping Optional wrapper
        if len(t) >= 2 and ((t[0] == "'" and t[-1] == "'") or (t[0] == '"' and t[-1] == '"')):
            t = t[1:-1].strip()
        t = t.replace('&', '').replace('*', '').strip()
        t = re.sub(r'\s+', '', t)
        t_lower = t.lower()

        if t == "TreeNode":
            return "tree"
        if t == "Node":
            return "node"
        if t == "ListNode":
            return "list"

        if "vector<vector<" in t_lower or "list[list[" in t_lower or "list<list<" in t_lower or "[][]" in t_lower:
            if "int" in t_lower or "integer" in t_lower:
                return "matrix_int"
            if "str" in t_lower or "string" in t_lower:
                return "matrix_string"
            if "char" in t_lower or "character" in t_lower:
                return "matrix_char"
            if "float" in t_lower or "double" in t_lower:
                return "matrix_float"
            if "bool" in t_lower or "boolean" in t_lower:
                return "matrix_bool"
            return "matrix_any"

        if "vector<" in t_lower or "list[" in t_lower or "list<" in t_lower or "[]" in t_lower or t_lower in ("list", "vector"):
            if "int" in t_lower or "integer" in t_lower:
                return "array_int"
            if "str" in t_lower or "string" in t_lower:
                return "array_string"
            if "char" in t_lower or "character" in t_lower:
                return "array_char"
            if "float" in t_lower or "double" in t_lower:
                return "array_float"
            if "bool" in t_lower or "boolean" in t_lower:
                return "array_bool"
            return "array_any"

        if t_lower in ("int", "integer", "long", "longlong", "longlongint"):
            return "int"
        if t_lower in ("float", "double"):
            return "float"
        if t_lower in ("str", "string"):
            return "string"
        if t_lower in ("bool", "boolean"):
            return "bool"
        if t_lower in ("char", "character"):
            return "char"
        if t_lower in ("void", "none"):
            return "void"

        return "int"

    @classmethod
    def _get_problem_schema(cls, language, source_code, function_name, python_template=None):
        params = []
        return_type = None

        if python_template:
            py_params, py_ret = cls._parse_python_signature(python_template, function_name)
            if py_params:
                params = [(pname, cls._normalize_type(ptype)) for pname, ptype in py_params]
                return_type = cls._normalize_type(py_ret)
                return params, return_type

        if language == "python":
            py_params, py_ret = cls._parse_python_signature(source_code, function_name)
            if py_params:
                params = [(pname, cls._normalize_type(ptype)) for pname, ptype in py_params]
                return_type = cls._normalize_type(py_ret)
        elif language in ("cpp", "c++"):
            cpp_ret, cpp_params = cls._parse_cpp_signature(source_code, function_name)
            if cpp_params:
                params = [(pname, cls._normalize_type(ptype)) for ptype, pname in cpp_params]
                return_type = cls._normalize_type(cpp_ret)
        elif language == "java":
            java_ret, java_params = cls._parse_java_signature(source_code, function_name)
            if java_params:
                params = [(pname, cls._normalize_type(ptype)) for ptype, pname in java_params]
                return_type = cls._normalize_type(java_ret)
        elif language == "javascript":
            js_params = cls._parse_js_parameters(source_code, function_name)
            params = [(pname, "int") for pname in js_params]
            return_type = "int"

        return params, return_type

    @staticmethod
    def _parse_js_parameters(source_code, function_name):
        clean_code = CodeWrapperService._strip_comments(source_code)
        patterns = [
            r'function\s+' + re.escape(function_name) + r'\s*\(([^)]*)\)',
            r'\b' + re.escape(function_name) + r'\s*=\s*function\s*\(([^)]*)\)',
            r'\b' + re.escape(function_name) + r'\s*=\s*\(([^)]*)\)\s*=>',
            r'\b' + re.escape(function_name) + r'\s*=\s*([a-zA-Z0-9_]+)\s*=>',
        ]
        for pattern in patterns:
            match = re.search(pattern, clean_code)
            if match:
                params_str = match.group(1).strip()
                if params_str:
                    return [p.strip() for p in params_str.split(',') if p.strip()]
                return []
        return []

    # ══════════════════════════════════════════════════════════════════
    #  PUBLIC: wrap_code
    # ══════════════════════════════════════════════════════════════════

    @staticmethod
    def wrap_code(
        language: str,
        source_code: str,
        function_name: str,
        arg_style: ArgStyleEnum,
        python_template: str = None,
        debug_mode: bool = False,
    ) -> str:
        if function_name == "__init__":
            # Recover correct function name from python_template or source_code
            correct_name = None
            for template in (python_template, source_code):
                if not template:
                    continue
                class_match = re.search(r"\bclass\s+Solution\b", template)
                search_start = class_match.end() if class_match else 0
                for m in re.finditer(r"\bdef\s+([a-zA-Z0-9_]+)\s*\(", template[search_start:]):
                    if m.group(1) != "__init__":
                        correct_name = m.group(1)
                        break
                if correct_name:
                    break
                for m in re.finditer(r"\bdef\s+([a-zA-Z0-9_]+)\s*\(", template):
                    if m.group(1) != "__init__":
                        correct_name = m.group(1)
                        break
                if correct_name:
                    break
            if correct_name:
                function_name = correct_name

        if language == "python":
            return CodeWrapperService._wrap_python(source_code, function_name, arg_style, python_template, debug_mode)
        elif language == "javascript":
            return CodeWrapperService._wrap_javascript(source_code, function_name, arg_style, python_template, debug_mode)
        elif language in ("cpp", "c++"):
            return CodeWrapperService._wrap_cpp(source_code, function_name, arg_style, python_template, debug_mode)
        elif language == "java":
            return CodeWrapperService._wrap_java(source_code, function_name, arg_style, python_template, debug_mode)
        else:
            raise ValueError(f"Unsupported language: {language}")

    # ══════════════════════════════════════════════════════════════════
    #  PUBLIC: Template generators (for seeder / admin / import)
    # ══════════════════════════════════════════════════════════════════

    @classmethod
    def generate_cpp_template(cls, function_name: str, python_template: str) -> str:
        """Auto-generate a C++ Solution class from a Python function signature."""
        params, return_type = cls._parse_python_signature(python_template, function_name)
        # Normalize type then look up C++ equivalent; fall back to 'int'
        norm_ret = cls._normalize_type(return_type) if return_type else None
        cpp_return = cls._PY_TO_CPP.get(return_type, cls._PY_TO_CPP.get(norm_ret, "int")) if return_type else "void"

        cpp_params = []
        for pname, ptype in params:
            norm_p = cls._normalize_type(ptype)
            cpp_type = cls._PY_TO_CPP.get(ptype, cls._PY_TO_CPP.get(norm_p, "int"))
            ref = "&" if cpp_type.startswith("vector") else ""
            cpp_params.append(f"{cpp_type}{ref} {pname}")

        if cpp_return == "void":
            ret_stmt = ""
        elif cpp_return in cls._CPP_DEFAULTS:
            ret_stmt = f"\n        return {cls._CPP_DEFAULTS[cpp_return]};"
        elif cpp_return.endswith("*"):
            ret_stmt = "\n        return nullptr;"
        else:
            ret_stmt = "\n        return {};"

        params_str = ", ".join(cpp_params)
        return (
            f"class Solution {{\npublic:\n"
            f"    {cpp_return} {function_name}({params_str}) {{\n"
            f"        // Write your solution here{ret_stmt}\n"
            f"    }}\n}};"
        )

    @classmethod
    def generate_java_template(cls, function_name: str, python_template: str) -> str:
        """Auto-generate a Java Solution class from a Python function signature."""
        params, return_type = cls._parse_python_signature(python_template, function_name)
        norm_ret = cls._normalize_type(return_type) if return_type else None
        java_return = cls._PY_TO_JAVA.get(return_type, cls._PY_TO_JAVA.get(norm_ret, "int")) if return_type else "void"

        java_params = []
        for pname, ptype in params:
            norm_p = cls._normalize_type(ptype)
            java_type = cls._PY_TO_JAVA.get(ptype, cls._PY_TO_JAVA.get(norm_p, "int"))
            java_params.append(f"{java_type} {pname}")

        if java_return == "void":
            ret_stmt = ""
        elif java_return in cls._JAVA_DEFAULTS:
            ret_stmt = f"\n        return {cls._JAVA_DEFAULTS[java_return]};"
        elif java_return.endswith("[]"):
            base = java_return[:-2]
            ret_stmt = f"\n        return new {base}[0];"
        elif java_return.startswith("List"):
            ret_stmt = "\n        return new ArrayList<>();"
        elif java_return in ("TreeNode", "Node", "ListNode"):
            ret_stmt = "\n        return null;"
        else:
            ret_stmt = "\n        return null;"

        params_str = ", ".join(java_params)
        return (
            f"class Solution {{\n"
            f"    public {java_return} {function_name}({params_str}) {{\n"
            f"        // Write your solution here{ret_stmt}\n"
            f"    }}\n}}"
        )

    # ══════════════════════════════════════════════════════════════════
    #  PRIVATE: Python & JavaScript wrappers (unchanged)
    # ══════════════════════════════════════════════════════════════════

    @staticmethod
    def _detect_python_class(source_code, function_name):
        """Detect if function_name is a method inside a class (e.g. class Solution).
        Skips data structure classes like Node, TreeNode, ListNode."""
        # Strip python comments first to avoid matching commented-out classes like '# class TreeNode:'
        clean_code = "\n".join([line for line in source_code.split("\n") if not line.strip().startswith("#")])
        # Iterate all class definitions - find the one that contains function_name as a method
        for class_match in re.finditer(r'class\s+(\w+)\s*[:(]', clean_code):
            class_name = class_match.group(1)
            # Skip known data structure classes - they are not the solution class
            if class_name in ('Node', 'TreeNode', 'ListNode'):
                continue
            # Check if function_name is a method of this class (has self param)
            method_pattern = r'def\s+' + re.escape(function_name) + r'\s*\(\s*self\b'
            if re.search(method_pattern, clean_code[class_match.start():]):
                return class_name
        return None

    @classmethod
    def _wrap_python(cls, source_code, function_name, arg_style, python_template=None, debug_mode=False):
        # Strip triple-quoted comment blocks that define helper classes.
        # Replace the entire block with an empty string to avoid unterminated string literals.
        source_code = re.sub(r'"""[\s\S]*?\bclass\s+(?:Node|TreeNode|ListNode)\b[\s\S]*?"""', '', source_code)
        source_code = re.sub(r"'''[\s\S]*?\bclass\s+(?:Node|TreeNode|ListNode)\b[\s\S]*?'''", '', source_code)
        # Also strip any standalone triple-quoted blocks (e.g. LeetCode hint blocks with class defs)
        # that may remain and cause SyntaxError from unterminated string literals.
        source_code = re.sub(r'(?m)^[ \t]*"""[\s\S]*?"""[ \t]*\n?', '', source_code)
        source_code = re.sub(r"(?m)^[ \t]*'''[\s\S]*?'''[ \t]*\n?", '', source_code)
        # Strip user-defined Node/TreeNode/ListNode class definitions (helpers provide canonical versions)
        source_code = re.sub(
            r'^class\s+(?:Node|TreeNode|ListNode)\s*(?:\(.*?\))?\s*:.*?(?=^class\s|\Z)',
            '', source_code, flags=re.DOTALL | re.MULTILINE
        )
        # Detect class-based solutions
        class_name = cls._detect_python_class(source_code, function_name)
        call_prefix = f"{class_name}().{function_name}" if class_name else function_name

        params, return_type = cls._get_problem_schema("python", source_code, function_name, python_template)

        is_pos = (arg_style == ArgStyleEnum.positional)
        is_single = (arg_style == ArgStyleEnum.single)
        is_kwargs = (arg_style == ArgStyleEnum.kwargs)

        # Generate parsing logic
        parsing_code = ""
        conversion_path = []
        if is_single:
            if params:
                pname, ptype = params[0]
                if ptype == "tree":
                    parsing_code = "data = parse_TreeNode(data)"
                    conversion_path.append(f"{pname}: tree -> TreeNode")
                elif ptype == "node":
                    parsing_code = "data = parse_Node(data)"
                    conversion_path.append(f"{pname}: node -> Node")
                elif ptype == "list":
                    parsing_code = "data = parse_ListNode(data)"
                    conversion_path.append(f"{pname}: list -> ListNode")
                else:
                    conversion_path.append(f"{pname}: passthrough")
        elif is_pos:
            parsing_lines = []
            for i, (pname, ptype) in enumerate(params):
                if ptype == "tree":
                    parsing_lines.append(f"if len(args) > {i}: args[{i}] = parse_TreeNode(args[{i}])")
                    conversion_path.append(f"param {i} ({pname}): tree -> TreeNode")
                elif ptype == "node":
                    parsing_lines.append(f"if len(args) > {i}: args[{i}] = parse_Node(args[{i}])")
                    conversion_path.append(f"param {i} ({pname}): node -> Node")
                elif ptype == "list":
                    parsing_lines.append(f"if len(args) > {i}: args[{i}] = parse_ListNode(args[{i}])")
                    conversion_path.append(f"param {i} ({pname}): list -> ListNode")
                else:
                    conversion_path.append(f"param {i} ({pname}): passthrough")
            if parsing_lines:
                parsing_code = "\n        ".join(parsing_lines)
        elif is_kwargs:
            parsing_lines = []
            for pname, ptype in params:
                if ptype == "tree":
                    parsing_lines.append(f"if '{pname}' in data: data['{pname}'] = parse_TreeNode(data['{pname}'])")
                    conversion_path.append(f"{pname}: tree -> TreeNode")
                elif ptype == "node":
                    parsing_lines.append(f"if '{pname}' in data: data['{pname}'] = parse_Node(data['{pname}'])")
                    conversion_path.append(f"{pname}: node -> Node")
                elif ptype == "list":
                    parsing_lines.append(f"if '{pname}' in data: data['{pname}'] = parse_ListNode(data['{pname}'])")
                    conversion_path.append(f"{pname}: list -> ListNode")
                else:
                    conversion_path.append(f"{pname}: passthrough")
            if parsing_lines:
                parsing_code = "\n        ".join(parsing_lines)

        # Return value serialization
        serialize_code = "result"
        if return_type:
            if return_type == "tree":
                serialize_code = "serialize_TreeNode(result)"
                conversion_path.append("return: TreeNode -> tree")
            elif return_type == "node":
                serialize_code = "serialize_Node(result)"
                conversion_path.append("return: Node -> node")
            elif return_type == "list":
                serialize_code = "serialize_ListNode(result)"
                conversion_path.append("return: ListNode -> list")
            else:
                conversion_path.append("return: passthrough")

        schema_json = json.dumps([(pname, ptype) for pname, ptype in params])
        conversion_path_str = " | ".join(conversion_path)

        helpers = """import json, sys
from typing import List, Dict, Tuple, Set, Optional, Union, Any

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class Node:
    def __init__(self, val=0, left=None, right=None, next=None):
        self.val = val
        self.left = left
        self.right = right
        self.next = next


def parse_ListNode(data):
    if not data or not isinstance(data, list):
        return None
    head = ListNode(data[0])
    curr = head
    for val in data[1:]:
        curr.next = ListNode(val)
        curr = curr.next
    return head

def serialize_ListNode(node):
    res = []
    curr = node
    while curr:
        res.append(curr.val)
        curr = curr.next
    return res

def parse_TreeNode(data):
    if not data or not isinstance(data, list) or data[0] is None:
        return None
    root = TreeNode(data[0])
    queue = [root]
    i = 1
    while queue and i < len(data):
        curr = queue.pop(0)
        if i < len(data):
            if data[i] is not None:
                curr.left = TreeNode(data[i])
                queue.append(curr.left)
            i += 1
        if i < len(data):
            if data[i] is not None:
                curr.right = TreeNode(data[i])
                queue.append(curr.right)
            i += 1
    return root

def serialize_TreeNode(root):
    if not root:
        return []
    res = []
    queue = [root]
    while queue:
        curr = queue.pop(0)
        if curr:
            res.append(curr.val)
            queue.append(curr.left)
            queue.append(curr.right)
        else:
            res.append(None)
    while res and res[-1] is None:
        res.pop()
    return res

def parse_Node(data):
    if not data or not isinstance(data, list) or data[0] is None:
        return None
    root = Node(data[0])
    queue = [root]
    i = 1
    while queue and i < len(data):
        curr = queue.pop(0)
        if i < len(data):
            if data[i] is not None:
                curr.left = Node(data[i])
                queue.append(curr.left)
            i += 1
        if i < len(data):
            if data[i] is not None:
                curr.right = Node(data[i])
                queue.append(curr.right)
            i += 1
    return root

def serialize_Node(root):
    if not root:
        return []
    res = []
    level_start = root
    while level_start:
        curr = level_start
        next_level_start = None
        while curr:
            res.append(curr.val)
            if not next_level_start:
                if curr.left:
                    next_level_start = curr.left
                elif curr.right:
                    next_level_start = curr.right
            curr = curr.next
        res.append("#")
        level_start = next_level_start
    return res
"""

        diagnostics_pre = ""
        diagnostics_post = ""
        if debug_mode:
            # Use repr() to safely embed strings as valid Python literals,
            # avoiding SyntaxError from quotes/backslashes in schema_json.
            safe_schema = repr(schema_json)
            safe_conv = repr(conversion_path_str)
            diagnostics_pre = f"""
        sys.stderr.write("[DIAGNOSTICS] Language: python\\n")
        sys.stderr.write("[DIAGNOSTICS] Parameter Schema: " + {safe_schema} + "\\n")
        sys.stderr.write("[DIAGNOSTICS] Conversion Path: " + {safe_conv} + "\\n")
        sys.stderr.write("[DIAGNOSTICS] Serialized Input: " + json.dumps(args if {is_pos} else data) + "\\n")
"""
            diagnostics_post = """
        sys.stderr.write("[DIAGNOSTICS] Serialized Output: " + json.dumps(serialized_result) + "\\n")
"""

        if is_kwargs:
            main_block = f"""
if __name__ == "__main__":
    try:
        data = json.loads(sys.stdin.read())
        args = data
        {diagnostics_pre}
        {parsing_code}
        result = {call_prefix}(**data)
        serialized_result = {serialize_code}
        {diagnostics_post}
        print(json.dumps(serialized_result))
    except Exception as e:
        sys.stderr.write(f"[WRAPPER_EXCEPTION] {{type(e).__name__}}: {{str(e)}}\\n")
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
"""
        elif is_single:
            main_block = f"""
if __name__ == "__main__":
    try:
        data = json.loads(sys.stdin.read())
        args = data
        {diagnostics_pre}
        {parsing_code}
        result = {call_prefix}(data)
        serialized_result = {serialize_code}
        {diagnostics_post}
        print(json.dumps(serialized_result))
    except Exception as e:
        sys.stderr.write(f"[WRAPPER_EXCEPTION] {{type(e).__name__}}: {{str(e)}}\\n")
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
"""
        elif is_pos:
            main_block = f"""
if __name__ == "__main__":
    try:
        args = json.loads(sys.stdin.read())
        data = args
        {diagnostics_pre}
        {parsing_code}
        result = {call_prefix}(*args)
        serialized_result = {serialize_code}
        {diagnostics_post}
        print(json.dumps(serialized_result))
    except Exception as e:
        sys.stderr.write(f"[WRAPPER_EXCEPTION] {{type(e).__name__}}: {{str(e)}}\\n")
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
"""
        else:
            raise ValueError(f"Unknown arg_style {arg_style} for python")

        return f"""{helpers}
{source_code}
{main_block}
"""

    @staticmethod
    def _detect_js_class(source_code, function_name):
        """Detect if function_name is a method inside a JS/TS class.
        Finds the class that CONTAINS the function as a method, skipping data structure classes."""
        # Strip comments first to avoid matching commented-out classes
        clean_code = CodeWrapperService._strip_comments(source_code)
        # Iterate all class definitions — find the one that contains function_name
        for class_match in re.finditer(r'class\s+(\w+)\s*\{', clean_code):
            class_name = class_match.group(1)
            # Skip known data structure classes — they are not the solution class
            if class_name in ('Node', 'TreeNode', 'ListNode'):
                continue
            # Check if function_name appears as a method inside the code starting at this class
            method_pattern = r'\b' + re.escape(function_name) + r'\s*\('
            if re.search(method_pattern, clean_code[class_match.start():]):
                return class_name
        return None

    @classmethod
    def _wrap_javascript(cls, source_code, function_name, arg_style, python_template=None, debug_mode=False):
        # Strip LeetCode-style comment blocks defining Node/TreeNode/ListNode
        source_code = re.sub(
            r'/\*\*?\s*\*?\s*Definition for .*?\*/\s*',
            '', source_code, flags=re.DOTALL
        )
        # Strip user-defined Node/TreeNode/ListNode class definitions (helpers provide canonical ones)
        source_code = re.sub(
            r'class\s+(?:Node|TreeNode|ListNode)\s*\{.*?\}\s*',
            '', source_code, flags=re.DOTALL
        )
        # Detect class-based solutions
        class_name = cls._detect_js_class(source_code, function_name)
        call_prefix = f"new {class_name}().{function_name}" if class_name else function_name

        # For JavaScript we cannot parse types from untyped JS — always use the Python template
        # for schema (param types, return type) so Node/TreeNode/ListNode problems work correctly.
        params, return_type = cls._get_problem_schema("javascript", source_code, function_name, python_template)
        # If JS-only schema gave us all-int types but python_template has better info, prefer python_template
        if python_template and all(ptype == "int" for _, ptype in params):
            py_params, py_ret = cls._parse_python_signature(python_template, function_name)
            if py_params:
                params = [(pname, cls._normalize_type(ptype)) for pname, ptype in py_params]
                return_type = cls._normalize_type(py_ret)

        is_pos = (arg_style == ArgStyleEnum.positional)
        is_single = (arg_style == ArgStyleEnum.single)

        # Generate parsing logic
        parsing_code = ""
        conversion_path = []
        if is_single:
            if params:
                pname, ptype = params[0]
                if ptype == "tree":
                    parsing_code = "data = parse_TreeNode(data);"
                    conversion_path.append(f"{pname}: tree -> TreeNode")
                elif ptype == "node":
                    parsing_code = "data = parse_Node(data);"
                    conversion_path.append(f"{pname}: node -> Node")
                elif ptype == "list":
                    parsing_code = "data = parse_ListNode(data);"
                    conversion_path.append(f"{pname}: list -> ListNode")
                else:
                    conversion_path.append(f"{pname}: passthrough")
        elif is_pos:
            parsing_lines = []
            for i, (pname, ptype) in enumerate(params):
                if ptype == "tree":
                    parsing_lines.append(f"if (args.length > {i}) args[{i}] = parse_TreeNode(args[{i}]);")
                    conversion_path.append(f"param {i} ({pname}): tree -> TreeNode")
                elif ptype == "node":
                    parsing_lines.append(f"if (args.length > {i}) args[{i}] = parse_Node(args[{i}]);")
                    conversion_path.append(f"param {i} ({pname}): node -> Node")
                elif ptype == "list":
                    parsing_lines.append(f"if (args.length > {i}) args[{i}] = parse_ListNode(args[{i}]);")
                    conversion_path.append(f"param {i} ({pname}): list -> ListNode")
                else:
                    conversion_path.append(f"param {i} ({pname}): passthrough")
            if parsing_lines:
                parsing_code = "\n    ".join(parsing_lines)

        # Return value serialization
        serialize_code = "result"
        if return_type:
            if return_type == "void":
                serialize_code = "null"
                conversion_path.append("return: void -> null")
            elif return_type == "tree":
                serialize_code = "serialize_TreeNode(result)"
                conversion_path.append("return: TreeNode -> tree")
            elif return_type == "node":
                serialize_code = "serialize_Node(result)"
                conversion_path.append("return: Node -> node")
            elif return_type == "list":
                serialize_code = "serialize_ListNode(result)"
                conversion_path.append("return: ListNode -> list")
            else:
                conversion_path.append("return: passthrough")

        schema_json = json.dumps([(pname, ptype) for pname, ptype in params])
        conversion_path_str = " | ".join(conversion_path)

        helpers = """const fs = require('fs');

class ListNode {
    constructor(val, next) {
        this.val = (val===undefined ? 0 : val);
        this.next = (next===undefined ? null : next);
    }
}

class TreeNode {
    constructor(val, left, right) {
        this.val = (val===undefined ? 0 : val);
        this.left = (left===undefined ? null : left);
        this.right = (right===undefined ? null : right);
    }
}

class Node {
    constructor(val, left, right, next) {
        this.val = (val===undefined ? 0 : val);
        this.left = (left===undefined ? null : left);
        this.right = (right===undefined ? null : right);
        this.next = (next===undefined ? null : next);
    }
}


function parse_ListNode(data) {
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    let head = new ListNode(data[0]);
    let curr = head;
    for (let i = 1; i < data.length; i++) {
        curr.next = new ListNode(data[i]);
        curr = curr.next;
    }
    return head;
}

function serialize_ListNode(node) {
    let res = [];
    let curr = node;
    while (curr) {
        res.push(curr.val);
        curr = curr.next;
    }
    return res;
}

function parse_TreeNode(data) {
    if (!data || !Array.isArray(data) || data.length === 0 || data[0] === null) return null;
    let root = new TreeNode(data[0]);
    let queue = [root];
    let i = 1;
    while (queue.length > 0 && i < data.length) {
        let curr = queue.shift();
        if (i < data.length) {
            if (data[i] !== null) {
                curr.left = new TreeNode(data[i]);
                queue.push(curr.left);
            }
            i++;
        }
        if (i < data.length) {
            if (data[i] !== null) {
                curr.right = new TreeNode(data[i]);
                queue.push(curr.right);
            }
            i++;
        }
    }
    return root;
}

function parse_Node(data) {
    if (!data || !Array.isArray(data) || data.length === 0 || data[0] === null) return null;
    let root = new Node(data[0]);
    let queue = [root];
    let i = 1;
    while (queue.length > 0 && i < data.length) {
        let curr = queue.shift();
        if (i < data.length) {
            if (data[i] !== null) {
                curr.left = new Node(data[i]);
                queue.push(curr.left);
            }
            i++;
        }
        if (i < data.length) {
            if (data[i] !== null) {
                curr.right = new Node(data[i]);
                queue.push(curr.right);
            }
            i++;
        }
    }
    return root;
}

function serialize_Node(root) {
    if (!root) return [];
    let res = [];
    let level_start = root;
    while (level_start) {
        let curr = level_start;
        let next_level_start = null;
        while (curr) {
            res.push(curr.val);
            if (!next_level_start) {
                if (curr.left) next_level_start = curr.left;
                else if (curr.right) next_level_start = curr.right;
            }
            curr = curr.next;
        }
        res.push("#");
        level_start = next_level_start;
    }
    return res;
}

function serialize_TreeNode(root) {
    if (!root) return [];
    let res = [];
    let queue = [root];
    while (queue.length > 0) {
        let curr = queue.shift();
        if (curr) {
            res.push(curr.val);
            queue.push(curr.left);
            queue.push(curr.right);
        } else {
            res.push(null);
        }
    }
    while (res.length > 0 && res[res.length - 1] === null) {
        res.pop();
    }
    return res;
}
"""

        diagnostics_pre = ""
        diagnostics_post = ""
        if debug_mode:
            # Use json.dumps() to produce properly escaped JS string literals,
            # avoiding SyntaxError from quotes in schema_json.
            safe_schema_js = json.dumps(schema_json)
            safe_conv_js = json.dumps(conversion_path_str)
            diagnostics_pre = f"""
        console.error("[DIAGNOSTICS] Language: javascript");
        console.error("[DIAGNOSTICS] Parameter Schema: " + {safe_schema_js});
        console.error("[DIAGNOSTICS] Conversion Path: " + {safe_conv_js});
        console.error("[DIAGNOSTICS] Serialized Input: " + JSON.stringify(args || data));
"""
            diagnostics_post = """
        console.error("[DIAGNOSTICS] Serialized Output: " + JSON.stringify(serialized_result));
"""

        if arg_style == ArgStyleEnum.kwargs:
            # JavaScript has no native kwargs. Gracefully fall back to treating the
            # input as a single JSON object passed directly to the function.
            # This matches how most JS solutions handle object-argument problems.
            main_block = f"""
try {{
    let data = JSON.parse(fs.readFileSync(0, 'utf8'));
    let args = null;
    {diagnostics_pre}
    {parsing_code}
    const result = {call_prefix}(data);
    const serialized_result = {serialize_code};
    {diagnostics_post}
    console.log(JSON.stringify(serialized_result));
}} catch (e) {{
    console.error("[WRAPPER_EXCEPTION] " + e.name + ": " + e.message);
    console.error(e.stack);
    process.exit(1);
}}
"""
        elif is_single:
            main_block = f"""
try {{
    let data = JSON.parse(fs.readFileSync(0, 'utf8'));
    let args = null;
    {diagnostics_pre}
    {parsing_code}
    const result = {call_prefix}(data);
    const serialized_result = {serialize_code};
    {diagnostics_post}
    console.log(JSON.stringify(serialized_result));
}} catch (e) {{
    console.error("[WRAPPER_EXCEPTION] " + e.name + ": " + e.message);
    console.error(e.stack);
    process.exit(1);
}}
"""
        elif is_pos:
            main_block = f"""
try {{
    let args = JSON.parse(fs.readFileSync(0, 'utf8'));
    let data = null;
    {diagnostics_pre}
    {parsing_code}
    const result = {call_prefix}(...args);
    const serialized_result = {serialize_code};
    {diagnostics_post}
    console.log(JSON.stringify(serialized_result));
}} catch (e) {{
    console.error("[WRAPPER_EXCEPTION] " + e.name + ": " + e.message);
    console.error(e.stack);
    process.exit(1);
}}
"""
        else:
            raise ValueError(f"Unknown arg_style {arg_style} for javascript")

        return f"""{helpers}
{source_code}
{main_block}
"""

    # ══════════════════════════════════════════════════════════════════
    #  PRIVATE: C++ wrapper
    # ══════════════════════════════════════════════════════════════════

    @classmethod
    def _wrap_cpp(cls, source_code, function_name, arg_style, python_template=None, debug_mode=False):
        # Strip LeetCode-style definition comment blocks for TreeNode/ListNode/Node
        source_code = re.sub(
            r'/\*\*?\s*\*?\s*Definition for .*?\*/\s*',
            '', source_code, flags=re.DOTALL
        )
        # Strip actual struct/class definitions for data structures that the wrapper already provides.
        # Use a pattern that handles nested braces by matching until the final "};"
        source_code = re.sub(
            r'struct\s+(?:TreeNode|ListNode|Node)\s*\{.*?\};\s*',
            '', source_code, flags=re.DOTALL
        )
        # Also strip class-based definitions for these types
        source_code = re.sub(
            r'class\s+(?:Node|TreeNode|ListNode)\s*\{.*?\};\s*',
            '', source_code, flags=re.DOTALL
        )
        # Strip #include directives
        source_code = re.sub(r'^\s*#include\s*<[^>]+>\s*$', '', source_code, flags=re.MULTILINE)
        source_code = re.sub(r'^\s*using\s+namespace\s+std\s*;\s*$', '', source_code, flags=re.MULTILINE)
        source_code = re.sub(r'\n{3,}', '\n\n', source_code).strip()

        invoker = cls._build_cpp_invoker(function_name, arg_style, source_code, python_template, debug_mode)
        return f"""#include <iostream>
#include <string>
#include <vector>
#include <sstream>
#include <cctype>
#include <algorithm>
#include <map>
#include <set>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <stack>
#include <climits>
#include <cmath>
#include <numeric>
#include <functional>
#include <stdexcept>
using namespace std;

{_CPP_IO_HELPERS}

{source_code}

int main() {{
    try {{
{invoker}
    }} catch (const std::exception& e) {{
        std::cerr << "[WRAPPER_EXCEPTION] std::exception: " << e.what() << "\\n";
        return 1;
    }} catch (...) {{
        std::cerr << "[WRAPPER_EXCEPTION] Unknown exception\\n";
        return 1;
    }}
    return 0;
}}
"""

    # ══════════════════════════════════════════════════════════════════
    #  PRIVATE: Java wrapper
    # ══════════════════════════════════════════════════════════════════

    @classmethod
    def _wrap_java(cls, source_code, function_name, arg_style, python_template=None, debug_mode=False):
        # Strip LeetCode-style definition comment blocks for TreeNode/ListNode/Node
        source_code = re.sub(
            r'/\*\*?\s*\*?\s*Definition for .*?\*/\s*',
            '', source_code, flags=re.DOTALL
        )
        # Strip user-defined Node/TreeNode/ListNode class definitions (wrapper provides canonical ones)
        source_code = re.sub(
            r'class\s+(?:Node|TreeNode|ListNode)\s*\{.*?\}\s*',
            '', source_code, flags=re.DOTALL
        )
        # Strip 'public' modifier from all class declarations so they can compile in Main.java
        source_code = re.sub(r'\bpublic\s+class\b', 'class', source_code)
        invoker = cls._build_java_invoker(function_name, arg_style, source_code, python_template, debug_mode)
        return f"""import java.util.*;
import java.io.*;

{source_code}

public class Main {{
{_JAVA_IO_HELPERS}

    public static void main(String[] args) throws Exception {{
        try {{
            BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) {{
                sb.append(line).append("\\n");
            }}
            SimpleParser parser = new SimpleParser(sb.toString());
            Solution sol = new Solution();
{invoker}
        }} catch (Throwable t) {{
            System.err.println("[WRAPPER_EXCEPTION] " + t.getClass().getName() + ": " + t.getMessage());
            t.printStackTrace(System.err);
            System.exit(1);
        }}
    }}
}}

class TreeNode {{
    public int val;
    public TreeNode left;
    public TreeNode right;
    public TreeNode() {{}}
    public TreeNode(int val) {{ this.val = val; }}
    public TreeNode(int val, TreeNode left, TreeNode right) {{
        this.val = val;
        this.left = left;
        this.right = right;
    }}
}}

class ListNode {{
    public int val;
    public ListNode next;
    public ListNode() {{}}
    public ListNode(int val) {{ this.val = val; }}
    public ListNode(int val, ListNode next) {{ this.val = val; this.next = next; }}
}}

class Node {{
    public int val;
    public Node left;
    public Node right;
    public Node next;
    public Node() {{}}
    public Node(int val) {{ this.val = val; }}
    public Node(int val, Node left, Node right) {{
        this.val = val;
        this.left = left;
        this.right = right;
    }}
    public Node(int val, Node next) {{
        this.val = val;
        this.next = next;
    }}
}}
"""

    # ══════════════════════════════════════════════════════════════════
    #  Signature Parsers
    # ══════════════════════════════════════════════════════════════════

    @staticmethod
    def _strip_comments(source_code):
        # Strip multi-line comments /* ... */
        code = re.sub(r'/\*.*?\*/', '', source_code, flags=re.DOTALL)
        # Strip single-line comments // ...
        code = re.sub(r'//.*', '', code)
        return code

    @staticmethod
    def _parse_python_signature(python_code, function_name):
        """Extract ([(name, type), ...], return_type_str) from a Python def."""
        clean_code = "\n".join([line for line in python_code.split("\n") if not line.strip().startswith("#")])
        pattern = r'def\s+' + re.escape(function_name) + r'\s*\(([^)]*)\)\s*(?:->\s*(.+?))?\s*:'
        match = re.search(pattern, clean_code)
        if not match:
            return [], None
        params_raw = match.group(1).strip()
        ret_raw = match.group(2).strip() if match.group(2) else None
        params = []
        if params_raw:
            for p in params_raw.split(','):
                p = p.strip()
                if p in ('self', 'cls') or not p:
                    continue
                if ':' in p:
                    name, ptype = p.split(':', 1)
                    params.append((name.strip(), ptype.strip()))
                else:
                    params.append((p, 'int'))
        return params, ret_raw

    @staticmethod
    def _parse_cpp_signature(source_code, function_name):
        """Extract (return_type, [(type, name), ...]) from C++ source."""
        clean_code = CodeWrapperService._strip_comments(source_code)
        fn_pat = re.escape(function_name) + r'\s*\('
        match = re.search(fn_pat, clean_code)
        if not match:
            return None, None
        fn_start = match.start()

        # Return type: everything before function_name on same line
        before = clean_code[:fn_start].rstrip()
        last_sep = max(before.rfind('\n'), before.rfind('{'), before.rfind(';'), before.rfind(':'))
        ret_raw = before[last_sep + 1:].strip() if last_sep >= 0 else before.strip()
        for kw in ('public', 'private', 'protected', 'static', 'virtual', 'inline', 'constexpr'):
            ret_raw = re.sub(r'\b' + kw + r'\b', '', ret_raw)
        ret_raw = ret_raw.strip().strip(':').strip()
        if not ret_raw:
            return None, None
        ret_type = CodeWrapperService._normalize_cpp_type(ret_raw)

        # Parameters
        paren_start = match.end() - 1
        depth, i = 1, paren_start + 1
        while i < len(clean_code) and depth > 0:
            if clean_code[i] == '(':
                depth += 1
            elif clean_code[i] == ')':
                depth -= 1
            i += 1
        params_str = clean_code[paren_start + 1:i - 1].strip()
        params = CodeWrapperService._split_typed_params(params_str, 'cpp')
        return ret_type, params

    @staticmethod
    def _parse_java_signature(source_code, function_name):
        """Extract (return_type, [(type, name), ...]) from Java source."""
        clean_code = CodeWrapperService._strip_comments(source_code)
        fn_pat = re.escape(function_name) + r'\s*\('
        match = re.search(fn_pat, clean_code)
        if not match:
            return None, None
        fn_start = match.start()

        before = clean_code[:fn_start].rstrip()
        last_sep = max(before.rfind('\n'), before.rfind('{'), before.rfind(';'))
        ret_raw = before[last_sep + 1:].strip() if last_sep >= 0 else before.strip()
        for kw in ('public', 'private', 'protected', 'static', 'abstract', 'final', 'synchronized'):
            ret_raw = re.sub(r'\b' + kw + r'\b', '', ret_raw)
        ret_raw = ret_raw.strip()
        if not ret_raw:
            return None, None

        paren_start = match.end() - 1
        depth, i = 1, paren_start + 1
        while i < len(clean_code) and depth > 0:
            if clean_code[i] == '(':
                depth += 1
            elif clean_code[i] == ')':
                depth -= 1
            i += 1
        params_str = clean_code[paren_start + 1:i - 1].strip()
        params = CodeWrapperService._split_typed_params(params_str, 'java')
        return ret_raw, params

    @staticmethod
    def _split_typed_params(params_str, lang):
        """Split 'type1 name1, type2 name2' respecting <> nesting."""
        if not params_str:
            return []
        parts, depth, cur = [], 0, ""
        for ch in params_str:
            if ch == '<':
                depth += 1
                cur += ch
            elif ch == '>':
                depth -= 1
                cur += ch
            elif ch == ',' and depth == 0:
                parts.append(cur.strip())
                cur = ""
            else:
                cur += ch
        if cur.strip():
            parts.append(cur.strip())

        result = []
        for part in parts:
            if not part:
                continue
            name_m = re.search(r'(\w+)\s*$', part)
            if name_m:
                name = name_m.group(1)
                type_raw = part[:name_m.start()].strip()
                if lang == 'cpp':
                    type_raw = CodeWrapperService._normalize_cpp_type(type_raw)
                else:
                    type_raw = re.sub(r'\s+', ' ', type_raw).strip()
                result.append((type_raw, name))
        return result

    # Node/tree/list types that should keep their pointer (*) nature
    _CPP_POINTER_TYPES = {'TreeNode', 'ListNode', 'Node'}

    @classmethod
    def _normalize_cpp_type(cls, raw):
        """Remove const, &, * from a C++ type, normalise whitespace.
        Preserves * for known pointer types (TreeNode, ListNode, Node)."""
        r = raw.strip()
        r = re.sub(r'\bconst\b', '', r)
        r = r.replace('&', '')
        # Check if the base type (before *) is a known pointer type
        base = r.replace('*', '').strip()
        base = re.sub(r'\s+', ' ', base).strip()
        if base in cls._CPP_POINTER_TYPES:
            return base + '*'
        r = r.replace('*', '')
        r = re.sub(r'\s+', ' ', r).strip()
        return r

    # ══════════════════════════════════════════════════════════════════
    #  Invoker Builders — Fully Dynamic
    # ══════════════════════════════════════════════════════════════════

    @classmethod
    def _build_cpp_invoker(cls, function_name, arg_style, source_code, python_template=None, debug_mode=False):
        """Generate the C++ main() body dynamically from the parsed signature."""
        ret_type, params = cls._parse_cpp_signature(source_code, function_name)

        # Fallback to python template signature if parsing C++ signature failed
        if (ret_type is None or params is None) and python_template:
            py_params, py_ret = cls._parse_python_signature(python_template, function_name)
            if py_params:
                ret_type = cls._PY_TO_CPP.get(py_ret, "int") if py_ret else "void"
                params = []
                for pname, ptype in py_params:
                    cpp_type = cls._PY_TO_CPP.get(ptype, "int")
                    params.append((cpp_type, pname))

        # Strip C++ comments to avoid matching commented-out classes
        clean_code = cls._strip_comments(source_code)
        has_class = bool(re.search(r'\bclass\s+\w+', clean_code))
        class_name = 'Solution'
        if has_class:
            # Find the class that isn't a data structure
            for cm in re.finditer(r'\bclass\s+(\w+)', clean_code):
                cname = cm.group(1)
                if cname not in ('Node', 'TreeNode', 'ListNode'):
                    class_name = cname
                    break

        if ret_type is None or params is None:
            return cls._cpp_fallback_invoker(function_name, arg_style, has_class, class_name)

        lines = []

        # Diagnostics Logging
        if debug_mode:
            schema_json = json.dumps([(pname, cls._normalize_type(ptype)) for ptype, pname in params])
            conversion_path = []
            for i, (ptype, pname) in enumerate(params):
                ptype_norm = cls._normalize_type(ptype)
                conversion_path.append(f"param {i} ({pname}): {ptype_norm}")
            ret_type_norm = cls._normalize_type(ret_type)
            conversion_path.append(f"return: {ret_type_norm}")
            conversion_path_str = " | ".join(conversion_path)

            lines.append(f'    std::cerr << "[DIAGNOSTICS] Language: cpp\\n";')
            lines.append(f'    std::cerr << "[DIAGNOSTICS] Parameter Schema: " << R"({schema_json})" << "\\n";')
            lines.append(f'    std::cerr << "[DIAGNOSTICS] Conversion Path: " << R"({conversion_path_str})" << "\\n";')

        if has_class:
            lines.append(f"    {class_name} sol;")

        # For positional argument style, the input is wrapped in [arg1, arg2, ...]
        if arg_style == ArgStyleEnum.positional:
            lines.append("    consume_char(cin, '[');")

        for i, (ptype, pname) in enumerate(params):
            ptype_norm = cls._normalize_type(ptype)
            if ptype_norm in ("tree", "node"):
                base_type = ptype.replace('*', '').strip()
                lines.append(f"    {ptype} {pname} = parse_{base_type}_from_json(cin);")
            elif ptype_norm == "list":
                base_type = ptype.replace('*', '').strip()
                lines.append(f"    {ptype} {pname} = parse_{base_type}_from_json(cin);")
            else:
                lines.append(f"    {ptype} {pname};")
                lines.append(f"    parse_val(cin, {pname});")
            if arg_style == ArgStyleEnum.positional and i < len(params) - 1:
                lines.append("    consume_char(cin, ',');")

        if arg_style == ArgStyleEnum.positional:
            lines.append("    consume_char(cin, ']');")

        call_args = ", ".join(p[1] for p in params)
        call = f"sol.{function_name}({call_args})" if has_class else f"{function_name}({call_args})"

        if ret_type == "void":
            lines.append(f"    {call};")
            lines.append('    cout << "null" << endl;')  # match Python json.dumps(None)
        elif ret_type.endswith('*'):
            base_type = ret_type[:-1].strip()
            lines.append(f"    auto res = {call};")
            lines.append(f"    print_{base_type}_as_json(res);")
            lines.append("    cout << endl;")
        else:
            lines.append(f"    auto res = {call};")
            lines.append("    print_val(res);")
            lines.append("    cout << endl;")

        return "\n".join(lines)

    @classmethod
    def _build_java_invoker(cls, function_name, arg_style, source_code, python_template=None, debug_mode=False):
        """Generate the Java main() body dynamically from the parsed signature."""
        ret_type, params = cls._parse_java_signature(source_code, function_name)

        # Fallback to python template signature if parsing Java signature failed
        if (ret_type is None or params is None) and python_template:
            py_params, py_ret = cls._parse_python_signature(python_template, function_name)
            if py_params:
                ret_type = cls._PY_TO_JAVA.get(py_ret, "int") if py_ret else "void"
                params = []
                for pname, ptype in py_params:
                    java_type = cls._PY_TO_JAVA.get(ptype, "int")
                    params.append((java_type, pname))

        if ret_type is None or params is None:
            return cls._java_fallback_invoker(function_name, arg_style)

        lines = []

        # Diagnostics Logging
        if debug_mode:
            schema_json = json.dumps([(pname, cls._normalize_type(ptype)) for ptype, pname in params])
            conversion_path = []
            for i, (ptype, pname) in enumerate(params):
                ptype_norm = cls._normalize_type(ptype)
                conversion_path.append(f"param {i} ({pname}): {ptype_norm}")
            ret_type_norm = cls._normalize_type(ret_type)
            conversion_path.append(f"return: {ret_type_norm}")
            conversion_path_str = " | ".join(conversion_path)

            # Use json.dumps() to produce properly escaped Java string literals.
            # JSON string escaping is compatible with Java string literal escaping.
            lines.append(f'        System.err.println("[DIAGNOSTICS] Language: java");')
            lines.append(f'        System.err.println("[DIAGNOSTICS] Parameter Schema: " + {json.dumps(schema_json)});')
            lines.append(f'        System.err.println("[DIAGNOSTICS] Conversion Path: " + {json.dumps(conversion_path_str)});')

        # Always consume outer brackets for positional style, even with a single param.
        # Input is always a JSON array [arg1, arg2, ...] — even when there is only one argument.
        need_outer_brackets = (arg_style == ArgStyleEnum.positional)
        if need_outer_brackets:
            lines.append("        parser.get(); // consume '['")

        for i, (ptype, pname) in enumerate(params):
            parser_expr = cls._java_parser_for(ptype)
            lines.append(f"        {ptype} {pname} = {parser_expr};")
            if need_outer_brackets and i < len(params) - 1:
                lines.append("        parser.get(); // consume ','")

        if need_outer_brackets:
            lines.append("        parser.get(); // consume ']'")

        call_args = ", ".join(p[1] for p in params)
        call = f"sol.{function_name}({call_args})"

        ret_type_norm = cls._normalize_type(ret_type)
        if ret_type == "void":
            # void functions output "null" to stay consistent with Python (json.dumps(None) == "null")
            lines.append(f"        {call};")
            lines.append('        System.out.print("null");')
            lines.append("        System.out.println();")
        elif ret_type_norm == "node":
            # Node (has next pointer) — serialize to LeetCode-style level-order JSON array
            lines.append(f"        {ret_type} res = {call};")
            lines.append("        System.out.print(serializeNode(res));")
            lines.append("        System.out.println();")
        elif ret_type_norm == "tree":
            # TreeNode — serialize to LeetCode-style level-order JSON array
            lines.append(f"        {ret_type} res = {call};")
            lines.append("        System.out.print(serializeTreeNode(res));")
            lines.append("        System.out.println();")
        elif ret_type_norm == "list" and ret_type.strip() == "ListNode":
            # ListNode — serialize to a plain JSON integer array
            lines.append(f"        {ret_type} res = {call};")
            lines.append("        System.out.print(serializeListNode(res));")
            lines.append("        System.out.println();")
        else:
            lines.append(f"        {ret_type} res = {call};")
            lines.append("        printVal(res);")
            lines.append("        System.out.println();")

        return "\n".join(lines)

    # ── Fallbacks (when signature parsing fails) ──────────────────────

    @classmethod
    def _cpp_fallback_invoker(cls, function_name, arg_style, has_class, class_name):
        prefix = f"    {class_name} sol;\n" if has_class else ""
        cp = "sol." if has_class else ""
        if arg_style == ArgStyleEnum.single:
            return f"""{prefix}    vector<int> arg;
    parse_val(cin, arg);
    auto res = {cp}{function_name}(arg);
    print_val(res);
    cout << endl;"""
        else:
            return f"""{prefix}    consume_char(cin, '[');
    vector<int> arg1;
    parse_val(cin, arg1);
    consume_char(cin, ',');
    int arg2;
    parse_val(cin, arg2);
    consume_char(cin, ']');
    auto res = {cp}{function_name}(arg1, arg2);
    print_val(res);
    cout << endl;"""

    @classmethod
    def _java_fallback_invoker(cls, function_name, arg_style):
        if arg_style == ArgStyleEnum.single:
            return f"""        int[] arg = parser.parseIntArray();
        Object res = sol.{function_name}(arg);
        printVal(res);
        System.out.println();"""
        else:
            return f"""        parser.get();
        int[] arg1 = parser.parseIntArray();
        parser.get();
        int arg2 = parser.parseInt();
        parser.get();
        Object res = sol.{function_name}(arg1, arg2);
        printVal(res);
        System.out.println();"""

    # ── Type resolution helpers ───────────────────────────────────────

    @classmethod
    def _java_parser_for(cls, java_type):
        # Try exact match first
        if java_type in cls._JAVA_PARSERS:
            return cls._JAVA_PARSERS[java_type]
        # Try normalized (remove all whitespace)
        normalized = re.sub(r'\s+', '', java_type)
        for key, val in cls._JAVA_PARSERS.items():
            if re.sub(r'\s+', '', key) == normalized:
                return val
        return f"parser.parseInt() /* unknown type: {java_type} */"


# ══════════════════════════════════════════════════════════════════════
#  Embedded C++ I/O Helper Code  (module-level constant)
#  Uses SINGLE braces — injected into f-string via {_CPP_IO_HELPERS}.
# ══════════════════════════════════════════════════════════════════════

_CPP_IO_HELPERS = r"""// --- Standard LeetCode Data Structures ---
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};

struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

// Node is used by problems like "Populating Next Right Pointers" — has an extra 'next' pointer
struct Node {
    int val;
    Node *left;
    Node *right;
    Node *next;
    Node() : val(0), left(nullptr), right(nullptr), next(nullptr) {}
    Node(int x) : val(x), left(nullptr), right(nullptr), next(nullptr) {}
    Node(int x, Node *left, Node *right, Node *next) : val(x), left(left), right(right), next(next) {}
};

// --- Lightweight JSON / Tokenizer Parser ---
void skip_ws(istream& in) {
    while (in && isspace(in.peek())) in.get();
}

char peek_char(istream& in) {
    skip_ws(in);
    return in.peek();
}

void consume_char(istream& in, char expected) {
    skip_ws(in);
    if (in.peek() == expected) {
        in.get();
    }
}

void parse_val(istream& in, int& val) {
    skip_ws(in);
    in >> val;
}

void parse_val(istream& in, long long& val) {
    skip_ws(in);
    in >> val;
}

void parse_val(istream& in, double& val) {
    skip_ws(in);
    in >> val;
}

void parse_val(istream& in, float& val) {
    skip_ws(in);
    in >> val;
}

void parse_val(istream& in, bool& val) {
    skip_ws(in);
    char c = peek_char(in);
    if (c == 't' || c == 'T' || c == '1') {
        while (in && isalpha(in.peek())) in.get();
        val = true;
    } else if (c == 'f' || c == 'F' || c == '0') {
        while (in && isalpha(in.peek())) in.get();
        val = false;
    } else {
        string s;
        in >> s;
        val = (s == "true" || s == "1");
    }
}

void parse_val(istream& in, char& val) {
    skip_ws(in);
    if (in.peek() == '\'' || in.peek() == '"') {
        in.get(); // consume opening quote
        in.get(val);
        if (in.peek() == '\'' || in.peek() == '"') in.get(); // consume closing quote
    } else {
        in.get(val);
    }
}

void parse_val(istream& in, string& val) {
    skip_ws(in);
    val = "";
    if (peek_char(in) == '"') {
        in.get();
        char c;
        while (in.get(c) && c != '"') {
            if (c == '\\') {
                char next;
                if (in.get(next)) {
                    if (next == 'n') val += '\n';
                    else if (next == 't') val += '\t';
                    else val += next;
                }
            } else {
                val += c;
            }
        }
    } else {
        in >> val;
    }
}

template<typename T>
void parse_val(istream& in, vector<T>& vec) {
    skip_ws(in);
    vec.clear();
    if (peek_char(in) == '[') {
        in.get();
        skip_ws(in);
        if (peek_char(in) == ']') { in.get(); return; }
        while (true) {
            T item;
            parse_val(in, item);
            vec.push_back(item);
            skip_ws(in);
            char c = peek_char(in);
            if (c == ',') in.get();
            else if (c == ']') { in.get(); break; }
            else break;
        }
    }
}

void print_val(int val) { cout << val; }
void print_val(long long val) { cout << val; }
void print_val(double val) { cout << val; }
void print_val(float val) { cout << val; }
void print_val(bool val) { cout << (val ? "true" : "false"); }
void print_val(char val) { cout << '"' << val << '"'; }
void print_val(const string& val) { cout << '"' << val << '"'; }

template<typename T>
void print_val(const vector<T>& vec) {
    cout << "[";
    for (size_t i = 0; i < vec.size(); ++i) {
        print_val(vec[i]);
        if (i + 1 < vec.size()) cout << ",";
    }
    cout << "]";
}

// --- TreeNode JSON parsing (LeetCode-style level-order) ---
TreeNode* parse_TreeNode_from_json(istream& in) {
    skip_ws(in);
    if (peek_char(in) == 'n') {
        // consume "null"
        string s; in >> s;
        return nullptr;
    }
    // Parse array of values
    vector<string> tokens;
    consume_char(in, '[');
    skip_ws(in);
    if (peek_char(in) == ']') { in.get(); return nullptr; }
    while (true) {
        skip_ws(in);
        string tok = "";
        if (peek_char(in) == 'n') {
            for (int k = 0; k < 4 && in.peek() != EOF; ++k) tok += (char)in.get();
        } else if (peek_char(in) == '"') {
            in.get();
            char c;
            while (in.get(c) && c != '"') tok += c;
        } else {
            char c;
            while (in && !isspace(in.peek()) && in.peek() != ',' && in.peek() != ']') {
                in.get(c);
                tok += c;
            }
        }
        tokens.push_back(tok);
        skip_ws(in);
        if (peek_char(in) == ',') in.get();
        else if (peek_char(in) == ']') { in.get(); break; }
        else break;
    }
    if (tokens.empty() || tokens[0] == "null") return nullptr;
    TreeNode* root = new TreeNode(stoi(tokens[0]));
    queue<TreeNode*> q;
    q.push(root);
    int i = 1;
    while (!q.empty() && i < (int)tokens.size()) {
        TreeNode* cur = q.front(); q.pop();
        if (i < (int)tokens.size()) {
            if (tokens[i] != "null") {
                cur->left = new TreeNode(stoi(tokens[i]));
                q.push(cur->left);
            }
            i++;
        }
        if (i < (int)tokens.size()) {
            if (tokens[i] != "null") {
                cur->right = new TreeNode(stoi(tokens[i]));
                q.push(cur->right);
            }
            i++;
        }
    }
    return root;
}

void print_TreeNode_as_json(TreeNode* root) {
    if (!root) { cout << "null"; return; }
    cout << "[";
    queue<TreeNode*> q;
    q.push(root);
    bool first = true;
    vector<string> out;
    while (!q.empty()) {
        TreeNode* cur = q.front(); q.pop();
        if (cur) {
            out.push_back(to_string(cur->val));
            q.push(cur->left);
            q.push(cur->right);
        } else {
            out.push_back("null");
        }
    }
    // Trim trailing nulls
    while (!out.empty() && out.back() == "null") out.pop_back();
    for (int i = 0; i < (int)out.size(); ++i) {
        if (i > 0) cout << ",";
        cout << out[i];
    }
    cout << "]";
}

// --- ListNode JSON parsing ---
ListNode* parse_ListNode_from_json(istream& in) {
    skip_ws(in);
    if (peek_char(in) == 'n') {
        string s; in >> s;
        return nullptr;
    }
    vector<int> vals;
    consume_char(in, '[');
    skip_ws(in);
    if (peek_char(in) == ']') { in.get(); return nullptr; }
    while (true) {
        int v;
        parse_val(in, v);
        vals.push_back(v);
        skip_ws(in);
        if (peek_char(in) == ',') in.get();
        else if (peek_char(in) == ']') { in.get(); break; }
        else break;
    }
    if (vals.empty()) return nullptr;
    ListNode* head = new ListNode(vals[0]);
    ListNode* cur = head;
    for (int i = 1; i < (int)vals.size(); ++i) {
        cur->next = new ListNode(vals[i]);
        cur = cur->next;
    }
    return head;
}

void print_ListNode_as_json(ListNode* head) {
    cout << "[";
    bool first = true;
    while (head) {
        if (!first) cout << ",";
        cout << head->val;
        first = false;
        head = head->next;
    }
    cout << "]";
}

// Node has its own struct with val/left/right/next — parse like a binary tree (level-order), ignore next during input
Node* parse_Node_from_json(istream& in) {
    skip_ws(in);
    if (peek_char(in) == 'n') {
        string s; in >> s;
        return nullptr;
    }
    vector<string> tokens;
    consume_char(in, '[');
    skip_ws(in);
    if (peek_char(in) == ']') { in.get(); return nullptr; }
    while (true) {
        skip_ws(in);
        string tok = "";
        if (peek_char(in) == 'n') {
            for (int k = 0; k < 4 && in.peek() != EOF; ++k) tok += (char)in.get();
        } else if (peek_char(in) == '"') {
            in.get();
            char c;
            while (in.get(c) && c != '"') tok += c;
        } else {
            char c;
            while (in && !isspace(in.peek()) && in.peek() != ',' && in.peek() != ']') {
                in.get(c); tok += c;
            }
        }
        tokens.push_back(tok);
        skip_ws(in);
        if (peek_char(in) == ',') in.get();
        else if (peek_char(in) == ']') { in.get(); break; }
        else break;
    }
    if (tokens.empty() || tokens[0] == "null") return nullptr;
    Node* root = new Node(stoi(tokens[0]));
    queue<Node*> q;
    q.push(root);
    int i = 1;
    while (!q.empty() && i < (int)tokens.size()) {
        Node* cur = q.front(); q.pop();
        if (i < (int)tokens.size()) {
            if (tokens[i] != "null") {
                cur->left = new Node(stoi(tokens[i]));
                q.push(cur->left);
            }
            i++;
        }
        if (i < (int)tokens.size()) {
            if (tokens[i] != "null") {
                cur->right = new Node(stoi(tokens[i]));
                q.push(cur->right);
            }
            i++;
        }
    }
    return root;
}

void print_Node_as_json(Node* root) {
    if (!root) { cout << "[]"; return; }
    cout << "[";
    Node* level_start = root;
    bool first = true;
    while (level_start) {
        Node* curr = level_start;
        Node* next_level_start = nullptr;
        while (curr) {
            if (!first) cout << ",";
            cout << curr->val;
            first = false;
            if (!next_level_start) {
                if (curr->left) next_level_start = curr->left;
                else if (curr->right) next_level_start = curr->right;
            }
            curr = curr->next;
        }
        cout << ",\"#\"";
        level_start = next_level_start;
    }
    cout << "]";
}
"""


# ══════════════════════════════════════════════════════════════════════
#  Embedded Java I/O Helper Code  (module-level constant)
# ══════════════════════════════════════════════════════════════════════

_JAVA_IO_HELPERS = r"""    // --- Helper Tokenizer for Java ---
    static class SimpleParser {
        private String input;
        private int pos = 0;

        public SimpleParser(String input) {
            this.input = input.trim();
        }

        private void skipWs() {
            while (pos < input.length() && Character.isWhitespace(input.charAt(pos))) {
                pos++;
            }
        }

        public char peek() {
            skipWs();
            if (pos >= input.length()) return '\0';
            return input.charAt(pos);
        }

        public char get() {
            skipWs();
            if (pos >= input.length()) return '\0';
            return input.charAt(pos++);
        }

        public int parseInt() {
            skipWs();
            StringBuilder sb = new StringBuilder();
            if (pos < input.length() && (input.charAt(pos) == '-' || input.charAt(pos) == '+')) {
                sb.append(input.charAt(pos++));
            }
            while (pos < input.length() && Character.isDigit(input.charAt(pos))) {
                sb.append(input.charAt(pos++));
            }
            return Integer.parseInt(sb.toString());
        }

        public long parseLong() {
            skipWs();
            StringBuilder sb = new StringBuilder();
            if (pos < input.length() && (input.charAt(pos) == '-' || input.charAt(pos) == '+')) {
                sb.append(input.charAt(pos++));
            }
            while (pos < input.length() && Character.isDigit(input.charAt(pos))) {
                sb.append(input.charAt(pos++));
            }
            return Long.parseLong(sb.toString());
        }

        public double parseDouble() {
            skipWs();
            StringBuilder sb = new StringBuilder();
            if (pos < input.length() && (input.charAt(pos) == '-' || input.charAt(pos) == '+')) {
                sb.append(input.charAt(pos++));
            }
            while (pos < input.length() && (Character.isDigit(input.charAt(pos)) || input.charAt(pos) == '.')) {
                sb.append(input.charAt(pos++));
            }
            return Double.parseDouble(sb.toString());
        }

        public float parseFloat() {
            return (float) parseDouble();
        }

        public boolean parseBool() {
            skipWs();
            char c = peek();
            if (c == 't' || c == 'T' || c == '1') {
                while (pos < input.length() && Character.isLetter(input.charAt(pos))) pos++;
                return true;
            } else if (c == 'f' || c == 'F' || c == '0') {
                while (pos < input.length() && Character.isLetter(input.charAt(pos))) pos++;
                return false;
            }
            return false;
        }

        public char parseChar() {
            skipWs();
            if (peek() == '\'' || peek() == '"') {
                get(); // consume opening quote
                char val = get();
                if (peek() == '\'' || peek() == '"') get(); // consume closing quote
                return val;
            }
            return get();
        }

        public String parseString() {
            skipWs();
            if (peek() == '"') {
                get(); // consume '"'
                StringBuilder sb = new StringBuilder();
                while (pos < input.length()) {
                    char c = input.charAt(pos++);
                    if (c == '"') break;
                    if (c == '\\') {
                        if (pos < input.length()) {
                            char next = input.charAt(pos++);
                            if (next == 'n') sb.append('\n');
                            else if (next == 't') sb.append('\t');
                            else sb.append(next);
                        }
                    } else {
                        sb.append(c);
                    }
                }
                return sb.toString();
            } else {
                StringBuilder sb = new StringBuilder();
                while (pos < input.length() && !Character.isWhitespace(input.charAt(pos)) && input.charAt(pos) != ',' && input.charAt(pos) != ']') {
                    sb.append(input.charAt(pos++));
                }
                return sb.toString();
            }
        }

        public List<Integer> parseIntegerList() {
            skipWs();
            List<Integer> res = new ArrayList<>();
            if (get() == '[') {
                if (peek() == ']') { get(); return res; }
                while (true) {
                    res.add(parseInt());
                    skipWs();
                    char c = get();
                    if (c == ']') break;
                }
            }
            return res;
        }

        public List<Long> parseLongList() {
            skipWs();
            List<Long> res = new ArrayList<>();
            if (get() == '[') {
                if (peek() == ']') { get(); return res; }
                while (true) {
                    res.add(parseLong());
                    skipWs();
                    char c = get();
                    if (c == ']') break;
                }
            }
            return res;
        }

        public List<Double> parseDoubleList() {
            skipWs();
            List<Double> res = new ArrayList<>();
            if (get() == '[') {
                if (peek() == ']') { get(); return res; }
                while (true) {
                    res.add(parseDouble());
                    skipWs();
                    char c = get();
                    if (c == ']') break;
                }
            }
            return res;
        }

        public List<Float> parseFloatList() {
            skipWs();
            List<Float> res = new ArrayList<>();
            if (get() == '[') {
                if (peek() == ']') { get(); return res; }
                while (true) {
                    res.add(parseFloat());
                    skipWs();
                    char c = get();
                    if (c == ']') break;
                }
            }
            return res;
        }

        public List<String> parseStringList() {
            skipWs();
            List<String> res = new ArrayList<>();
            if (get() == '[') {
                if (peek() == ']') { get(); return res; }
                while (true) {
                    res.add(parseString());
                    skipWs();
                    char c = get();
                    if (c == ']') break;
                }
            }
            return res;
        }

        public List<Boolean> parseBoolList() {
            skipWs();
            List<Boolean> res = new ArrayList<>();
            if (get() == '[') {
                if (peek() == ']') { get(); return res; }
                while (true) {
                    res.add(parseBool());
                    skipWs();
                    char c = get();
                    if (c == ']') break;
                }
            }
            return res;
        }

        public List<Character> parseCharList() {
            skipWs();
            List<Character> res = new ArrayList<>();
            if (get() == '[') {
                if (peek() == ']') { get(); return res; }
                while (true) {
                    res.add(parseChar());
                    skipWs();
                    char c = get();
                    if (c == ']') break;
                }
            }
            return res;
        }

        public int[] parseIntArray() {
            List<Integer> list = parseIntegerList();
            int[] arr = new int[list.size()];
            for (int i = 0; i < list.size(); i++) arr[i] = list.get(i);
            return arr;
        }

        public Integer[] parseIntegerArray() {
            List<Integer> list = parseIntegerList();
            return list.toArray(new Integer[0]);
        }

        public long[] parseLongArray() {
            List<Long> list = parseLongList();
            long[] arr = new long[list.size()];
            for (int i = 0; i < list.size(); i++) arr[i] = list.get(i);
            return arr;
        }

        public double[] parseDoubleArray() {
            List<Double> list = parseDoubleList();
            double[] arr = new double[list.size()];
            for (int i = 0; i < list.size(); i++) arr[i] = list.get(i);
            return arr;
        }

        public float[] parseFloatArray() {
            List<Float> list = parseFloatList();
            float[] arr = new float[list.size()];
            for (int i = 0; i < list.size(); i++) arr[i] = list.get(i);
            return arr;
        }

        public String[] parseStringArray() {
            List<String> list = parseStringList();
            return list.toArray(new String[0]);
        }

        public char[] parseCharArray() {
            List<Character> list = parseCharList();
            char[] arr = new char[list.size()];
            for (int i = 0; i < list.size(); i++) arr[i] = list.get(i);
            return arr;
        }

        public List<List<Integer>> parseIntegerMatrix() {
            skipWs();
            List<List<Integer>> res = new ArrayList<>();
            if (get() == '[') {
                if (peek() == ']') { get(); return res; }
                while (true) {
                    res.add(parseIntegerList());
                    skipWs();
                    char c = get();
                    if (c == ']') break;
                }
            }
            return res;
        }

        public List<List<String>> parseStringMatrix() {
            skipWs();
            List<List<String>> res = new ArrayList<>();
            if (get() == '[') {
                if (peek() == ']') { get(); return res; }
                while (true) {
                    res.add(parseStringList());
                    skipWs();
                    char c = get();
                    if (c == ']') break;
                }
            }
            return res;
        }

        public List<List<Double>> parseDoubleMatrixList() {
            skipWs();
            List<List<Double>> res = new ArrayList<>();
            if (get() == '[') {
                if (peek() == ']') { get(); return res; }
                while (true) {
                    res.add(parseDoubleList());
                    skipWs();
                    char c = get();
                    if (c == ']') break;
                }
            }
            return res;
        }

        public List<List<Long>> parseLongMatrixList() {
            skipWs();
            List<List<Long>> res = new ArrayList<>();
            if (get() == '[') {
                if (peek() == ']') { get(); return res; }
                while (true) {
                    res.add(parseLongList());
                    skipWs();
                    char c = get();
                    if (c == ']') break;
                }
            }
            return res;
        }

        public int[][] parseIntMatrix() {
            List<List<Integer>> matrix = parseIntegerMatrix();
            int[][] arr = new int[matrix.size()][];
            for (int i = 0; i < matrix.size(); i++) {
                List<Integer> row = matrix.get(i);
                arr[i] = new int[row.size()];
                for (int j = 0; j < row.size(); j++) {
                    arr[i][j] = row.get(j);
                }
            }
            return arr;
        }

        public double[][] parseDoubleMatrix() {
            List<List<Double>> matrix = parseDoubleMatrixList();
            double[][] arr = new double[matrix.size()][];
            for (int i = 0; i < matrix.size(); i++) {
                List<Double> row = matrix.get(i);
                arr[i] = new double[row.size()];
                for (int j = 0; j < row.size(); j++) {
                    arr[i][j] = row.get(j);
                }
            }
            return arr;
        }

        public TreeNode parseTreeNode() {
            skipWs();
            if (peek() == 'n') {
                parseString();
                return null;
            }
            List<String> tokens = new ArrayList<>();
            if (get() == '[') {
                if (peek() == ']') { get(); return null; }
                while (true) {
                    skipWs();
                    StringBuilder tok = new StringBuilder();
                    if (peek() == 'n') {
                        for (int k = 0; k < 4 && pos < input.length(); ++k) {
                            tok.append(input.charAt(pos++));
                        }
                    } else if (peek() == '"') {
                        get();
                        while (pos < input.length() && input.charAt(pos) != '"') {
                            tok.append(input.charAt(pos++));
                        }
                        if (pos < input.length()) get();
                    } else {
                        while (pos < input.length() && !Character.isWhitespace(input.charAt(pos)) && input.charAt(pos) != ',' && input.charAt(pos) != ']') {
                            tok.append(input.charAt(pos++));
                        }
                    }
                    tokens.add(tok.toString().trim());
                    skipWs();
                    char c = get();
                    if (c == ']') break;
                }
            }
            if (tokens.isEmpty() || tokens.get(0).equals("null")) return null;
            TreeNode root = new TreeNode(Integer.parseInt(tokens.get(0)));
            Queue<TreeNode> q = new LinkedList<>();
            q.add(root);
            int i = 1;
            while (!q.isEmpty() && i < tokens.size()) {
                TreeNode cur = q.poll();
                if (i < tokens.size()) {
                    if (!tokens.get(i).equals("null") && !tokens.get(i).isEmpty()) {
                        cur.left = new TreeNode(Integer.parseInt(tokens.get(i)));
                        q.add(cur.left);
                    }
                    i++;
                }
                if (i < tokens.size()) {
                    if (!tokens.get(i).equals("null") && !tokens.get(i).isEmpty()) {
                        cur.right = new TreeNode(Integer.parseInt(tokens.get(i)));
                        q.add(cur.right);
                    }
                    i++;
                }
            }
            return root;
        }

        public ListNode parseListNode() {
            List<Integer> list = parseIntegerList();
            if (list.isEmpty()) return null;
            ListNode head = new ListNode(list.get(0));
            ListNode cur = head;
            for (int i = 1; i < list.size(); i++) {
                cur.next = new ListNode(list.get(i));
                cur = cur.next;
            }
            return head;
        }

        public Node parseNode() {
            skipWs();
            if (peek() == 'n') {
                parseString();
                return null;
            }
            List<String> tokens = new ArrayList<>();
            if (get() == '[') {
                if (peek() == ']') { get(); return null; }
                while (true) {
                    skipWs();
                    StringBuilder tok = new StringBuilder();
                    if (peek() == 'n') {
                        for (int k = 0; k < 4 && pos < input.length(); ++k) {
                            tok.append(input.charAt(pos++));
                        }
                    } else if (peek() == '"') {
                        get();
                        while (pos < input.length() && input.charAt(pos) != '"') {
                            tok.append(input.charAt(pos++));
                        }
                        if (pos < input.length()) get();
                    } else {
                        while (pos < input.length() && !Character.isWhitespace(input.charAt(pos)) && input.charAt(pos) != ',' && input.charAt(pos) != ']') {
                            tok.append(input.charAt(pos++));
                        }
                    }
                    tokens.add(tok.toString().trim());
                    skipWs();
                    char c = get();
                    if (c == ']') break;
                }
            }
            if (tokens.isEmpty() || tokens.get(0).equals("null")) return null;
            Node root = new Node(Integer.parseInt(tokens.get(0)));
            Queue<Node> q = new LinkedList<>();
            q.add(root);
            int i = 1;
            while (!q.isEmpty() && i < tokens.size()) {
                Node cur = q.poll();
                if (i < tokens.size()) {
                    if (!tokens.get(i).equals("null") && !tokens.get(i).isEmpty()) {
                        cur.left = new Node(Integer.parseInt(tokens.get(i)));
                        q.add(cur.left);
                    }
                    i++;
                }
                if (i < tokens.size()) {
                    if (!tokens.get(i).equals("null") && !tokens.get(i).isEmpty()) {
                        cur.right = new Node(Integer.parseInt(tokens.get(i)));
                        q.add(cur.right);
                    }
                    i++;
                }
            }
            return root;
        }
    }

    // --- Helper Printers for Java ---
    static void printVal(int val) { System.out.print(val); }
    static void printVal(long val) { System.out.print(val); }
    static void printVal(double val) { System.out.print(val); }
    static void printVal(float val) { System.out.print(val); }
    static void printVal(boolean val) { System.out.print(val ? "true" : "false"); }
    static void printVal(char val) { System.out.print("\"" + val + "\""); }
    static void printVal(String val) { System.out.print("\"" + val + "\""); }

    static void printVal(int[] arr) {
        System.out.print("[");
        for (int i = 0; i < arr.length; i++) {
            printVal(arr[i]);
            if (i + 1 < arr.length) System.out.print(",");
        }
        System.out.print("]");
    }

    static void printVal(long[] arr) {
        System.out.print("[");
        for (int i = 0; i < arr.length; i++) {
            printVal(arr[i]);
            if (i + 1 < arr.length) System.out.print(",");
        }
        System.out.print("]");
    }

    static void printVal(double[] arr) {
        System.out.print("[");
        for (int i = 0; i < arr.length; i++) {
            printVal(arr[i]);
            if (i + 1 < arr.length) System.out.print(",");
        }
        System.out.print("]");
    }

    static void printVal(float[] arr) {
        System.out.print("[");
        for (int i = 0; i < arr.length; i++) {
            printVal(arr[i]);
            if (i + 1 < arr.length) System.out.print(",");
        }
        System.out.print("]");
    }

    static void printVal(String[] arr) {
        System.out.print("[");
        for (int i = 0; i < arr.length; i++) {
            printVal(arr[i]);
            if (i + 1 < arr.length) System.out.print(",");
        }
        System.out.print("]");
    }

    static void printVal(char[] arr) {
        System.out.print("[");
        for (int i = 0; i < arr.length; i++) {
            printVal(arr[i]);
            if (i + 1 < arr.length) System.out.print(",");
        }
        System.out.print("]");
    }

    static void printVal(int[][] arr) {
        System.out.print("[");
        for (int i = 0; i < arr.length; i++) {
            printVal(arr[i]);
            if (i + 1 < arr.length) System.out.print(",");
        }
        System.out.print("]");
    }

    static void printVal(double[][] arr) {
        System.out.print("[");
        for (int i = 0; i < arr.length; i++) {
            printVal(arr[i]);
            if (i + 1 < arr.length) System.out.print(",");
        }
        System.out.print("]");
    }

    static void printVal(Object val) {
        if (val == null) {
            System.out.print("null");
        } else if (val instanceof String) {
            System.out.print("\"" + val + "\"");
        } else if (val instanceof Character) {
            System.out.print("\"" + val + "\"");
        } else if (val instanceof List) {
            List<?> list = (List<?>) val;
            System.out.print("[");
            for (int i = 0; i < list.size(); i++) {
                printVal(list.get(i));
                if (i + 1 < list.size()) System.out.print(",");
            }
            System.out.print("]");
        } else if (val instanceof int[]) {
            printVal((int[]) val);
        } else if (val instanceof long[]) {
            printVal((long[]) val);
        } else if (val instanceof double[]) {
            printVal((double[]) val);
        } else if (val instanceof float[]) {
            printVal((float[]) val);
        } else if (val instanceof String[]) {
            printVal((String[]) val);
        } else if (val instanceof char[]) {
            printVal((char[]) val);
        } else if (val instanceof Object[]) {
            Object[] arr = (Object[]) val;
            System.out.print("[");
            for (int i = 0; i < arr.length; i++) {
                printVal(arr[i]);
                if (i + 1 < arr.length) System.out.print(",");
            }
            System.out.print("]");
        } else {
            System.out.print(val);
        }
    }

    // --- TreeNode / ListNode / Node JSON serializers (level-order) ---
    static String serializeTreeNode(TreeNode root) {
        if (root == null) return "null";
        List<String> out = new ArrayList<>();
        Queue<TreeNode> q = new LinkedList<>();
        q.add(root);
        while (!q.isEmpty()) {
            TreeNode cur = q.poll();
            if (cur != null) {
                out.add(String.valueOf(cur.val));
                q.add(cur.left);
                q.add(cur.right);
            } else {
                out.add("null");
            }
        }
        while (!out.isEmpty() && out.get(out.size() - 1).equals("null")) out.remove(out.size() - 1);
        return "[" + String.join(",", out) + "]";
    }

    static String serializeListNode(ListNode head) {
        StringBuilder sb = new StringBuilder("[");
        boolean first = true;
        while (head != null) {
            if (!first) sb.append(",");
            sb.append(head.val);
            first = false;
            head = head.next;
        }
        sb.append("]");
        return sb.toString();
    }

    static String serializeNode(Node root) {
        if (root == null) return "[]";
        List<String> out = new ArrayList<>();
        Node levelStart = root;
        while (levelStart != null) {
            Node curr = levelStart;
            Node nextLevelStart = null;
            while (curr != null) {
                out.add(String.valueOf(curr.val));
                if (nextLevelStart == null) {
                    if (curr.left != null) nextLevelStart = curr.left;
                    else if (curr.right != null) nextLevelStart = curr.right;
                }
                curr = curr.next;
            }
            out.add("\"#\"");
            levelStart = nextLevelStart;
        }
        return "[" + String.join(",", out) + "]";
    }
"""
