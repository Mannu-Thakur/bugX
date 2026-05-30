import json
import math
from typing import Optional

class OutputCompareService:
    @staticmethod
    def compare(expected_output: str, actual_output: str, problem_slug: Optional[str] = None) -> bool:
        if expected_output is None:
            expected_output = ""
        if actual_output is None:
            actual_output = ""
            
        expected_stripped = expected_output.strip()
        actual_stripped = actual_output.strip()

        try:
            expected_json = json.loads(expected_stripped)
            actual_json = json.loads(actual_stripped)
            
            # 1. Try deep strict comparison
            if OutputCompareService._compare_deep(expected_json, actual_json):
                return True
                
            # 2. If it fails, check if the problem is order-agnostic
            if problem_slug:
                slug_lower = problem_slug.lower()
                order_agnostic_keywords = ["three-sum", "3sum", "3-sum", "two-sum", "group-anagrams"]
                if any(kw in slug_lower for kw in order_agnostic_keywords):
                    # Sort both and compare again
                    try:
                        sorted_expected = OutputCompareService._sort_nested(expected_json)
                        sorted_actual = OutputCompareService._sort_nested(actual_json)
                        return OutputCompareService._compare_deep(sorted_expected, sorted_actual)
                    except Exception:
                        # If sorting fails for any reason, fallback to deep comparison failure
                        pass
            
            return False
        except json.JSONDecodeError:
            # Fallback to string comparison
            return expected_stripped == actual_stripped

    @staticmethod
    def _compare_deep(expected, actual, tolerance=1e-5) -> bool:
        if type(expected) != type(actual):
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

    @staticmethod
    def _canonical_key(val):
        if isinstance(val, (int, float, str, bool)):
            return (0, val)
        elif val is None:
            return (1, None)
        elif isinstance(val, (list, tuple)):
            sorted_items = sorted([OutputCompareService._sort_nested(x) for x in val], key=OutputCompareService._canonical_key)
            return (2, tuple(sorted_items))
        elif isinstance(val, dict):
            sorted_items = sorted(
                [(k, OutputCompareService._sort_nested(v)) for k, v in val.items()],
                key=lambda x: (x[0], OutputCompareService._canonical_key(x[1]))
            )
            return (3, tuple(sorted_items))
        return (4, str(val))

    @staticmethod
    def _sort_nested(val):
        if isinstance(val, (list, tuple)):
            return sorted([OutputCompareService._sort_nested(x) for x in val], key=OutputCompareService._canonical_key)
        elif isinstance(val, dict):
            return {k: OutputCompareService._sort_nested(v) for k, v in sorted(val.items())}
        return val
