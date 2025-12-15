"""
Async tools wrappers (thin adapter)
"""
from typing import Dict, Any
from app.mcp.bria_client_async import BriaMCPClientAsync
import logging

logger = logging.getLogger("tools_async")
logger.setLevel(logging.INFO)


class BriaToolsAsync:
    def __init__(self, client: BriaMCPClientAsync):
        self.client = client

    async def onboard_image(self, image_url: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        logger.info("onboard_image %s", image_url)
        return await self.client.image_onboard(image_url, metadata)

    async def edit_image(self, asset_id: str, operation: str, params: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("edit_image %s %s", asset_id, operation)
        return await self.client.image_edit(asset_id, operation, params)

    async def generate_image(self, prompt: str, settings: Dict[str, Any] = None) -> Dict[str, Any]:
        logger.info("generate_image")
        return await self.client.image_generate(prompt, settings)

    async def edit_video(self, asset_id: str, operation: str, params: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("edit_video")
        return await self.client.video_edit(asset_id, operation, params)

    async def poll_status(self, request_id: str) -> Dict[str, Any]:
        return await self.client.poll_status(request_id)

