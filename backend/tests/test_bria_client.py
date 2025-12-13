"""
Unit tests for Bria client.
Tests authentication, error handling, and retry logic.
"""

import pytest
import httpx
import respx
from clients.bria_client import (
    BriaClient,
    BriaAuthError,
    BriaRateLimitError,
    BriaAPIError
)


@pytest.mark.asyncio
class TestBriaClient:
    """Test BriaClient class."""
    
    async def test_client_initialization(self):
        """Test client initialization."""
        client = BriaClient(
            api_token="test_token",
            base_url="https://test.api.com/v2"
        )
        
        assert client.api_token == "test_token"
        assert client.base_url == "https://test.api.com/v2"
    
    async def test_get_headers(self):
        """Test header generation."""
        client = BriaClient(api_token="test_token")
        headers = client._get_headers()
        
        assert headers["api_token"] == "test_token"
        assert headers["Content-Type"] == "application/json"
    
    @respx.mock
    async def test_successful_image_generation(self):
        """Test successful image generation."""
        # Mock successful response
        respx.post("https://engine.prod.bria-api.com/v2/image/generate").mock(
            return_value=httpx.Response(
                200,
                json={
                    "request_id": "test_123",
                    "status_url": "https://api.bria.ai/status/test_123"
                }
            )
        )
        
        async with BriaClient(api_token="test_token") as client:
            result = await client.generate_image(
                prompt="a professional product shot",
                sync=False
            )
            
            assert result["request_id"] == "test_123"
            assert "status_url" in result
    
    @respx.mock
    async def test_auth_error_401(self):
        """Test 401 authentication error."""
        respx.post("https://engine.prod.bria-api.com/v2/image/generate").mock(
            return_value=httpx.Response(401, json={"error": "Unauthorized"})
        )
        
        async with BriaClient(api_token="invalid_token") as client:
            with pytest.raises(BriaAuthError) as exc_info:
                await client.generate_image(prompt="test")
            
            assert "authentication failed" in str(exc_info.value).lower()
    
    @respx.mock
    async def test_rate_limit_error_429(self):
        """Test 429 rate limit error."""
        respx.post("https://engine.prod.bria-api.com/v2/image/generate").mock(
            return_value=httpx.Response(
                429,
                json={"error": "Rate limit exceeded"},
                headers={"Retry-After": "60"}
            )
        )
        
        async with BriaClient(api_token="test_token") as client:
            with pytest.raises(BriaRateLimitError) as exc_info:
                await client.generate_image(prompt="test")
            
            assert "rate limit" in str(exc_info.value).lower()
            assert "60" in str(exc_info.value)
    
    @respx.mock
    async def test_generate_structured_prompt(self):
        """Test structured prompt generation."""
        respx.post("https://engine.prod.bria-api.com/v2/structured_prompt/generate").mock(
            return_value=httpx.Response(
                200,
                json={
                    "structured_prompt": {
                        "short_description": "A professional product shot",
                        "objects": [],
                        "lighting": {}
                    }
                }
            )
        )
        
        async with BriaClient(api_token="test_token") as client:
            result = await client.generate_structured_prompt(
                prompt="a professional product shot",
                sync=True
            )
            
            assert "structured_prompt" in result
            assert result["structured_prompt"]["short_description"] == "A professional product shot"
    
    @respx.mock
    async def test_get_job_status(self):
        """Test job status retrieval."""
        respx.get("https://engine.prod.bria-api.com/v2/status/test_123").mock(
            return_value=httpx.Response(
                200,
                json={
                    "status": "COMPLETED",
                    "result": {
                        "image_url": "https://example.com/image.png"
                    }
                }
            )
        )
        
        async with BriaClient(api_token="test_token") as client:
            result = await client.get_job_status("test_123")
            
            assert result["status"] == "COMPLETED"
            assert "image_url" in result["result"]
    
    @respx.mock
    async def test_server_error_500(self):
        """Test 500 server error with retry."""
        # First two attempts fail, third succeeds
        respx.post("https://engine.prod.bria-api.com/v2/image/generate").mock(
            side_effect=[
                httpx.Response(500, json={"error": "Internal server error"}),
                httpx.Response(500, json={"error": "Internal server error"}),
                httpx.Response(200, json={"request_id": "test_123"})
            ]
        )
        
        async with BriaClient(api_token="test_token") as client:
            result = await client.generate_image(prompt="test")
            
            # Should succeed after retries
            assert result["request_id"] == "test_123"
    
    @respx.mock
    async def test_generate_from_vlm_with_lighting_override(self):
        """Test VLM generation with lighting override."""
        # Mock structured prompt generation
        respx.post("https://engine.prod.bria-api.com/v2/structured_prompt/generate").mock(
            return_value=httpx.Response(
                200,
                json={
                    "structured_prompt": {
                        "short_description": "A vintage watch",
                        "objects": [],
                        "background": {},
                        "lighting": {}  # Will be overridden
                    }
                }
            )
        )
        
        # Mock image generation
        respx.post("https://engine.prod.bria-api.com/v2/image/generate").mock(
            return_value=httpx.Response(
                200,
                json={
                    "request_id": "test_456",
                    "status_url": "https://api.bria.ai/status/test_456"
                }
            )
        )
        
        async with BriaClient(api_token="test_token") as client:
            lighting_override = {
                "lighting": {
                    "main_light": {
                        "direction": "front-left",
                        "intensity": 0.8,
                        "color_temperature": 5600,
                        "softness": 0.3
                    }
                }
            }
            
            result = await client.generate_from_vlm(
                scene_prompt="a vintage watch",
                lighting_override=lighting_override,
                sync=False
            )
            
            assert "request_id" in result
            assert "structured_prompt" in result
            # Verify lighting was overridden
            assert result["structured_prompt"]["lighting"]["main_light"]["direction"] == "front-left"
