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
    def __init__(self, message: str = "Bria API authentication failed"):
        self.message = message
        super().__init__(self.message)


class BriaRateLimitError(Exception):
    """Raised when Bria API rate limit is exceeded."""
    def __init__(self, message: str = "Bria API rate limit exceeded", retry_after: Optional[int] = None):
        self.message = message
        self.retry_after = retry_after
        super().__init__(self.message)


class BriaAPIError(Exception):
    """Raised for general Bria API errors."""
    def __init__(self, message: str = "Bria API error", status_code: Optional[int] = None, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)
    
    def __str__(self) -> str:
        if self.status_code:
            return f"{self.message} (Status: {self.status_code})"
        return self.message


class BriaTimeoutError(Exception):
    """Raised when Bria API request times out."""
    def __init__(self, message: str = "Bria API request timed out", timeout: Optional[float] = None):
        self.message = message
        self.timeout = timeout
        super().__init__(self.message)


class BriaNetworkError(Exception):
    """Raised when network error occurs with Bria API."""
    def __init__(self, message: str = "Network error connecting to Bria API", original_error: Optional[Exception] = None):
        self.message = message
        self.original_error = original_error
        super().__init__(self.message)


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
        
        except httpx.TimeoutException as e:
            logger.error(f"Request timeout: {e}")
            raise BriaTimeoutError(
                f"Bria API request timed out after {self.timeout}s",
                timeout=self.timeout
            )
        except httpx.ConnectError as e:
            logger.error(f"Connection error: {e}")
            raise BriaNetworkError(
                "Failed to connect to Bria API. Check your network connection.",
                original_error=e
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error: {e}")
            # Re-raise as appropriate exception type
            if e.response.status_code == 401:
                raise BriaAuthError(
                    "Bria API authentication failed. Check BRIA_API_TOKEN for current environment."
                )
            elif e.response.status_code == 429:
                retry_after = e.response.headers.get("Retry-After")
                retry_seconds = int(retry_after) if retry_after else 60
                raise BriaRateLimitError(
                    f"Bria API rate limit exceeded. Retry after {retry_seconds} seconds.",
                    retry_after=retry_seconds
                )
            else:
                error_detail = e.response.text[:500] if e.response.text else str(e)
                raise BriaAPIError(
                    f"Bria API error {e.response.status_code}: {error_detail}",
                    status_code=e.response.status_code,
                    details={"response_text": error_detail}
                )
        except httpx.RequestError as e:
            logger.error(f"Request error: {e}")
            raise BriaNetworkError(
                f"Network error: {str(e)}",
                original_error=e
            )
    
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
        
        This follows Bria's recommended decoupled workflow:
        structured_prompt/generate → edit JSON → image/generate
        
        Args:
            scene_prompt: Natural language scene description
            lighting_override: FIBO lighting structure from lights_to_fibo_lighting()
            **kwargs: Additional generation parameters
            
        Returns:
            Dict[str, Any]: Generation result with structured_prompt included
        """
        # Step 1: Generate structured prompt from scene description
        # Use the dedicated /structured_prompt/generate endpoint (recommended by Bria)
        vlm_result = await self.generate_structured_prompt(
            prompt=scene_prompt,
            sync=True,  # Default to sync for prompt generation
            **{k: v for k, v in kwargs.items() if k not in ['sync', 'num_results']}
        )
        
        # Step 2: Extract structured prompt and override lighting
        if "structured_prompt" in vlm_result:
            structured_prompt = vlm_result["structured_prompt"].copy()
        else:
            # Fallback: create minimal structured prompt
            structured_prompt = {
                "short_description": scene_prompt,
                "objects": [],
                "background": {"description": "professional studio backdrop"},
                "style": {"aesthetic": "professional", "mood": "neutral"}
            }
        
        # Override lighting section (merge with existing lighting if present)
        if "lighting" in structured_prompt:
            if isinstance(structured_prompt["lighting"], dict):
                structured_prompt["lighting"].update(lighting_override)
            else:
                structured_prompt["lighting"] = lighting_override
        else:
            structured_prompt["lighting"] = lighting_override
        
        # Step 3: Generate image with overridden lighting
        result = await self.generate_image(
            structured_prompt=structured_prompt,
            **kwargs
        )
        
        # Include the structured prompt in the result for transparency and UI reflection
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
    
    async def text_to_image(
        self,
        prompt: Optional[str] = None,
        structured_prompt: Optional[Dict[str, Any]] = None,
        model_version: str = "v2",
        num_results: int = 1,
        sync: bool = False,
        seed: Optional[int] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate images using Bria's text-to-image pipeline (V1/V2).
        
        Args:
            prompt: Text prompt
            structured_prompt: FIBO JSON structured prompt
            model_version: Model version ("v1" or "v2")
            num_results: Number of images to generate
            sync: Whether to wait for completion
            seed: Optional seed for deterministic outputs
            **kwargs: Additional parameters
            
        Returns:
            Dict[str, Any]: Generation result
        """
        payload: Dict[str, Any] = {
            "num_results": num_results,
            "sync": sync,
            "model_version": model_version
        }
        
        if prompt:
            payload["prompt"] = prompt
        if structured_prompt:
            payload["structured_prompt"] = structured_prompt
        if seed is not None:
            payload["seed"] = seed
        
        payload.update(kwargs)
        
        result = await self._make_request("POST", "/text-to-image", payload)
        return result
    
    async def train_tailored_model(
        self,
        name: str,
        training_images: list,
        description: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Train a custom tailored model that preserves visual IP.
        
        Args:
            name: Model name
            training_images: List of image URLs or asset IDs for training
            description: Optional model description
            **kwargs: Additional training parameters
            
        Returns:
            Dict[str, Any]: Training job result with model_id
        """
        payload: Dict[str, Any] = {
            "name": name,
            "training_images": training_images
        }
        
        if description:
            payload["description"] = description
        
        payload.update(kwargs)
        
        result = await self._make_request("POST", "/tailored-gen/train", payload)
        return result
    
    async def get_tailored_model_status(self, model_id: str) -> Dict[str, Any]:
        """
        Get training status of a tailored model.
        
        Args:
            model_id: Model ID from training job
            
        Returns:
            Dict[str, Any]: Model status (training, completed, failed)
        """
        result = await self._make_request("GET", f"/tailored-gen/models/{model_id}")
        return result
    
    async def list_tailored_models(self) -> Dict[str, Any]:
        """
        List all tailored models for the account.
        
        Returns:
            Dict[str, Any]: List of models
        """
        result = await self._make_request("GET", "/tailored-gen/models")
        return result
    
    async def tailored_text_to_image(
        self,
        model_id: str,
        prompt: Optional[str] = None,
        structured_prompt: Optional[Dict[str, Any]] = None,
        num_results: int = 1,
        sync: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate images using a tailored model.
        
        Args:
            model_id: Tailored model ID
            prompt: Text prompt
            structured_prompt: FIBO JSON structured prompt
            num_results: Number of images to generate
            sync: Whether to wait for completion
            **kwargs: Additional parameters
            
        Returns:
            Dict[str, Any]: Generation result
        """
        payload: Dict[str, Any] = {
            "model_id": model_id,
            "num_results": num_results,
            "sync": sync
        }
        
        if prompt:
            payload["prompt"] = prompt
        if structured_prompt:
            payload["structured_prompt"] = structured_prompt
        
        payload.update(kwargs)
        
        result = await self._make_request("POST", "/tailored-gen/text-to-image", payload)
        return result
    
    async def reimagine(
        self,
        asset_id: Optional[str] = None,
        image_url: Optional[str] = None,
        prompt: Optional[str] = None,
        structured_prompt: Optional[Dict[str, Any]] = None,
        variations: int = 1,
        sync: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Reimagine an image with structured prompts for stylized variations.
        Can be used with or without tailored models.
        
        Perfect for:
        - Product packshot variations
        - Multi-format asset generation
        - Style transfer with lighting control
        - Automated crop/aspect ratio variants
        
        Args:
            asset_id: Bria asset ID (alternative to image_url)
            image_url: Source image URL (alternative to asset_id)
            prompt: Optional text prompt
            structured_prompt: FIBO JSON with lighting/composition overrides
            variations: Number of variations to generate
            sync: Whether to wait for completion
            **kwargs: Additional parameters
            
        Returns:
            Dict[str, Any]: Reimagine result with request_id (async) or image URLs (sync)
        """
        if not asset_id and not image_url:
            raise ValueError("Either asset_id or image_url must be provided")
        
        payload: Dict[str, Any] = {
            "sync": sync,
            "variations": variations
        }
        
        if asset_id:
            payload["asset_id"] = asset_id
        if image_url:
            payload["image_url"] = image_url
        if prompt:
            payload["prompt"] = prompt
        if structured_prompt:
            payload["structured_prompt"] = structured_prompt
        
        payload.update(kwargs)
        
        result = await self._make_request("POST", "/image/edit/reimagine", payload)
        return result
    
    async def reimagine_with_tailored_model(
        self,
        model_id: str,
        image_url: str,
        prompt: Optional[str] = None,
        structured_prompt: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Reimagine an image using a tailored model (legacy method for backward compatibility).
        
        Args:
            model_id: Tailored model ID
            image_url: Source image URL
            prompt: Optional text prompt
            structured_prompt: Optional FIBO JSON
            **kwargs: Additional parameters
            
        Returns:
            Dict[str, Any]: Reimagine result
        """
        payload: Dict[str, Any] = {
            "model_id": model_id,
            "image_url": image_url
        }
        
        if prompt:
            payload["prompt"] = prompt
        if structured_prompt:
            payload["structured_prompt"] = structured_prompt
        
        payload.update(kwargs)
        
        result = await self._make_request("POST", "/tailored-gen/reimagine", payload)
        return result
    
    async def generate_ads(
        self,
        template_id: Optional[str] = None,
        branding_blocks: Optional[list] = None,
        prompt: Optional[str] = None,
        structured_prompt: Optional[Dict[str, Any]] = None,
        brand_id: Optional[str] = None,
        sizes: Optional[list] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate advertisement images at scale with brand consistency.
        
        Args:
            template_id: Optional template ID
            branding_blocks: Branding elements (logos, fonts, colors)
            prompt: Ad description
            structured_prompt: FIBO JSON structured prompt
            brand_id: Brand ID for consistency
            sizes: List of ad sizes to generate
            **kwargs: Additional parameters
            
        Returns:
            Dict[str, Any]: Ads generation result
        """
        payload: Dict[str, Any] = {}
        
        if template_id:
            payload["template_id"] = template_id
        if branding_blocks:
            payload["branding_blocks"] = branding_blocks
        if prompt:
            payload["prompt"] = prompt
        if structured_prompt:
            payload["structured_prompt"] = structured_prompt
        if brand_id:
            payload["brand_id"] = brand_id
        if sizes:
            payload["sizes"] = sizes
        
        payload.update(kwargs)
        
        result = await self._make_request("POST", "/ads/generate", payload)
        return result
    
    async def product_shot_edit(
        self,
        asset_id: str,
        operation: str,
        params: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Edit product imagery (packshots, lifestyle, relighting).
        
        Args:
            asset_id: Bria asset ID
            operation: Operation type (isolate, add_shadow, packshot, replace_background, enhance_product)
            params: Operation-specific parameters
            **kwargs: Additional parameters
            
        Returns:
            Dict[str, Any]: Edit result
        """
        payload: Dict[str, Any] = {
            "asset_id": asset_id
        }
        
        if params:
            payload.update(params)
        payload.update(kwargs)
        
        result = await self._make_request("POST", f"/product/{operation}", payload)
        return result
    
    async def edit_image(
        self,
        asset_id: str,
        operation: str,
        params: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Edit and transform user images.
        
        Args:
            asset_id: Bria asset ID (from onboard_image)
            operation: Operation type (remove_background, expand, enhance, generative_fill, crop, mask, upscale, color_correction, noise_reduction)
            params: Operation-specific parameters
            **kwargs: Additional parameters
            
        Returns:
            Dict[str, Any]: Edit result
        """
        payload: Dict[str, Any] = {
            "asset_id": asset_id
        }
        
        if params:
            payload.update(params)
        payload.update(kwargs)
        
        result = await self._make_request("POST", f"/image/edit/{operation}", payload)
        return result
    
    async def onboard_image(self, image_url: str) -> Dict[str, Any]:
        """
        Onboard an image to Bria's asset system.
        
        Args:
            image_url: Image URL to onboard
            
        Returns:
            Dict[str, Any]: Onboard result with asset_id
        """
        payload = {"image_url": image_url}
        result = await self._make_request("POST", "/image/onboard", payload)
        return result
    
    async def edit_video(
        self,
        asset_id: str,
        operation: str,
        params: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Edit video content with advanced AI capabilities.
        
        Args:
            asset_id: Bria video asset ID
            operation: Operation type (increase_resolution, remove_background, enhance, etc.)
            params: Operation-specific parameters
            **kwargs: Additional parameters
            
        Returns:
            Dict[str, Any]: Video edit result
        """
        payload: Dict[str, Any] = {
            "asset_id": asset_id
        }
        
        if params:
            payload.update(params)
        payload.update(kwargs)
        
        result = await self._make_request("POST", f"/video/edit/{operation}", payload)
        return result
    
    async def close(self):
        """Close HTTP client."""
        if self.client:
            await self.client.aclose()
