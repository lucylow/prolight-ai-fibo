"""
Bria MCP Client - Wrapper for all Bria API tools.
Provides async interface for image onboarding, editing, generation, video editing, etc.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from clients.bria_client import BriaClient, BriaAPIError, BriaTimeoutError

logger = logging.getLogger(__name__)


class BriaToolsAsync:
    """
    Async wrapper for Bria API tools.
    Provides unified interface for all Bria capabilities.
    """
    
    def __init__(self, api_token: str, base_url: str = "https://engine.prod.bria-api.com/v2"):
        """
        Initialize Bria tools client.
        
        Args:
            api_token: Bria API token
            base_url: Bria API base URL
        """
        self.client = BriaClient(api_token=api_token, base_url=base_url)
        self._client_context = None
    
    async def __aenter__(self):
        """Async context manager entry."""
        self._client_context = self.client.__aenter__()
        await self._client_context
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self._client_context:
            await self.client.__aexit__(exc_type, exc_val, exc_tb)
    
    # ============================================================================
    # Image Onboarding
    # ============================================================================
    
    async def image_onboard(
        self,
        image_url: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Onboard an image to Bria asset library.
        
        Args:
            image_url: URL of image to onboard
            metadata: Optional metadata (tags, category, etc.)
            
        Returns:
            Dict with asset_id, thumbnails, moderation_result
        """
        try:
            # Bria image onboarding endpoint
            # Note: Adjust endpoint based on actual Bria API
            payload = {
                "image_url": image_url,
                "metadata": metadata or {}
            }
            
            # Use BriaClient's _make_request for flexibility
            result = await self.client._make_request(
                "POST",
                "/image/onboard",
                payload
            )
            
            return {
                "asset_id": result.get("asset_id"),
                "thumbnails": result.get("thumbnails", []),
                "moderation_result": result.get("moderation", {}),
                "success": True
            }
        except BriaAPIError as e:
            logger.error(f"Image onboarding failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "error_type": "BriaAPIError"
            }
    
    # ============================================================================
    # Image Editing
    # ============================================================================
    
    async def image_edit(
        self,
        image_url: str,
        operation: str,
        params: Optional[Dict[str, Any]] = None,
        sync: bool = False
    ) -> Dict[str, Any]:
        """
        Edit an image (remove background, expand, gen-fill, enhance, etc.).
        
        Args:
            image_url: URL of image to edit
            operation: Operation type (remove_background, expand, gen_fill, enhance, etc.)
            params: Operation-specific parameters
            sync: Whether to wait for completion
            
        Returns:
            Dict with request_id (async) or result_url (sync)
        """
        try:
            payload = {
                "image_url": image_url,
                "operation": operation,
                "sync": sync,
                **(params or {})
            }
            
            result = await self.client._make_request(
                "POST",
                f"/image/edit/{operation}",
                payload
            )
            
            if sync:
                return {
                    "success": True,
                    "result_url": result.get("result_url"),
                    "result": result
                }
            else:
                return {
                    "success": True,
                    "request_id": result.get("request_id"),
                    "status_url": result.get("status_url")
                }
        except BriaAPIError as e:
            logger.error(f"Image edit failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "error_type": "BriaAPIError"
            }
    
    # ============================================================================
    # Image Generation
    # ============================================================================
    
    async def image_generate(
        self,
        prompt: Optional[str] = None,
        structured_prompt: Optional[Dict[str, Any]] = None,
        num_results: int = 1,
        sync: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate image(s) using Bria FIBO.
        
        Args:
            prompt: Text prompt
            structured_prompt: FIBO JSON structured prompt
            num_results: Number of images to generate
            sync: Whether to wait for completion
            **kwargs: Additional generation parameters
            
        Returns:
            Dict with request_id (async) or images (sync)
        """
        try:
            result = await self.client.generate_image(
                prompt=prompt,
                structured_prompt=structured_prompt,
                num_results=num_results,
                sync=sync,
                **kwargs
            )
            
            if sync:
                return {
                    "success": True,
                    "images": result.get("images", []),
                    "structured_prompt": result.get("structured_prompt"),
                    "result": result
                }
            else:
                return {
                    "success": True,
                    "request_id": result.get("request_id"),
                    "status_url": result.get("status_url")
                }
        except BriaAPIError as e:
            logger.error(f"Image generation failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "error_type": "BriaAPIError"
            }
    
    # ============================================================================
    # Video Editing
    # ============================================================================
    
    async def video_edit(
        self,
        video_url: str,
        operation: str,
        params: Optional[Dict[str, Any]] = None,
        sync: bool = False
    ) -> Dict[str, Any]:
        """
        Edit a video (upscale, remove background, etc.).
        
        Args:
            video_url: URL of video to edit
            operation: Operation type (upscale, remove_background, etc.)
            params: Operation-specific parameters
            sync: Whether to wait for completion
            
        Returns:
            Dict with request_id (async) or result_url (sync)
        """
        try:
            payload = {
                "video_url": video_url,
                "operation": operation,
                "sync": sync,
                **(params or {})
            }
            
            result = await self.client._make_request(
                "POST",
                f"/video/edit/{operation}",
                payload
            )
            
            if sync:
                return {
                    "success": True,
                    "result_url": result.get("result_url"),
                    "result": result
                }
            else:
                return {
                    "success": True,
                    "request_id": result.get("request_id"),
                    "status_url": result.get("status_url")
                }
        except BriaAPIError as e:
            logger.error(f"Video edit failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "error_type": "BriaAPIError"
            }
    
    # ============================================================================
    # Tailored Generation
    # ============================================================================
    
    async def tailored_generate(
        self,
        model_id: str,
        prompt: Optional[str] = None,
        structured_prompt: Optional[Dict[str, Any]] = None,
        num_results: int = 1,
        sync: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate image(s) using tailored model.
        
        Args:
            model_id: Tailored model ID
            prompt: Text prompt
            structured_prompt: FIBO JSON structured prompt
            num_results: Number of images to generate
            sync: Whether to wait for completion
            **kwargs: Additional parameters
            
        Returns:
            Dict with request_id (async) or images (sync)
        """
        try:
            payload = {
                "model_id": model_id,
                "num_results": num_results,
                "sync": sync,
                **(kwargs or {})
            }
            
            if prompt:
                payload["prompt"] = prompt
            if structured_prompt:
                payload["structured_prompt"] = structured_prompt
            
            result = await self.client._make_request(
                "POST",
                "/tailored/generate",
                payload
            )
            
            if sync:
                return {
                    "success": True,
                    "images": result.get("images", []),
                    "result": result
                }
            else:
                return {
                    "success": True,
                    "request_id": result.get("request_id"),
                    "status_url": result.get("status_url")
                }
        except BriaAPIError as e:
            logger.error(f"Tailored generation failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "error_type": "BriaAPIError"
            }
    
    # ============================================================================
    # Ads Generation
    # ============================================================================
    
    async def ads_generate(
        self,
        template_id: Optional[str] = None,
        brand_id: Optional[str] = None,
        product_name: str = "",
        campaign_type: str = "social",
        formats: Optional[List[str]] = None,
        num_variants: int = 1,
        sync: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate ad variants.
        
        Args:
            template_id: Template ID (optional)
            brand_id: Brand ID (optional)
            product_name: Product name
            campaign_type: Campaign type (social, display, etc.)
            formats: Output formats (facebook, instagram, etc.)
            num_variants: Number of variants to generate
            sync: Whether to wait for completion
            **kwargs: Additional parameters
            
        Returns:
            Dict with request_id (async) or variants (sync)
        """
        try:
            payload = {
                "product_name": product_name,
                "campaign_type": campaign_type,
                "formats": formats or ["facebook"],
                "num_variants": num_variants,
                "sync": sync,
                **(kwargs or {})
            }
            
            if template_id:
                payload["template_id"] = template_id
            if brand_id:
                payload["brand_id"] = brand_id
            
            result = await self.client._make_request(
                "POST",
                "/ads/generate",
                payload
            )
            
            if sync:
                return {
                    "success": True,
                    "variants": result.get("variants", []),
                    "result": result
                }
            else:
                return {
                    "success": True,
                    "request_id": result.get("request_id"),
                    "status_url": result.get("status_url")
                }
        except BriaAPIError as e:
            logger.error(f"Ads generation failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "error_type": "BriaAPIError"
            }
    
    # ============================================================================
    # Product Shot Editing
    # ============================================================================
    
    async def product_shot_edit(
        self,
        image_url: str,
        lighting_setup: Optional[str] = None,
        background: Optional[str] = None,
        generate_aovs: bool = False,
        sync: bool = False,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Edit product shot (relight, background removal, AOV generation).
        
        Args:
            image_url: URL of product image
            lighting_setup: Lighting setup description
            background: Background description
            generate_aovs: Whether to generate AOVs
            sync: Whether to wait for completion
            **kwargs: Additional parameters
            
        Returns:
            Dict with request_id (async) or result (sync)
        """
        try:
            payload = {
                "image_url": image_url,
                "generate_aovs": generate_aovs,
                "sync": sync,
                **(kwargs or {})
            }
            
            if lighting_setup:
                payload["lighting_setup"] = lighting_setup
            if background:
                payload["background"] = background
            
            result = await self.client._make_request(
                "POST",
                "/product_shot/edit",
                payload
            )
            
            if sync:
                return {
                    "success": True,
                    "result_url": result.get("result_url"),
                    "aovs": result.get("aovs", []),
                    "result": result
                }
            else:
                return {
                    "success": True,
                    "request_id": result.get("request_id"),
                    "status_url": result.get("status_url")
                }
        except BriaAPIError as e:
            logger.error(f"Product shot edit failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "error_type": "BriaAPIError"
            }
    
    # ============================================================================
    # Status Service
    # ============================================================================
    
    async def poll_status(self, request_id: str) -> Dict[str, Any]:
        """
        Poll status of an async job.
        
        Args:
            request_id: Request ID from async operation
            
        Returns:
            Dict with status (IN_PROGRESS, COMPLETED, ERROR, UNKNOWN) and result if completed
        """
        try:
            result = await self.client.get_job_status(request_id)
            
            return {
                "success": True,
                "status": result.get("status", "UNKNOWN"),
                "progress": result.get("progress", 0),
                "result": result.get("result"),
                "error": result.get("error"),
                "result_url": result.get("result_url"),
                "result_urls": result.get("result_urls", [])
            }
        except BriaAPIError as e:
            logger.error(f"Status poll failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "error_type": "BriaAPIError",
                "status": "ERROR"
            }
