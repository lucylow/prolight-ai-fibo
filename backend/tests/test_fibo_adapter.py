"""
Tests for FIBO Adapter service
"""

import pytest
import asyncio
from app.services.fibo_adapter import FIBOAdapter


@pytest.fixture
def fibo_adapter():
    """Create FIBO adapter instance"""
    adapter = FIBOAdapter()
    yield adapter
    # Cleanup
    asyncio.run(adapter.close())


class TestFIBOAdapterMock:
    """Tests for FIBO adapter mock mode"""
    
    @pytest.mark.asyncio
    async def test_generate_mock(self, fibo_adapter, mock_fibo_prompt):
        """Test mock generation"""
        result = await fibo_adapter.generate(mock_fibo_prompt)
        
        assert result["status"] == "success"
        assert "generation_id" in result
        assert "image_url" in result
        assert result["cost_credits"] == 0.04
        assert result["duration_seconds"] > 0
    
    @pytest.mark.asyncio
    async def test_generate_determinism(self, fibo_adapter, mock_fibo_prompt):
        """Test deterministic generation with same seed"""
        result1 = await fibo_adapter.generate(mock_fibo_prompt)
        result2 = await fibo_adapter.generate(mock_fibo_prompt)
        
        # Same prompt should use cache
        assert result1["generation_id"] == result2["generation_id"]
    
    @pytest.mark.asyncio
    async def test_refine(self, fibo_adapter):
        """Test refinement"""
        result = await fibo_adapter.refine(
            generation_id="gen_test_001",
            instruction="Make it brighter",
            locked_fields=["subject", "environment"]
        )
        
        assert result["status"] == "success"
        assert result["parent_generation_id"] == "gen_test_001"
        assert result["instruction"] == "Make it brighter"
        assert "locked_fields" in result
    
    @pytest.mark.asyncio
    async def test_batch_generate(self, fibo_adapter, mock_fibo_prompt):
        """Test batch generation"""
        items = [mock_fibo_prompt, mock_fibo_prompt]
        result = await fibo_adapter.batch_generate(items, preset_name="butterfly_classic")
        
        assert result["status"] == "success"
        assert "batch_id" in result
        assert result["items_total"] == 2
        assert result["items_completed"] == 2
        assert len(result["results"]) == 2


class TestFIBOAdapterPromptValidation:
    """Tests for FIBO prompt validation"""
    
    @pytest.mark.asyncio
    async def test_generate_with_custom_settings(self, fibo_adapter):
        """Test generation with custom settings"""
        prompt = {
            "subject": {
                "mainEntity": "test subject",
                "attributes": "test",
                "action": "testing",
            },
            "environment": {
                "setting": "test",
                "timeOfDay": "test",
                "weather": "test",
            },
            "camera": {
                "shotType": "test",
                "cameraAngle": "test",
                "fov": 85,
                "lensType": "test",
                "aperture": "f/2.8",
                "focusDistance_m": 2.5,
                "pitch": 0,
                "yaw": 0,
                "roll": 0,
                "seed": 42
            },
            "lighting": {
                "mainLight": {
                    "type": "area",
                    "direction": "test",
                    "position": [0, 0, 0],
                    "intensity": 1.0,
                    "colorTemperature": 5600,
                    "softness": 0.5,
                    "enabled": True,
                    "distance": 1.0
                }
            },
            "render": {
                "resolution": [2048, 2048],
                "colorSpace": "ACEScg",
                "bitDepth": 16,
                "aov": ["beauty"],
                "samples": 40
            }
        }
        
        result = await fibo_adapter.generate(prompt, steps=50, guidance_scale=8.0)
        assert result["status"] == "success"
        assert result["steps"] == 50
        assert result["guidance_scale"] == 8.0


class TestFIBOAdapterCaching:
    """Tests for FIBO adapter caching"""
    
    @pytest.mark.asyncio
    async def test_prompt_caching(self, fibo_adapter, mock_fibo_prompt):
        """Test that identical prompts are cached"""
        # First generation
        result1 = await fibo_adapter.generate(mock_fibo_prompt)
        
        # Second generation with same prompt
        result2 = await fibo_adapter.generate(mock_fibo_prompt)
        
        # Should return cached result
        assert result1["generation_id"] == result2["generation_id"]
        assert result1["image_url"] == result2["image_url"]
    
    @pytest.mark.asyncio
    async def test_different_prompts_different_results(self, fibo_adapter, mock_fibo_prompt):
        """Test that different prompts produce different results"""
        result1 = await fibo_adapter.generate(mock_fibo_prompt)
        
        # Modify prompt
        modified_prompt = mock_fibo_prompt.copy()
        modified_prompt["camera"]["seed"] = 999
        
        result2 = await fibo_adapter.generate(modified_prompt)
        
        # Should produce different results
        assert result1["generation_id"] != result2["generation_id"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
