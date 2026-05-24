from app.models.problem_template import ArgStyleEnum

class CodeWrapperService:
    @staticmethod
    def wrap_code(language: str, source_code: str, function_name: str, arg_style: ArgStyleEnum) -> str:
        if language == "python":
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
                
        elif language == "javascript":
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
        else:
            raise ValueError(f"Unsupported language: {language}")
