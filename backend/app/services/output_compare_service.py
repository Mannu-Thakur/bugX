import json
import math

class OutputCompareService:
    @staticmethod
    def compare(expected_output: str, actual_output: str) -> bool:
        if expected_output is None:
            expected_output = ""
        if actual_output is None:
            actual_output = ""
            
        expected_stripped = expected_output.strip()
        actual_stripped = actual_output.strip()

        try:
            expected_json = json.loads(expected_stripped)
            actual_json = json.loads(actual_stripped)
            return OutputCompareService._compare_deep(expected_json, actual_json)
        except json.JSONDecodeError:
            # Fallback to string comparison
            return expected_stripped == actual_stripped

    @staticmethod
    def _compare_deep(expected, actual, tolerance=1e-5) -> bool:
        if type(expected) != type(actual):
            # Try to handle list vs tuple if needed, but json parses both to list
            if isinstance(expected, (list, tuple)) and isinstance(actual, (list, tuple)):
                pass
            else:
                return False

        if isinstance(expected, dict):
            if expected.keys() != actual.keys():
                return False
            for k in expected:
                if not OutputCompareService._compare_deep(expected[k], actual[k], tolerance):
                    return False
            return True
        elif isinstance(expected, (list, tuple)):
            if len(expected) != len(actual):
                return False
            for e, a in zip(expected, actual):
                if not OutputCompareService._compare_deep(e, a, tolerance):
                    return False
            return True
        elif isinstance(expected, float):
            return math.isclose(expected, actual, rel_tol=tolerance, abs_tol=tolerance)
        else:
            return expected == actual
