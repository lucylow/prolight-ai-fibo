"""
Guardrail Error Classes
"""


class GuardrailError(Exception):
    """Exception raised when a guardrail rule is violated."""
    
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)
    
    def to_dict(self):
        """Convert error to dictionary."""
        return {
            "code": self.code,
            "message": self.message,
        }

