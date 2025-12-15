"""
Bria FIBO API Client - Production-ready async client with retry logic.
Implements proper authentication, error handling, and exponential backoff.
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log
)


logger = logging.getLogger(__name__)


class BriaAuthError(Exception):
    """Raised when Bria API authentication fails."""
    pass


class BriaRateLimitError(Exception):
    """Raised when Bria API rate limit is exceeded."""
    pass


class BriaAPIError(Exception):
    """Raised for general Bria API errors."""
    pass


class BriaClient:
    """
    Async client for Bria FIBO API.
    Implements retry logic, proper error handling, and request/response logging.
    """
    
    def __init__(
        self,
        api_token: str,
        base_url: str = "https://engine.prod.bria-api.com/v2",
        timeout: float = 180.0,
        max_retries: int = 5
    ):
        """
        Initialize Bria client.
        
        Args:
            api_token: Bria API token
            base_url: Base URL for Bria API
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
        """
        self.api_token = api_token
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self.client: Optional[httpx.AsyncClient] = None
        
        # Request/response cache
        self._cache: Dict[str, Any] = {}
    
    async def __aenter__(self):
        """Async context manager entry."""
        self.client = httpx.AsyncClient(
            timeout=self.timeout,
            follow_redirects=True
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.client:
            await self.client.aclose()
    
    def _get_headers(self) -> Dict[str, str]:
        """
        Get request headers with authentication.
        
        Returns:
            Dict[str, str]: Headers with api_token
        """
        return {
            "api_token": self.api_token,
            "Content-Type": "application/json"
        }
    
    def _log_request(self, method: str, url: str, payload: Dict[str, Any]):
        """Log API request (without sensitive data)."""
        # Truncate large payloads
        payload_str = json.dumps(payload)
        if len(payload_str) > 1000:
            payload_str = payload_str[:1000] + "... (truncated)"
        
        logger.info(f"Bria API Request: {method} {url}")
        logger.debug(f"Payload: {payload_str}")
    
    def _log_response(self, status_code: int, response_body: str):
        """Log API response (without sensitive data)."""
        # Truncate large responses
        if len(response_body) > 1000:
            response_body = response_body[:1000] + "... (truncated)"
        
        logger.info(f"Bria API Response: {status_code}")
        logger.debug(f"Body: {response_body}")
    
    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=0.5, min=0.5, max=30),
        retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.RequestError)),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True
    )
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        payload: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Make HTTP request to Bria API with retry logic.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint (without base URL)
            payload: Request payload
            
        Returns:
            Dict[str, Any]: Response JSON
            
        Raises:
            BriaAuthError: Authentication failed
            BriaRateLimitError: Rate limit exceeded
            BriaAPIError: Other API errors
        """
        if not self.client:
            raise RuntimeError("Client not initialized. Use async context manager.")
        
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = self._get_headers()
        
        self._log_request(method, url, payload or {})
        
        try:
            if method.upper() == "GET":
                response = await self.client.get(url, headers=headers)
            elif method.upper() == "POST":
                response = await self.client.post(url, json=payload, headers=headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            self._log_response(response.status_code, response.text)
            
            # Handle specific status codes
            if response.status_code == 401:
                raise BriaAuthError(
                    "Bria authentication failed. Check BRIA_API_TOKEN for current environment."
                )
            elif response.status_code == 429:
                retry_after = response.headers.get("Retry-After", "60")
                raise BriaRateLimitError(
                    f"Bria API rate limit exceeded. Retry after {retry_after} seconds."
                )
            elif response.status_code in [500, 502, 503, 504]:
                # These will be retried by tenacity
                response.raise_for_status()
            elif response.status_code >= 400:
                error_detail = response.text[:500]
                raise BriaAPIError(
                    f"Bria API error {response.status_code}: {error_detail}"
                )
            
            return response.json()
        
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error: {e}")
            raise
        except httpx.RequestError as e:
            logger.error(f"Request error: {e}")
            raise
    
    async def generate_image(
        self,
        prompt: Optional[str] = None,
        structured_prompt: Optional[Dict[str, Any]] = None,
        images: Optional[list] = None,
        num_results: int = 1,
        sync: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate image using Bria FIBO API.
        
        Args:
            prompt: Text prompt (optional)
            structured_prompt: FIBO JSON structured prompt (optional)
            images: Reference images (optional)
            num_results: Number of images to generate
            sync: Whether to wait for completion (default: async)
            **kwargs: Additional parameters
            
        Returns:
            Dict[str, Any]: Generation result with request_id and status_url (async)
                           or image_url and structured_prompt (sync)
        """
        payload: Dict[str, Any] = {
            "num_results": num_results,
            "sync": sync
        }
        
        # Add input based on what's provided
        if structured_prompt:
            payload["structured_prompt"] = structured_prompt
        if prompt:
            payload["prompt"] = prompt
        if images:
            payload["images"] = images
        
        # Add any additional parameters
        payload.update(kwargs)
        
        result = await self._make_request("POST", "/image/generate", payload)
        return result
    
    async def generate_from_vlm(
        self,
        scene_prompt: str,
        lighting_override: Dict[str, Any],
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate image using VLM prompt-to-JSON pipeline with lighting override.
        
        This implements the core ProLight AI workflow:
        1. Use VLM to generate base structured prompt from scene description
        2. Override the lighting section with precise 3D-mapped lighting
        3. Generate final image with FIBO
        
        Args:
            scene_prompt: Natural language scene description
            lighting_override: FIBO lighting structure from lights_to_fibo_lighting()
            **kwargs: Additional generation parameters
            
        Returns:
            Dict[str, Any]: Generation result
        """
        # Step 1: Generate structured prompt from scene description
        # For now, we'll use the /image/generate endpoint which does VLM internally
        # In production, you might want to use /structured_prompt/generate first
        
        # Generate base structured prompt via VLM
        vlm_result = await self.generate_structured_prompt(
            prompt=scene_prompt,
            **kwargs
        )
        
        # Step 2: Extract structured prompt and override lighting
        if "structured_prompt" in vlm_result:
            structured_prompt = vlm_result["structured_prompt"]
        else:
            # Fallback: create minimal structured prompt
            structured_prompt = {
                "short_description": scene_prompt,
                "objects": [],
                "background": {"description": "professional studio backdrop"},
                "style": {"aesthetic": "professional", "mood": "neutral"}
            }
        
        # Override lighting section
        structured_prompt.update(lighting_override)
        
        # Step 3: Generate image with overridden lighting
        result = await self.generate_image(
            structured_prompt=structured_prompt,
            **kwargs
        )
        
        # Include the structured prompt in the result for transparency
        result["structured_prompt"] = structured_prompt
        
        return result
    
    async def generate_structured_prompt(
        self,
        prompt: Optional[str] = None,
        images: Optional[list] = None,
        sync: bool = True,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate structured JSON prompt from text/images using VLM.
        
        Args:
            prompt: Text prompt
            images: Reference images
            sync: Whether to wait for completion
            **kwargs: Additional parameters
            
        Returns:
            Dict[str, Any]: Result with structured_prompt
        """
        payload: Dict[str, Any] = {"sync": sync}
        
        if prompt:
            payload["prompt"] = prompt
        if images:
            payload["images"] = images
        
        payload.update(kwargs)
        
        result = await self._make_request("POST", "/structured_prompt/generate", payload)
        return result
    
    async def get_job_status(self, request_id: str) -> Dict[str, Any]:
        """
        Get status of an async generation job.
        
        Args:
            request_id: Request ID from async generation
            
        Returns:
            Dict[str, Any]: Job status (IN_PROGRESS, COMPLETED, ERROR, UNKNOWN)
        """
        result = await self._make_request("GET", f"/status/{request_id}")
        return result
    
    async def wait_for_completion(
        self,
        request_id: str,
        poll_interval: float = 2.0,
        max_wait: float = 300.0
    ) -> Dict[str, Any]:
        """
        Poll job status until completion.
        
        Args:
            request_id: Request ID from async generation
            poll_interval: Seconds between polls
            max_wait: Maximum seconds to wait
            
        Returns:
            Dict[str, Any]: Final result
            
        Raises:
            TimeoutError: If max_wait exceeded
            BriaAPIError: If job failed
        """
        start_time = datetime.now()
        
        while True:
            elapsed = (datetime.now() - start_time).total_seconds()
            if elapsed > max_wait:
                raise TimeoutError(f"Job {request_id} did not complete within {max_wait}s")
            
            status = await self.get_job_status(request_id)
            
            if status.get("status") == "COMPLETED":
                return status
            elif status.get("status") == "ERROR":
                error_msg = status.get("error", {}).get("message", "Unknown error")
                raise BriaAPIError(f"Job {request_id} failed: {error_msg}")
            elif status.get("status") == "UNKNOWN":
                raise BriaAPIError(f"Job {request_id} in unknown state")
            
            # Still in progress, wait and retry
            await asyncio.sleep(poll_interval)
    
    async def close(self):
        """Close HTTP client."""
        if self.client:
            await self.client.aclose()
