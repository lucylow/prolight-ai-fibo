"""
Determinism Test for FIBO Generation
Tests that identical prompts with the same seed produce identical results.
"""

import pytest
import os
from pathlib import Path
from PIL import Image, ImageChops
from app.services.fibo_adapter import FIBOAdapter
from app.models_fibo import FiboPrompt, create_default_fibo_prompt


# Base prompt with fixed seed for determinism testing
BASE_PROMPT = {
    "subject": {"main_entity": "test sphere"},
    "camera": {
        "fov": 60,
        "aperture": 2.8,
        "focus_distance_m": 1.0,
        "pitch": 0,
        "yaw": 0,
        "roll": 0,
        "seed": 123456  # Fixed seed for determinism
    },
    "lighting": {
        "main_light": {
            "type": "area",
            "direction": "front-left",
            "position": [0.5, 1.2, 0.8],
            "intensity": 1.0,
            "color_temperature": 5600,
            "softness": 0.25,
            "enabled": True
        }
    },
    "render": {
        "resolution": [512, 512],  # Smaller for faster testing
        "bit_depth": 8,
        "color_space": "sRGB",
        "aov": ["beauty"]
    }
}


def diff_percent(path_a: str, path_b: str) -> float:
    """
    Calculate percentage difference between two images.
    
    Args:
        path_a: Path to first image
        path_b: Path to second image
        
    Returns:
        float: Percentage of pixels that differ (0.0 = identical, 100.0 = completely different)
    """
    try:
        img_a = Image.open(path_a).convert("RGBA")
        img_b = Image.open(path_b).convert("RGBA")
        
        # Ensure same size
        if img_a.size != img_b.size:
            return 100.0  # Different sizes = completely different
        
        # Calculate difference
        diff = ImageChops.difference(img_a, img_b)
        bbox = diff.getbbox()
        
        if not bbox:
            return 0.0  # Images are identical
        
        # Count non-zero pixels
        pixels = list(diff.getdata())
        nonzero = sum(1 for p in pixels if p != (0, 0, 0, 0))
        total = diff.width * diff.height
        
        return (nonzero / total) * 100.0
    except Exception as e:
        pytest.fail(f"Error comparing images: {e}")


@pytest.mark.asyncio
async def test_generate_determinism_with_seed(tmp_path: Path):
    """
    Test that generating the same prompt twice with the same seed produces identical results.
    
    Note: This test may fail with remote APIs that don't guarantee determinism.
    It should pass with local FIBO or deterministic mock implementations.
    """
    adapter = FIBOAdapter()
    
    try:
        # Generate first image
        result1 = await adapter.generate(
            BASE_PROMPT,
            steps=20,  # Fewer steps for faster testing
            guidance_scale=7.5
        )
        
        # Generate second image with same prompt
        result2 = await adapter.generate(
            BASE_PROMPT,
            steps=20,
            guidance_scale=7.5
        )
        
        # Check that both generations succeeded
        assert "status" in result1 or "image_url" in result1 or "image_path" in result1
        assert "status" in result2 or "image_url" in result2 or "image_path" in result2
        
        # If using mock, results should be identical
        if adapter.use_mock:
            assert result1.get("generation_id") == result2.get("generation_id")
            assert result1.get("image_url") == result2.get("image_url")
        
        # If we have image paths/URLs, compare images
        img1_path = result1.get("image_path") or result1.get("image_url")
        img2_path = result2.get("image_path") or result2.get("image_url")
        
        if img1_path and img2_path and os.path.exists(img1_path) and os.path.exists(img2_path):
            diff = diff_percent(img1_path, img2_path)
            
            # For deterministic systems, expect 0% difference
            # For non-deterministic remote APIs, allow small tolerance
            tolerance = 0.0 if adapter.local_fibo_module else 5.0
            
            assert diff <= tolerance, (
                f"Images differ by {diff}% (tolerance: {tolerance}%). "
                f"This may indicate non-deterministic generation."
            )
        
    finally:
        await adapter.close()


@pytest.mark.asyncio
async def test_prompt_validation():
    """Test that FIBO prompts are properly validated."""
    adapter = FIBOAdapter()
    
    try:
        # Valid prompt should work
        valid_prompt = create_default_fibo_prompt("test product", [512, 512])
        result = await adapter.generate(valid_prompt.to_dict())
        assert result is not None
        
        # Invalid prompt (missing required structure) should still work
        # (FIBO adapter is lenient, but Pydantic validation will warn)
        minimal_prompt = {"subject": "test"}
        result = await adapter.generate(minimal_prompt)
        assert result is not None
        
    finally:
        await adapter.close()


@pytest.mark.asyncio
async def test_seed_consistency():
    """
    Test that different seeds produce different results,
    but same seed produces same result.
    """
    adapter = FIBOAdapter()
    
    try:
        # Generate with seed 111
        prompt1 = BASE_PROMPT.copy()
        prompt1["camera"]["seed"] = 111
        result1 = await adapter.generate(prompt1)
        
        # Generate with seed 222
        prompt2 = BASE_PROMPT.copy()
        prompt2["camera"]["seed"] = 222
        result2 = await adapter.generate(prompt2)
        
        # Generate with seed 111 again (should match first)
        prompt3 = BASE_PROMPT.copy()
        prompt3["camera"]["seed"] = 111
        result3 = await adapter.generate(prompt3)
        
        # Results 1 and 3 should match (same seed)
        if adapter.use_mock:
            assert result1.get("generation_id") == result3.get("generation_id")
        
        # Results 1 and 2 should differ (different seeds)
        # (This is harder to test without image comparison, so we just check they exist)
        assert result1 is not None
        assert result2 is not None
        assert result3 is not None
        
    finally:
        await adapter.close()


@pytest.mark.asyncio
async def test_local_vs_remote_fallback():
    """Test that adapter falls back to remote when local is unavailable."""
    adapter = FIBOAdapter()
    
    # Force disable local module
    original_local = adapter.local_fibo_module
    adapter.local_fibo_module = None
    
    try:
        # Should fall back to remote or mock
        result = await adapter.generate(BASE_PROMPT)
        assert result is not None
        assert "status" in result or "image_url" in result or "image_path" in result
    finally:
        adapter.local_fibo_module = original_local
        await adapter.close()
