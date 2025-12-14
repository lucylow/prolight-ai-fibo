"""
Example script for Image Generation (v1) and Status Service polling.
"""
import json
import time
from ..wrappers.fibo_client import FIBOClient
import os

def run_generation_and_status_example():
    print("--- Image Generation (v1) and Status Service Example ---")
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

    try:
        # 1. Start Generation
        print("1. Starting Image Generation...")
        gen_result = client.generate_image(fibo_prompt)
        print(json.dumps(gen_result, indent=2))
        
        job_id = gen_result.get("job_id", "mock_job_123")
        
        # 2. Poll Status Service
        print(f"\n2. Polling status for job: {job_id}")
        status = "pending"
        
        # Mock polling loop for demonstration
        for i in range(3):
            time.sleep(1) # Wait 1 second between polls
            status_result = client.get_status(job_id)
            status = status_result.get("status", "unknown")
            print(f"   - Poll {i+1}: Status is {status}")
            
            if status in ["completed", "failed"]:
                break
        
        print("\nFinal Status Check:")
        print(json.dumps(status_result, indent=2))

    except Exception as e:
        print(f"Error running Generation and Status example: {e}")

if __name__ == '__main__':
    run_generation_and_status_example()
