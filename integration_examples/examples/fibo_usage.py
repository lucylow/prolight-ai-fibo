"""
Example usage of the improved FIBO adapter with Generate, Refine, and Inspire modes.

This demonstrates the three FIBO workflows as described in the official guide.
"""

import asyncio
import json
from pathlib import Path
import sys

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "backend"))

from app.services.fibo_adapter import FIBOAdapter


async def example_generate_mode():
    """Example: Generate mode - Short prompt to structured JSON to image."""
    print("\n=== Generate Mode Example ===")
    
    adapter = FIBOAdapter()
    
    short_prompt = "A hyper-detailed, ultra-fluffy owl sitting in the trees at night, looking directly at the camera with wide, adorable, expressive eyes."
    
    print(f"Input prompt: {short_prompt}")
    print("Converting to FIBO JSON and generating image...")
    
    result = await adapter.generate_from_prompt(
        short_prompt=short_prompt,
        steps=50,
        guidance_scale=5.0,
        negative_prompt="{'style_medium':'digital illustration','artistic_style':'non-realistic'}"
    )
    
    print(f"\nGenerated image: {result.get('image_url')}")
    print(f"Generation ID: {result.get('generation_id')}")
    
    if "json_prompt" in result:
        print("\nGenerated FIBO JSON:")
        print(json.dumps(result["json_prompt"], indent=2))
    
    return result


async def example_refine_mode():
    """Example: Refine mode - Update existing JSON with instruction."""
    print("\n=== Refine Mode Example ===")
    
    adapter = FIBOAdapter()
    
    # Start with an existing JSON prompt
    existing_json = {
        "subject": {
            "main_entity": "A beautiful owl",
            "attributes": ["detailed", "professional"],
            "action": "sitting in trees",
            "mood": "mysterious"
        },
        "camera": {
            "fov": 50.0,
            "aperture": 2.8,
            "shot_type": "close-up"
        },
        "lighting": {
            "main_light": {
                "type": "area",
                "direction": "45 degrees camera-right",
                "intensity": 0.8,
                "color_temperature": 5600,
                "softness": 0.5
            }
        },
        "render": {
            "resolution": [1024, 1024]
        }
    }
    
    print("Original JSON:")
    print(json.dumps(existing_json, indent=2))
    
    instruction = "make the owl brown and add warm sunset lighting"
    print(f"\nRefinement instruction: {instruction}")
    print("Refining JSON and generating image...")
    
    result = await adapter.refine(
        existing_json=existing_json,
        instruction=instruction,
        locked_fields=["camera"],  # Keep camera settings unchanged
        steps=50
    )
    
    print(f"\nRefined image: {result.get('image_url')}")
    
    if "refinement" in result:
        print("\nRefined JSON:")
        print(json.dumps(result["refinement"]["refined_json"], indent=2))
    
    return result


async def example_inspire_mode():
    """Example: Inspire mode - Extract JSON from image and generate variation."""
    print("\n=== Inspire Mode Example ===")
    
    adapter = FIBOAdapter()
    
    # Use an existing image (can be URL, file path, base64, or PIL Image)
    image_path = "path/to/your/source_image.jpg"
    
    print(f"Source image: {image_path}")
    print("Extracting FIBO JSON from image...")
    
    result = await adapter.inspire(
        image=image_path,
        instruction="add a futuristic city in the background",  # Optional
        steps=50
    )
    
    print(f"\nInspired image: {result.get('image_url')}")
    
    if "inspiration" in result:
        print("\nExtracted FIBO JSON:")
        print(json.dumps(result["inspiration"]["extracted_json"], indent=2))
    
    return result


async def example_direct_json_generation():
    """Example: Direct generation from FIBO JSON (without VLM)."""
    print("\n=== Direct JSON Generation Example ===")
    
    adapter = FIBOAdapter()
    
    # Create a complete FIBO JSON prompt
    fibo_json = {
        "subject": {
            "main_entity": "Professional portrait of a business executive",
            "attributes": [
                "professionally lit",
                "high quality",
                "detailed",
                "sharp focus",
                "editorial fashion",
                "runway quality"
            ],
            "action": "posed confidently for high-fashion editorial photograph",
            "mood": "professional and balanced"
        },
        "environment": {
            "setting": "modern professional studio",
            "time_of_day": "controlled lighting",
            "lighting_conditions": "controlled professional studio environment",
            "atmosphere": "professional and balanced"
        },
        "camera": {
            "fov": 50.0,
            "aperture": 2.8,
            "shot_type": "medium",
            "camera_angle": "eye level",
            "lens_type": "85mm portrait",
            "focus_distance_m": 1.5
        },
        "lighting": {
            "main_light": {
                "type": "area",
                "direction": "45 degrees camera-right",
                "intensity": 0.8,
                "color_temperature": 5600,
                "softness": 0.5,
                "distance": 1.5,
                "enabled": True
            },
            "fill_light": {
                "type": "area",
                "direction": "30 degrees camera-left",
                "intensity": 0.4,
                "color_temperature": 5600,
                "softness": 0.7,
                "distance": 2.0,
                "enabled": True
            },
            "rim_light": {
                "type": "area",
                "direction": "behind subject left",
                "intensity": 0.5,
                "color_temperature": 3200,
                "softness": 0.3,
                "distance": 1.0,
                "enabled": True
            },
            "lighting_style": "classical_portrait"
        },
        "render": {
            "resolution": [2048, 2048],
            "color_space": "sRGB",
            "bit_depth": 8
        },
        "style_medium": "photograph",
        "artistic_style": "professional studio photography"
    }
    
    print("FIBO JSON prompt:")
    print(json.dumps(fibo_json, indent=2))
    print("\nGenerating image...")
    
    result = await adapter.generate(
        prompt_json=fibo_json,
        steps=50,
        guidance_scale=5.0
    )
    
    print(f"\nGenerated image: {result.get('image_url')}")
    print(f"Generation ID: {result.get('generation_id')}")
    print(f"Model: {result.get('model')}")
    
    return result


async def main():
    """Run all examples."""
    print("Bria FIBO Integration Examples")
    print("=" * 50)
    
    try:
        # Example 1: Generate mode
        await example_generate_mode()
        
        # Example 2: Refine mode
        # await example_refine_mode()
        
        # Example 3: Inspire mode (requires an image file)
        # await example_inspire_mode()
        
        # Example 4: Direct JSON generation
        await example_direct_json_generation()
        
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up
        adapter = FIBOAdapter()
        await adapter.close()


if __name__ == "__main__":
    asyncio.run(main())
