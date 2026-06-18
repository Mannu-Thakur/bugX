class ImporterException(Exception):
    """Base exception for all import issues."""
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message

class ProviderUnavailableException(ImporterException):
    """Exception raised when the source provider (e.g. GeeksforGeeks, LeetCode) is unreachable, rate-limited, or blocks requests."""
    pass

class ProblemNotFoundException(ImporterException):
    """Exception raised when the requested problem truly does not exist on the provider."""
    pass

class ImportFailedException(ImporterException):
    """Exception raised when the problem page was loaded but parsing, validation, or DB saving failed."""
    pass

class AmbiguousProblemException(Exception):
    """Exception raised when the importer finds multiple high-confidence ambiguous matches."""
    def __init__(self, message: str, candidates: list[dict]):
        super().__init__(message)
        self.message = message
        self.candidates = candidates

