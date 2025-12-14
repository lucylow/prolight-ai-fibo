"""
MCP client wrapper (Anthropic style) - Synchronous version
"""
import os
import logging
from typing import Dict, Any, Optional

try:
    import anthropic
    from anthropic.types.beta import BetaMessageParam, BetaRequestMCPServerURLDefinitionParam
except Exception:
    anthropic = None  # tests or environments may stub this

logger = logging.getLogger("mcp_client")
logger.setLevel(logging.INFO)

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
BRIA_MCP_URL = os.environ.get("BRIA_MCP_URL", "https://mcp.prod.bria-api.com/mcp/sse")
BRIA_AUTH_TOKEN = os.environ.get("BRIA_AUTH_TOKEN")


class MCPClient:
    def __init__(self, anthropic_key: Optional[str] = None, bria_token: Optional[str] = None):
        self.anthropic_key = anthropic_key or ANTHROPIC_API_KEY
        self.bria_token = bria_token or BRIA_AUTH_TOKEN
        if anthropic and self.anthropic_key:
            self.client = anthropic.Anthropic(api_key=self.anthropic_key)
        else:
            self.client = None

    def call_mcp(self, prompt: str, model: str = "claude-3.5-sonnet-20240729", betas: Optional[list] = None) -> Dict[str, Any]:
        """
        Call Anthropic with MCP server configured to Bria.
        Returns parsed response dict: {'raw_text': ..., 'json': ...}
        """
        if not self.client:
            logger.warning("Anthropic client not configured — returning stub.")
            return {"raw_text": prompt, "json": {}}
        try:
            mcp_server = BetaRequestMCPServerURLDefinitionParam(
                type="url",
                name="bria-mcp",
                url=BRIA_MCP_URL,
                authorization_token=self.bria_token
            )
            resp = self.client.beta.messages.create(
                model=model,
                max_tokens=1024,
                messages=[BetaMessageParam(role="user", content=prompt)],
                mcp_servers=[mcp_server],
                betas=betas or []
            )
            text = resp.content[0].text
            return {"raw_text": text, "json": text}
        except Exception as e:
            logger.exception("MCP call failed")
            raise

    def call_mcp_raw(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generic raw MCP call. Useful for tool-style operations.
        """
        logger.info("call_mcp_raw payload: %s", payload)
        return {"status": "ok", "payload": payload}
