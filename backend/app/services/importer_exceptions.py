class ImporterException(Exception):
    """Base exception for all import issues."""
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message

class ImportNetworkError(ImporterException):
    """Exception raised on network timeouts, DNS resolution issues, or connection errors."""
    pass

class ImportProviderUnavailableError(ImporterException):
    """Exception raised when the source provider (e.g. GeeksforGeeks, LeetCode) is unreachable, rate-limited, or blocks requests."""
    pass

class ImportParserError(ImporterException):
    """Exception raised when parsing the raw response/webpage fails."""
    pass

class ProblemImportValidationError(ImporterException):
    """Exception raised when an imported problem fails validation checks."""
    def __init__(self, message: str, errors: list[str] = None):
        super().__init__(message)
        self.errors = errors or [message]
        self.message = message

class ImportValidationError(ProblemImportValidationError):
    """Exception raised when the parsed problem data fails validations."""
    pass

class ImportDatabaseError(ImporterException):
    """Exception raised when saving the parsed problem model to the database fails."""
    pass

class ImportNotFoundError(ImporterException):
    """Exception raised when the requested problem truly does not exist on the provider."""
    pass

# Older classes preserved for backward compatibility
class ProviderUnavailableException(ImportProviderUnavailableError):
    pass

class ProblemNotFoundException(ImportNotFoundError):
    pass

class ImportFailedException(ImporterException):
    """Fallback base / old class for backward compatibility."""
    pass

class AmbiguousProblemException(Exception):
    """Exception raised when the importer finds multiple high-confidence ambiguous matches."""
    def __init__(self, message: str, candidates: list[dict]):
        super().__init__(message)
        self.message = message
        self.candidates = candidates

