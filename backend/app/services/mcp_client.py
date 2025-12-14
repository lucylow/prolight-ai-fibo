"""
MCP Client Service - Bria MCP Server Integration
Handles communication with Bria MCP Server via Anthropic SDK.
"""

import os
import logging
from typing import Optional, Dict, Any, List
from anthropic import Anthropic
from anthropic.types.beta import (
    BetaMessageParam,
    BetaRequestMCPServerURLDefinitionParam,
)

from app.core.config import settings

logger = logging.getLogger(__name__)


class BriaMCPClient:
    """
    Client for interacting with Bria MCP Server via Anthropic SDK.
    
    This client enables ProLight AI agents to use Bria's visual AI capabilities
    through the Model Context Protocol (MCP), including:
    - Background removal and generation
    - Image expansion
    - Resolution increase
    - Image generation and reimagining
    """

    def __init__(self):
        """Initialize Bria MCP client."""
        self.anthropic_api_key = settings.ANTHROPIC_API_KEY
        self.bria_auth_token = settings.BRIA_AUTH_TOKEN or settings.BRIA_API_KEY
        
        if not self.anthropic_api_key:
            logger.warning("ANTHROPIC_API_KEY not configured - MCP features will be unavailable")
            self.client = None
        else:
            self.client = Anthropic(api_key=self.anthropic_api_key)
        
        self.mcp_server_url = settings.BRIA_MCP_URL
        self.model = "claude-3-5-sonnet-20241022"  # Latest Claude model
        
    def _get_mcp_server_config(self) -> Optional[BetaRequestMCPServerURLDefinitionParam]:
        """Get MCP server configuration."""
        if not self.client or not self.bria_auth_token:
            return None
            
        return BetaRequestMCPServerURLDefinitionParam(
            type="url",
            name="bria",
            url=self.mcp_server_url,
            authorization_token=self.bria_auth_token
        )
    
    async def call_mcp(
        self,
        prompt: str,
        max_tokens: int = 1024,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Call Bria MCP server with a prompt.
        
        Args:
            prompt: The prompt to send to the MCP server
            max_tokens: Maximum tokens in response
            model: Optional model override
            
        Returns:
            Response from MCP server
            
        Raises:
            ValueError: If MCP client is not configured
        """
        if not self.client:
            raise ValueError("Anthropic client not initialized. Set ANTHROPIC_API_KEY.")
        
        mcp_config = self._get_mcp_server_config()
        if not mcp_config:
            raise ValueError("Bria MCP not configured. Set BRIA_AUTH_TOKEN or BRIA_API_KEY.")
        
        try:
            response = self.client.beta.messages.create(
                model=model or self.model,
                max_tokens=max_tokens,
                messages=[
                    BetaMessageParam(role="user", content=prompt)
                ],
                mcp_servers=[mcp_config],
                betas=["mcp-client-2025-10-01"],
            )
            
            # Extract text content from response
            text_content = ""
            if response.content:
                for content_block in response.content:
                    if hasattr(content_block, 'text'):
                        text_content += content_block.text
            
            return {
                "content": text_content,
                "model": response.model,
                "usage": {
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                } if hasattr(response, 'usage') and response.usage else None
            }
        except Exception as e:
            logger.error(f"Error calling Bria MCP: {e}")
            raise
    
    async def list_available_tools(self) -> List[str]:
        """
        List available Bria tools via MCP.
        
        Returns:
            List of available tool names
        """
        prompt = "What Bria tools are available to me? List all available image editing and generation capabilities."
        try:
            response = await self.call_mcp(prompt)
            return response.get("content", "").split("\n")
        except Exception as e:
            logger.error(f"Error listing Bria tools: {e}")
            return []
    
    async def execute_image_edit(
        self,
        operation: str,
        image_url: Optional[str] = None,
        image_base64: Optional[str] = None,
        parameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute an image editing operation via Bria MCP.
        
        Args:
            operation: Operation type (e.g., "remove_background", "expand", "enhance")
            image_url: URL of the image to edit
            image_base64: Base64-encoded image
            parameters: Additional operation parameters
            
        Returns:
            Result with edited image URL or data
        """
        if not image_url and not image_base64:
            raise ValueError("Either image_url or image_base64 must be provided")
        
        image_ref = image_url if image_url else f"data:image/png;base64,{image_base64}"
        params_str = ""
        if parameters:
            params_str = f" with parameters: {parameters}"
        
        prompt = f"""
Execute the following image edit operation using Bria tools:
Operation: {operation}
Image: {image_ref}
{params_str}

Return the result with the edited image URL or data.
"""
        
        return await self.call_mcp(prompt, max_tokens=2048)


# Global MCP client instance
_mcp_client: Optional[BriaMCPClient] = None


def get_mcp_client() -> BriaMCPClient:
    """Get or create global MCP client instance."""
    global _mcp_client
    if _mcp_client is None:
        _mcp_client = BriaMCPClient()
    return _mcp_client
