"""
Retry and Error Recovery Utilities
Provides robust retry mechanisms with exponential backoff for agent operations.
"""

import logging
import asyncio
from typing import Callable, Awaitable, TypeVar, Optional, List
from functools import wraps
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

T = TypeVar('T')


class RetryConfig:
    """Configuration for retry behavior."""
    
    def __init__(
        self,
        max_attempts: int = 3,
        initial_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True,
        retryable_exceptions: Optional[List[type]] = None,
    ):
        self.max_attempts = max_attempts
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
        self.retryable_exceptions = retryable_exceptions or [
            ConnectionError,
            TimeoutError,
            asyncio.TimeoutError,
        ]


def calculate_delay(attempt: int, config: RetryConfig) -> float:
    """Calculate delay for retry attempt with exponential backoff."""
    delay = config.initial_delay * (config.exponential_base ** (attempt - 1))
    delay = min(delay, config.max_delay)
    
    if config.jitter:
        import random
        # Add ±25% jitter to prevent thundering herd
        jitter_amount = delay * 0.25 * (random.random() * 2 - 1)
        delay = max(0.1, delay + jitter_amount)
    
    return delay


async def retry_with_backoff(
    func: Callable[[], Awaitable[T]],
    config: Optional[RetryConfig] = None,
    operation_name: str = "operation",
) -> T:
    """
    Retry an async function with exponential backoff.
    
    Args:
        func: Async function to retry
        config: Retry configuration
        operation_name: Name of operation for logging
    
    Returns:
        Result of function call
    
    Raises:
        Last exception if all retries exhausted
    """
    config = config or RetryConfig()
    last_exception = None
    
    for attempt in range(1, config.max_attempts + 1):
        try:
            result = await func()
            if attempt > 1:
                logger.info(
                    f"{operation_name} succeeded on attempt {attempt}/{config.max_attempts}"
                )
            return result
        
        except Exception as e:
            last_exception = e
            
            # Check if exception is retryable
            if not any(isinstance(e, exc_type) for exc_type in config.retryable_exceptions):
                logger.warning(
                    f"{operation_name} failed with non-retryable exception: {type(e).__name__}"
                )
                raise
            
            if attempt < config.max_attempts:
                delay = calculate_delay(attempt, config)
                logger.warning(
                    f"{operation_name} failed (attempt {attempt}/{config.max_attempts}): {e}. "
                    f"Retrying in {delay:.2f}s..."
                )
                await asyncio.sleep(delay)
            else:
                logger.error(
                    f"{operation_name} failed after {config.max_attempts} attempts: {e}"
                )
    
    raise last_exception


def retryable(
    config: Optional[RetryConfig] = None,
    operation_name: Optional[str] = None,
):
    """
    Decorator to make an async function retryable.
    
    Usage:
        @retryable(config=RetryConfig(max_attempts=5))
        async def my_agent_function():
            ...
    """
    def decorator(func: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            op_name = operation_name or f"{func.__name__}"
            return await retry_with_backoff(
                lambda: func(*args, **kwargs),
                config=config,
                operation_name=op_name,
            )
        return wrapper
    return decorator


class CircuitBreaker:
    """Circuit breaker pattern for preventing cascading failures."""
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        half_open_max_calls: int = 3,
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls
        
        self.failure_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.state = "closed"  # closed, open, half_open
        self.half_open_calls = 0
    
    async def call(self, func: Callable[[], Awaitable[T]], operation_name: str = "operation") -> T:
        """
        Execute function with circuit breaker protection.
        
        Args:
            func: Async function to execute
            operation_name: Name for logging
        
        Returns:
            Function result
        
        Raises:
            CircuitBreakerOpen: If circuit is open
            Original exception if function fails
        """
        # Check circuit state
        if self.state == "open":
            if self.last_failure_time:
                time_since_failure = (datetime.utcnow() - self.last_failure_time).total_seconds()
                if time_since_failure >= self.recovery_timeout:
                    logger.info(f"Circuit breaker for {operation_name} transitioning to half-open")
                    self.state = "half_open"
                    self.half_open_calls = 0
                else:
                    raise CircuitBreakerOpen(
                        f"Circuit breaker is open for {operation_name}. "
                        f"Retry after {self.recovery_timeout - time_since_failure:.1f}s"
                    )
            else:
                raise CircuitBreakerOpen(f"Circuit breaker is open for {operation_name}")
        
        if self.state == "half_open":
            if self.half_open_calls >= self.half_open_max_calls:
                logger.warning(f"Circuit breaker for {operation_name} re-opening after half-open failures")
                self.state = "open"
                self.last_failure_time = datetime.utcnow()
                raise CircuitBreakerOpen(f"Circuit breaker re-opened for {operation_name}")
        
        # Execute function
        try:
            result = await func()
            
            # Success - reset circuit breaker
            if self.state == "half_open":
                logger.info(f"Circuit breaker for {operation_name} closing after successful half-open call")
                self.state = "closed"
                self.half_open_calls = 0
            
            self.failure_count = 0
            return result
        
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = datetime.utcnow()
            
            if self.failure_count >= self.failure_threshold:
                logger.error(
                    f"Circuit breaker for {operation_name} opening after {self.failure_count} failures"
                )
                self.state = "open"
            
            if self.state == "half_open":
                self.half_open_calls += 1
            
            raise


class CircuitBreakerOpen(Exception):
    """Exception raised when circuit breaker is open."""
    pass

