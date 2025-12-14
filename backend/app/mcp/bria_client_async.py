# app/mcp/bria_client_async.py
import os
import logging
from typing import Dict, Any, Optional
from clients.bria_client import BriaClient

logger = logging.getLogger(__name__)

class BriaMCPClientAsync:
    """Async wrapper for Bria MCP client."""
    
    def __init__(self):
        api_token = os.getenv("BRIA_API_TOKEN") or os.getenv("BRIA_API_KEY")
        base_url = os.getenv("BRIA_API_URL", "https://engine.prod.bria-api.com/v2")
        
        if not api_token:
            logger.warning("BRIA_API_TOKEN not set, using stub mode")
            self._stub_mode = True
            self.client = None
        else:
            self._stub_mode = False
            self.client = BriaClient(api_token=api_token, base_url=base_url)
            self._client_context = None
    
    async def __aenter__(self):
        if not self._stub_mode and self.client:
            self._client_context = self.client.__aenter__()
            return self
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._client_context:
            await self.client.__aexit__(exc_type, exc_val, exc_tb)
    
    async def _call_mcp_async(self, method: str, **kwargs) -> Dict[str, Any]:
        """Call MCP method (stub if no token)."""
        if self._stub_mode:
            logger.info(f"Stub MCP call: {method}")
            return {"status": "stub", "request_id": f"stub_{method}_{hash(str(kwargs))}"}
        
        if not self.client:
            raise RuntimeError("Client not initialized")
        
        # Map method names to BriaClient methods
        if method == "image_onboard":
            return await self.client.onboard_image(**kwargs)
        elif method == "image_edit":
            return await self.client.edit_image(**kwargs)
        elif method == "image_generate":
            return await self.client.generate_image(**kwargs)
        elif method == "poll_status":
            return await self.client.get_status(**kwargs)
        else:
            raise ValueError(f"Unknown MCP method: {method}")
    
    async def poll_status(self, request_id: str) -> Dict[str, Any]:
        """Poll status of a Bria request."""
        if self._stub_mode:
            return {"status": "completed", "request_id": request_id, "outputs": [{"url": "https://example.com/stub.jpg"}]}
        
        if not self.client:
            raise RuntimeError("Client not initialized")
        
        # Use the existing status polling from BriaClient
        try:
            status = await self.client.get_status(request_id)
            return status
        except Exception as e:
            logger.error(f"Status poll failed: {e}")
            return {"status": "error", "error": str(e)}
