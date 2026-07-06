import re
import html as html_module
from typing import List, Dict, Any
from app.models.problem import DifficultyEnum

from app.services.importer_exceptions import ImportFailedException, ProblemImportValidationError

class ProblemImportValidationService:
    @staticmethod
    def _strip_html(text: str) -> str:
        """
        Strip HTML tags from text while preserving comparison operators
        like <=, >=, <> that appear in constraints.
        """
        if not text:
            return ""
        # Decode HTML entities first (&lt; &gt; &amp; &nbsp; etc.)
        text = html_module.unescape(text)
        # Protect comparison operators: <=, >=, <> from being consumed
        # by the tag-stripping regex. We temporarily replace them.
        text = text.replace("<=", "\x00LTE\x00")
        text = text.replace(">=", "\x00GTE\x00")
        text = text.replace("<>", "\x00NEQ\x00")
        # Now strip actual HTML tags
        text = re.sub(r"<[^>]+>", " ", text)
        # Restore comparison operators
        text = text.replace("\x00LTE\x00", "<=")
        text = text.replace("\x00GTE\x00", ">=")
        text = text.replace("\x00NEQ\x00", "<>")
        # Collapse whitespace
        text = re.sub(r"\s+", " ", text).strip()
        return text

    @staticmethod
    def is_generic_template(code: str, language: str) -> bool:
        """Detects if code is a generic placeholder template."""
        if not code:
            return True

        # Normalize: remove comments and all whitespaces
        # Python comments
        clean_code = re.sub(r"#.*", "", code)
        # JS comments
        clean_code = re.sub(r"//.*", "", clean_code)
        clean_code = re.sub(r"/\*.*?\*/", "", clean_code, flags=re.DOTALL)

        normalized = re.sub(r"\s+", "", clean_code)

        if language == "python":
            # Matches generic 'def solve(): pass' or 'def solve():'
            if normalized in ("defsolve():pass", "defsolve():", "defsolution():pass", "defsolution():"):
                return True
        elif language == "javascript":
            # Matches generic 'function solve() {}'
            if normalized in ("functionsolve(){}", "varsolve=function(){}", "varsolve=functionsolve(){}",
                              "functionsolution(){}", "varsolution=function(){}", "varsolution=functionsolution(){}"):
                return True
        return False

    @classmethod
    def validate_dto(cls, dto: Dict[str, Any]) -> None:
        """
        Validates the parsed problem DTO before converting to ORM objects.
        Raises ProblemImportValidationError on failure.
        """
        errors = []

        # 1. Title Validation
        title = dto.get("title", "").strip()
        if not title:
            errors.append("Title is missing or empty.")
        elif title.lower() == "unknown-problem":
            errors.append("Title resolved to generic fallback 'unknown-problem'.")

        # 2. Description Validation
        description = dto.get("description", "").strip()
        if not description:
            errors.append("Description is missing or empty.")
        else:
            # Strip HTML to inspect content
            desc_clean = cls._strip_html(description)
            if not desc_clean or desc_clean.lower().startswith("no description provided"):
                errors.append("Description extraction failed (fell back to 'No description provided.').")

        # 3. Difficulty Validation
        difficulty = dto.get("difficulty")
        if not difficulty:
            errors.append("Difficulty is missing.")
        else:
            try:
                # Ensure it maps to valid enum
                if isinstance(difficulty, str):
                    DifficultyEnum(difficulty.upper())
                else:
                    DifficultyEnum(difficulty)
            except ValueError:
                errors.append(f"Invalid difficulty value: '{difficulty}'.")

        # 4. Templates Validation
        templates = dto.get("templates", [])
        if not templates:
            errors.append("No language templates extracted.")
        else:
            generic_count = 0
            for tpl in templates:
                lang = tpl.get("language")
                code = tpl.get("template_code", "")
                if cls.is_generic_template(code, lang):
                    generic_count += 1

            if generic_count == len(templates):
                errors.append("Language templates extraction failed (only found generic placeholders).")

        # 5. Test Cases and Sample Outputs Validation
        test_cases = dto.get("test_cases", [])
        sample_cases = [tc for tc in test_cases if tc.get("is_sample", False)]

        if not sample_cases:
            errors.append("No sample test cases extracted.")
        else:
            for idx, tc in enumerate(sample_cases):
                expected = tc.get("expected_output", "").strip()
                if not expected or expected == "null" or expected == '"null"' or expected == '""':
                    errors.append(f"Sample output for test case {idx + 1} is missing or is placeholder 'null'.")

        # 6. Constraints Validation (if constraints section is present)
        if description:
            desc_clean = cls._strip_html(description)
            # Look for word "Constraints"
            match = re.search(r"\bConstraints\b:?\s*(.*)", desc_clean, re.IGNORECASE)
            if match:
                constraints_content = match.group(1).strip()
                # Remove subsequent sections if they appear in content (e.g. Examples/Input/Output)
                clean_content = re.sub(r"\b(?:Example|Input|Output|Explanation)\b.*", "", constraints_content, flags=re.IGNORECASE).strip()
                # If constraints header is present but empty or too short
                if not clean_content or len(clean_content) < 3:
                    errors.append("Constraints section is empty or contains no valid rules.")

        if errors:
            raise ProblemImportValidationError(
                message="Import validation failed: " + " | ".join(errors),
                errors=errors
            )
