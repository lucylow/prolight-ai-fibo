"""
Tool wrappers for operations (e.g., image onboarding, edit endpoints)
These are thin adapters that call MCP's products/tools or your internal endpoints.
"""
import logging
from typing import Dict, Any

logger = logging.getLogger("agents.tools")


class ToolsClient:
    def __init__(self, mcp_client):
        self.mcp = mcp_client

    def onboard_image(self, image_url: str) -> Dict[str, Any]:
        # Example: call Bria's image onboarding via MCP
        payload = {
            "tool": "image_onboard",
            "image_url": image_url
        }
        logger.info("onboard_image payload %s", payload)
        return self.mcp.call_mcp_raw(payload)

    def edit_image(self, asset_id: str, op: str, params: Dict[str, Any]):
        payload = {
            "tool": "image_edit",
            "asset_id": asset_id,
            "operation": op,
            "params": params
        }
        return self.mcp.call_mcp_raw(payload)

    def generate_image(self, prompt: str, settings: Dict[str, Any] = None):
        payload = {"tool": "image_generate", "prompt": prompt, "settings": settings or {}}
        return self.mcp.call_mcp_raw(payload)
