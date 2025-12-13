"""
Integration tests for generate endpoint.
Tests the full request/response flow.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch


@pytest.fixture
def test_client():
    """Create test client."""
    # Import here to avoid circular imports
    from routes.generate import router
    from fastapi import FastAPI
    
    app = FastAPI()
    app.include_router(router, prefix="/api")
    
    return TestClient(app)


@pytest.fixture
def sample_generate_request():
    """Sample generate request payload."""
    return {
        "scene_prompt": "a vintage watch on a wooden table",
        "lights": [
            {
                "id": "key",
                "type": "directional",
                "position": {"x": 1.0, "y": 2.0, "z": 3.0},
                "intensity": 0.8,
                "color_temperature": 5600,
                "softness": 0.3,
                "enabled": True
            },
            {
                "id": "fill",
                "type": "point",
                "position": {"x": -0.5, "y": 0.6, "z": 1.0},
                "intensity": 0.4,
                "color_temperature": 5600,
                "softness": 0.7,
                "enabled": True
            }
        ],
        "num_results": 1,
        "sync": True
    }


class TestGenerateEndpoint:
    """Test generate endpoint."""
    
    def test_generate_with_mock_mode(self, test_client, sample_generate_request):
        """Test generation in mock mode."""
        with patch("routes.generate.settings") as mock_settings:
            mock_settings.USE_MOCK_FIBO = True
            
            response = test_client.post(
                "/api/generate",
                json=sample_generate_request
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["ok"] is True
            assert data["status"] == "completed"
            assert "image_url" in data
            assert data["meta"]["mode"] == "mock"
            assert data["meta"]["num_lights"] == 2
    
    def test_generate_missing_lights(self, test_client):
        """Test generation with missing lights."""
        request = {
            "scene_prompt": "a vintage watch",
            "lights": [],
            "num_results": 1,
            "sync": True
        }
        
        response = test_client.post("/api/generate", json=request)
        
        assert response.status_code == 400
        assert "at least one light" in response.json()["detail"].lower()
    
    def test_generate_invalid_light_intensity(self, test_client):
        """Test generation with invalid light intensity."""
        request = {
            "scene_prompt": "a vintage watch",
            "lights": [
                {
                    "id": "key",
                    "position": {"x": 1, "y": 1, "z": 1},
                    "intensity": 1.5,  # Invalid: > 1.0
                    "color_temperature": 5600,
                    "softness": 0.3
                }
            ],
            "num_results": 1,
            "sync": True
        }
        
        response = test_client.post("/api/generate", json=request)
        
        # Should fail validation
        assert response.status_code == 422
    
    @patch("routes.generate.BriaClient")
    def test_generate_with_real_api(self, mock_bria_client, test_client, sample_generate_request):
        """Test generation with real API (mocked)."""
        # Mock BriaClient
        mock_client_instance = AsyncMock()
        mock_client_instance.generate_from_vlm = AsyncMock(return_value={
            "result": {
                "image_url": "https://example.com/generated.png",
                "seed": 42
            },
            "structured_prompt": {
                "short_description": "A vintage watch",
                "lighting": {
                    "main_light": {
                        "direction": "front-right",
                        "intensity": 0.8,
                        "color_temperature": 5600,
                        "softness": 0.3
                    }
                }
            }
        })
        
        mock_bria_client.return_value.__aenter__.return_value = mock_client_instance
        
        with patch("routes.generate.settings") as mock_settings:
            mock_settings.USE_MOCK_FIBO = False
            mock_settings.bria_token.return_value = "test_token"
            mock_settings.BRIA_API_URL = "https://test.api.com/v2"
            
            response = test_client.post(
                "/api/generate",
                json=sample_generate_request
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["ok"] is True
            assert data["status"] == "completed"
            assert data["image_url"] == "https://example.com/generated.png"
            assert "structured_prompt" in data
    
    @patch("routes.generate.BriaClient")
    def test_generate_async_mode(self, mock_bria_client, test_client, sample_generate_request):
        """Test async generation mode."""
        # Mock BriaClient for async response
        mock_client_instance = AsyncMock()
        mock_client_instance.generate_from_vlm = AsyncMock(return_value={
            "request_id": "async_123",
            "status_url": "https://api.bria.ai/status/async_123",
            "structured_prompt": {}
        })
        
        mock_bria_client.return_value.__aenter__.return_value = mock_client_instance
        
        with patch("routes.generate.settings") as mock_settings:
            mock_settings.USE_MOCK_FIBO = False
            mock_settings.bria_token.return_value = "test_token"
            mock_settings.BRIA_API_URL = "https://test.api.com/v2"
            
            # Set sync=False for async mode
            sample_generate_request["sync"] = False
            
            response = test_client.post(
                "/api/generate",
                json=sample_generate_request
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["ok"] is True
            assert data["status"] == "in_progress"
            assert data["request_id"] == "async_123"
            assert data["meta"]["status_url"] == "https://api.bria.ai/status/async_123"
    
    def test_get_status_endpoint(self, test_client):
        """Test status endpoint."""
        with patch("backend.routes.generate.BriaClient") as mock_bria_client:
            mock_client_instance = AsyncMock()
            mock_client_instance.get_job_status = AsyncMock(return_value={
                "status": "COMPLETED",
                "result": {
                    "image_url": "https://example.com/result.png"
                }
            })
            
            mock_bria_client.return_value.__aenter__.return_value = mock_client_instance
            
            with patch("routes.generate.settings") as mock_settings:
                mock_settings.bria_token.return_value = "test_token"
                mock_settings.BRIA_API_URL = "https://test.api.com/v2"
                
                response = test_client.get("/api/status/test_123")
                
                assert response.status_code == 200
                data = response.json()
                
                assert data["status"] == "COMPLETED"
                assert "image_url" in data["result"]
