"""
Async tools wrappers (thin adapter for BriaMCPClientAsync)
"""
from typing import Dict, Any, Optional
from app.mcp.bria_client_async import BriaMCPClientAsync
import logging

logger = logging.getLogger("tools_async")
logger.setLevel(logging.INFO)


class BriaToolsAsync:
    """
    Async tools wrapper for Bria MCP operations.
    Provides unified interface for executor agent.
    """
    
    def __init__(self, client: BriaMCPClientAsync):
        self.client = client

    async def onboard_image(self, image_url: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Onboard image to Bria asset library."""
        logger.info("onboard_image %s", image_url)
        return await self.client.image_onboard(image_url, metadata)

    async def edit_image(self, asset_id: str, operation: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Edit image with specified operation."""
        logger.info("edit_image %s %s", asset_id, operation)
        return await self.client.image_edit(asset_id, operation, params)

    async def generate_image(
        self,
        prompt: Optional[str] = None,
        structured_prompt: Optional[Dict[str, Any]] = None,
        settings: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate image(s) using Bria FIBO."""
        logger.info("generate_image")
        return await self.client.image_generate(
            prompt=prompt,
            structured_prompt=structured_prompt,
            settings=settings
        )

    async def edit_video(self, asset_id: str, operation: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Edit video with specified operation."""
        logger.info("edit_video %s %s", asset_id, operation)
        return await self.client.video_edit(asset_id, operation, params)
    
    async def product_shot_edit(
        self,
        asset_id: str,
        operation: str = "relight",
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Edit product shot (relight, background, AOVs)."""
        logger.info("product_shot_edit %s %s", asset_id, operation)
        return await self.client.product_shot_edit(asset_id, operation, params)
    
    async def ads_generate(
        self,
        template_id: Optional[str] = None,
        brand_id: Optional[str] = None,
        prompt: Optional[str] = None,
        structured_prompt: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate advertisement images."""
        logger.info("ads_generate")
        return await self.client.ads_generate(
            template_id=template_id,
            brand_id=brand_id,
            prompt=prompt,
            structured_prompt=structured_prompt,
            **kwargs
        )

    async def poll_status(self, request_id: str) -> Dict[str, Any]:
        """Poll status of async operation."""
        return await self.client.poll_status(request_id)


