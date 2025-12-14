"""
Example script for Tailored Generation API integration.
"""
import json
from ..wrappers.fibo_client import FIBOClient
import os

def run_tailored_generation_example():
    print("--- Tailored Generation API Example ---")
    client = FIBOClient()

    # Load example FIBO prompt
    try:
        current_dir = os.path.dirname(__file__)
        fibo_path = os.path.join(current_dir, '..', 'wrappers', 'fibo_schema_example.json')
        with open(fibo_path, 'r') as f:
            fibo_prompt = json.load(f)
    except FileNotFoundError:
        print("Error: fibo_schema_example.json not found. Using mock data.")
        fibo_prompt = {
            "subject": {"mainEntity": "portrait", "attributes": "professional", "action": "posing"},
            "environment": {"setting": "studio", "timeOfDay": "day", "weather": "clear"},
            "camera": {"shotType": "close-up", "cameraAngle": "eye-level", "fov": 85, "lensType": "85mm", "aperture": "f/2.8", "focusDistance_m": 2.5, "pitch": 0, "yaw": 0, "roll": 0, "seed": 42},
            "lighting": {"mainLight": {"type": "area", "direction": "45 degrees", "position": [0.7, 1.2, 0.8], "intensity": 1.0, "colorTemperature": 5600, "softness": 0.4, "enabled": True, "distance": 1.5}, "lightingStyle": "butterfly"},
            "render": {"resolution": [1024, 1024], "colorSpace": "sRGB", "bitDepth": 8, "aov": ["beauty"], "samples": 40}
        }

    user_profile = {
        "user_id": "prolight_user_42",
        "preferred_style": "cinematic, high-contrast",
        "recent_generations": ["butterfly", "split-lighting"],
        "color_palette": "warm tones (3000K-4500K)"
    }

    try:
        result = client.tailored_generation(fibo_prompt, user_profile)
        print("Tailored Generation Result:")
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print(f"Error running Tailored Generation example: {e}")

if __name__ == '__main__':
    run_tailored_generation_example()
