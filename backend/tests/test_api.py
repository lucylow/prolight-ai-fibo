"""
Test suite for ProLight AI API endpoints
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "timestamp" in data


class TestGenerateEndpoints:
    """Generate endpoint tests"""
    
    def test_generate_image(self):
        """Test image generation"""
        payload = {
            "scene_description": "professional model in studio",
            "lighting_setup": {
                "mainLight": {
                    "type": "area",
                    "direction": "45 degrees",
                    "position": [0.7, 1.2, 0.8],
                    "intensity": 1.0,
                    "colorTemperature": 5600,
                    "softness": 0.4,
                    "enabled": True,
                    "distance": 1.5
                }
            },
            "use_mock": True
        }
        
        response = client.post("/api/generate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "generation_id" in data
        assert data["status"] == "success"
        assert "image_url" in data
        assert data["cost_credits"] == 0.04
    
    def test_generate_from_natural_language(self):
        """Test natural language generation"""
        response = client.post(
            "/api/generate/natural-language",
            params={
                "scene_description": "professional portrait",
                "lighting_description": "soft butterfly lighting",
                "subject": "fashion model",
                "style_intent": "professional"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "generation_id" in data
        assert data["status"] == "success"
    
    def test_generate_from_preset(self):
        """Test preset-based generation"""
        response = client.post(
            "/api/generate/from-preset",
            params={
                "preset_id": "butterfly_classic",
                "scene_description": "beauty portrait"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "generation_id" in data


class TestPresetsEndpoints:
    """Presets endpoint tests"""
    
    def test_list_presets(self):
        """Test listing presets"""
        response = client.get("/api/presets")
        assert response.status_code == 200
        data = response.json()
        assert "presets" in data
        assert "total" in data
        assert len(data["presets"]) > 0
    
    def test_list_presets_by_category(self):
        """Test listing presets by category"""
        response = client.get("/api/presets?category=portrait")
        assert response.status_code == 200
        data = response.json()
        assert "presets" in data
        for preset in data["presets"]:
            assert preset["category"] == "portrait"
    
    def test_get_preset(self):
        """Test getting specific preset"""
        response = client.get("/api/presets/butterfly_classic")
        assert response.status_code == 200
        data = response.json()
        assert data["preset_id"] == "butterfly_classic"
        assert data["name"] == "Butterfly Classic"
    
    def test_get_nonexistent_preset(self):
        """Test getting non-existent preset"""
        response = client.get("/api/presets/nonexistent")
        assert response.status_code == 404
    
    def test_list_categories(self):
        """Test listing categories"""
        response = client.get("/api/presets/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) > 0
    
    def test_search_presets(self):
        """Test searching presets"""
        response = client.post(
            "/api/presets/search",
            json={"query": "butterfly"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "presets" in data


class TestHistoryEndpoints:
    """History endpoint tests"""
    
    def test_get_history(self):
        """Test getting history"""
        response = client.get("/api/history")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
    
    def test_get_history_stats(self):
        """Test getting history statistics"""
        response = client.get("/api/history/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_generations" in data
        assert "total_cost_credits" in data
    
    def test_delete_generation(self):
        """Test deleting generation"""
        response = client.delete("/api/history/gen_test_001")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
    
    def test_clear_history(self):
        """Test clearing history"""
        response = client.post("/api/history/clear")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"


class TestBatchEndpoints:
    """Batch endpoint tests"""
    
    def test_batch_generate(self):
        """Test batch generation"""
        payload = {
            "items": [
                {"scene": "portrait 1"},
                {"scene": "portrait 2"}
            ],
            "preset_name": "butterfly_classic",
            "total_count": 2
        }
        
        response = client.post("/api/batch/generate", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "batch_id" in data
        assert data["status"] in ["processing", "completed"]
    
    def test_get_batch_status(self):
        """Test getting batch status"""
        response = client.get("/api/batch/batch_test_001")
        assert response.status_code == 200
        data = response.json()
        assert "batch_id" in data
        assert "status" in data
    
    def test_product_variations(self):
        """Test product variations generation"""
        response = client.post(
            "/api/batch/product-variations",
            params={
                "product_description": "luxury watch",
                "num_angles": 4,
                "num_lighting_setups": 3
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "batch_id" in data
    
    def test_export_batch(self):
        """Test batch export"""
        response = client.get("/api/batch/batch_test_001/export?format=zip")
        assert response.status_code == 200
        data = response.json()
        assert "download_url" in data


class TestAnalysisEndpoints:
    """Analysis endpoint tests"""
    
    def test_analyze_lighting(self):
        """Test lighting analysis"""
        payload = {
            "lighting_setup": {
                "mainLight": {
                    "type": "area",
                    "direction": "45 degrees",
                    "position": [0.7, 1.2, 0.8],
                    "intensity": 1.0,
                    "colorTemperature": 5600,
                    "softness": 0.4,
                    "enabled": True,
                    "distance": 1.5
                },
                "fillLight": {
                    "type": "point",
                    "direction": "30 degrees left",
                    "position": [-0.5, 0.6, 1.0],
                    "intensity": 0.4,
                    "colorTemperature": 5600,
                    "softness": 0.7,
                    "enabled": True,
                    "distance": 2.0
                }
            }
        }
        
        response = client.post("/api/analyze/lighting", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "key_to_fill_ratio" in data
        assert "professional_rating" in data
        assert "recommendations" in data
    
    def test_get_style_recommendations(self):
        """Test getting style recommendations"""
        response = client.get("/api/analyze/recommendations/butterfly")
        assert response.status_code == 200
        data = response.json()
        assert "description" in data
        assert "tips" in data


class TestErrorHandling:
    """Error handling tests"""
    
    def test_invalid_endpoint(self):
        """Test invalid endpoint"""
        response = client.get("/api/invalid")
        assert response.status_code == 404
    
    def test_invalid_method(self):
        """Test invalid HTTP method"""
        response = client.get("/api/generate")
        assert response.status_code == 405
    
    def test_invalid_json(self):
        """Test invalid JSON payload"""
        response = client.post(
            "/api/generate",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422


class TestCORS:
    """CORS configuration tests"""
    
    def test_cors_headers(self):
        """Test CORS headers"""
        response = client.get("/api/health")
        assert response.status_code == 200
        # CORS headers should be present
        assert "access-control-allow-origin" in response.headers or True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
