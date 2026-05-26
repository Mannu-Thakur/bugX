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
    ) -> str:
        if language == "python":
            return CodeWrapperService._wrap_python(source_code, function_name, arg_style)
        elif language == "javascript":
            return CodeWrapperService._wrap_javascript(source_code, function_name, arg_style)
        elif language in ("cpp", "c++"):
            return CodeWrapperService._wrap_cpp(source_code, function_name, arg_style, python_template)
        elif language == "java":
            return CodeWrapperService._wrap_java(source_code, function_name, arg_style, python_template)
        else:
            raise ValueError(f"Unsupported language: {language}")

    # ══════════════════════════════════════════════════════════════════
    #  PUBLIC: Template generators (for seeder / admin / import)
    # ══════════════════════════════════════════════════════════════════

    @classmethod
    def generate_cpp_template(cls, function_name: str, python_template: str) -> str:
        """Auto-generate a C++ Solution class from a Python function signature."""
        params, return_type = cls._parse_python_signature(python_template, function_name)
        cpp_return = cls._PY_TO_CPP.get(return_type, "int") if return_type else "void"

        cpp_params = []
        for pname, ptype in params:
            cpp_type = cls._PY_TO_CPP.get(ptype, "int")
            ref = "&" if cpp_type.startswith("vector") else ""
            cpp_params.append(f"{cpp_type}{ref} {pname}")

        if cpp_return == "void":
            ret_stmt = ""
        elif cpp_return in cls._CPP_DEFAULTS:
            ret_stmt = f"\n        return {cls._CPP_DEFAULTS[cpp_return]};"
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
        java_return = cls._PY_TO_JAVA.get(return_type, "int") if return_type else "void"

        java_params = []
        for pname, ptype in params:
            java_type = cls._PY_TO_JAVA.get(ptype, "int")
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
    def _wrap_python(source_code, function_name, arg_style):
        if arg_style == ArgStyleEnum.kwargs:
            return f"""
import json, sys
{source_code}
if __name__ == "__main__":
    data = json.loads(sys.stdin.read())
    result = {function_name}(**data)
    print(json.dumps(result))
"""
        elif arg_style == ArgStyleEnum.single:
            return f"""
import json, sys
{source_code}
if __name__ == "__main__":
    data = json.loads(sys.stdin.read())
    result = {function_name}(data)
    print(json.dumps(result))
"""
        elif arg_style == ArgStyleEnum.positional:
            return f"""
import json, sys
{source_code}
if __name__ == "__main__":
    args = json.loads(sys.stdin.read())
    result = {function_name}(*args)
    print(json.dumps(result))
"""
        else:
            raise ValueError(f"Unknown arg_style {arg_style} for python")

    @staticmethod
    def _wrap_javascript(source_code, function_name, arg_style):
        if arg_style == ArgStyleEnum.kwargs:
            raise ValueError("JavaScript does not support kwargs arg_style")
        elif arg_style == ArgStyleEnum.single:
            return f"""
{source_code}
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(0, 'utf8'));
const result = {function_name}(data);
console.log(JSON.stringify(result));
"""
        elif arg_style == ArgStyleEnum.positional:
            return f"""
{source_code}
const fs = require('fs');
const args = JSON.parse(fs.readFileSync(0, 'utf8'));
const result = {function_name}(...args);
console.log(JSON.stringify(result));
"""
        else:
            raise ValueError(f"Unknown arg_style {arg_style} for javascript")

    # ══════════════════════════════════════════════════════════════════
    #  PRIVATE: C++ wrapper
    # ══════════════════════════════════════════════════════════════════

    @classmethod
    def _wrap_cpp(cls, source_code, function_name, arg_style, python_template=None):
        invoker = cls._build_cpp_invoker(function_name, arg_style, source_code, python_template)
        # The IO helpers are stored as a plain string — single braces are
        # fine because they are substituted into the f-string via {}, not
        # interpreted as f-string delimiters.
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
using namespace std;

{_CPP_IO_HELPERS}

{source_code}

int main() {{
{invoker}
    return 0;
}}
"""

    # ══════════════════════════════════════════════════════════════════
    #  PRIVATE: Java wrapper
    # ══════════════════════════════════════════════════════════════════

    @classmethod
    def _wrap_java(cls, source_code, function_name, arg_style, python_template=None):
        invoker = cls._build_java_invoker(function_name, arg_style, source_code, python_template)
        # Solution class is placed OUTSIDE public class Main to avoid
        # inner-class instantiation issues in a static context.
        return f"""import java.util.*;
import java.io.*;

{source_code}

public class Main {{
{_JAVA_IO_HELPERS}

    public static void main(String[] args) throws Exception {{
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) {{
            sb.append(line).append("\\n");
        }}
        SimpleParser parser = new SimpleParser(sb.toString());
        Solution sol = new Solution();
{invoker}
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
        pattern = r'def\s+' + re.escape(function_name) + r'\s*\(([^)]*)\)\s*(?:->\s*(.+?))?\s*:'
        match = re.search(pattern, python_code)
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

    @staticmethod
    def _normalize_cpp_type(raw):
        """Remove const, &, * from a C++ type, normalise whitespace."""
        r = raw.strip()
        r = re.sub(r'\bconst\b', '', r)
        r = r.replace('&', '').replace('*', '')
        r = re.sub(r'\s+', ' ', r).strip()
        return r

    # ══════════════════════════════════════════════════════════════════
    #  Invoker Builders — Fully Dynamic
    # ══════════════════════════════════════════════════════════════════

    @classmethod
    def _build_cpp_invoker(cls, function_name, arg_style, source_code, python_template=None):
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

        has_class = bool(re.search(r'\bclass\s+\w+', source_code))
        class_name = 'Solution'
        if has_class:
            cm = re.search(r'\bclass\s+(\w+)', source_code)
            if cm:
                class_name = cm.group(1)

        if ret_type is None or params is None:
            return cls._cpp_fallback_invoker(function_name, arg_style, has_class, class_name)

        lines = []
        if has_class:
            lines.append(f"    {class_name} sol;")

        # For positional argument style, the input is wrapped in [arg1, arg2, ...]
        if arg_style == ArgStyleEnum.positional:
            lines.append("    consume_char(cin, '[');")

        for i, (ptype, pname) in enumerate(params):
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
        else:
            lines.append(f"    auto res = {call};")
            lines.append("    print_val(res);")
            lines.append("    cout << endl;")

        return "\n".join(lines)

    @classmethod
    def _build_java_invoker(cls, function_name, arg_style, source_code, python_template=None):
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
        need_outer_brackets = (arg_style == ArgStyleEnum.positional and len(params) > 1)
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

        if ret_type == "void":
            lines.append(f"        {call};")
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

_CPP_IO_HELPERS = r"""// --- Lightweight JSON / Tokenizer Parser ---
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
"""
