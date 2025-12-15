"""
FIBO Client Wrapper (Python)
A simple wrapper for Bria's FIBO-related APIs.
"""
import os
import requests
import json
from typing import Dict, Any, Optional

# Configuration
BASE_URL = os.environ.get("FIBO_BASE_URL", "https://api.bria.ai/v1")
API_KEY = os.environ.get("FIBO_API_KEY", "YOUR_FIBO_API_KEY")

class FIBOClient:
    """Client for interacting with Bria's FIBO and related APIs."""

    def __init__(self, api_key: str = API_KEY, base_url: str = BASE_URL):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    def _post(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Internal POST request handler."""
        url = f"{self.base_url}/{endpoint}"
        try:
            response = requests.post(url, headers=self.headers, data=json.dumps(data))
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            print(f"HTTP Error: {e.response.status_code} - {e.response.text}")
            raise
        except requests.exceptions.RequestException as e:
            print(f"Request Error: {e}")
            raise

    def _get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Internal GET request handler."""
        url = f"{self.base_url}/{endpoint}"
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            print(f"HTTP Error: {e.response.status_code} - {e.response.text}")
            raise
        except requests.exceptions.RequestException as e:
            print(f"Request Error: {e}")
            raise

    # --- Core Generation APIs ---

    def generate_image(self, fibo_prompt: Dict[str, Any]) -> Dict[str, Any]:
        """Image Generation (v1) - Generates an image based on a FIBO prompt."""
        print("Calling Image Generation API...")
        return self._post("models/fibo", fibo_prompt)

    def get_status(self, generation_id: str) -> Dict[str, Any]:
        """Status Service - Polls the status of a generation job."""
        print(f"Polling status for job: {generation_id}")
        return self._get(f"jobs/{generation_id}")

    # --- Improvement/Editing APIs ---

    def image_editing(self, image_url: str, edit_prompt: str) -> Dict[str, Any]:
        """Image Editing - Edits an existing image."""
        print("Calling Image Editing API...")
        data = {
            "image_url": image_url,
            "prompt": edit_prompt,
            "model": "image-edit-v1"
        }
        return self._post("models/edit", data)

    def product_shot_editing(self, image_url: str, product_prompt: str) -> Dict[str, Any]:
        """Product Shot Editing - Specialized editing for product images."""
        print("Calling Product Shot Editing API...")
        # This is a conceptual stub. Assuming a specialized endpoint or model.
        data = {
            "image_url": image_url,
            "prompt": product_prompt,
            "model": "product-shot-edit-v1"
        }
        return self._post("models/edit", data) # Using generic edit endpoint for stub

    # --- Advanced APIs ---

    def ads_generation(self, ad_campaign_data: Dict[str, Any]) -> Dict[str, Any]:
        """Ads Generation API - Generates ad creatives."""
        print("Calling Ads Generation API...")
        # Conceptual endpoint for a high-level ad generation service
        return self._post("services/ads-generation", ad_campaign_data)

    def tailored_generation(self, fibo_prompt: Dict[str, Any], user_profile: Dict[str, Any]) -> Dict[str, Any]:
        """Tailored Generation - Generation optimized for a specific user profile."""
        print("Calling Tailored Generation API...")
        # Conceptual endpoint for a service that uses user data to refine FIBO
        data = {
            "fibo_prompt": fibo_prompt,
            "user_profile": user_profile
        }
        return self._post("models/tailored-fibo", data)

    def image_onboarding(self, image_url: str, tags: Optional[list] = None) -> Dict[str, Any]:
        """Image Onboarding - Uploads and processes an image for use in generation."""
        print("Calling Image Onboarding API...")
        data = {
            "image_url": image_url,
            "tags": tags or ["prolight-ai", "onboarded"]
        }
        # Conceptual endpoint for asset management/onboarding
        return self._post("assets/onboard", data)

    def video_editing(self, video_url: str, edit_instructions: str) -> Dict[str, Any]:
        """Video Editing (async v2) - Starts an asynchronous video editing job."""
        print("Calling Video Editing API...")
        data = {
            "video_url": video_url,
            "instructions": edit_instructions,
            "model": "video-edit-v2",
            "async": True
        }
        return self._post("models/video-edit", data)

if __name__ == '__main__':
    # Example usage (requires FIBO_API_KEY to be set in environment)
    client = FIBOClient()
    
    # Mock FIBO prompt for demonstration
    mock_fibo_prompt = {
        "subject": {"mainEntity": "portrait", "attributes": "professional", "action": "posing"},
        "environment": {"setting": "studio", "timeOfDay": "day", "weather": "clear"},
        "camera": {"shotType": "close-up", "cameraAngle": "eye-level", "fov": 85, "lensType": "85mm", "aperture": "f/2.8", "focusDistance_m": 2.5, "pitch": 0, "yaw": 0, "roll": 0, "seed": 42},
        "lighting": {"mainLight": {"type": "area", "direction": "45 degrees", "position": [0.7, 1.2, 0.8], "intensity": 1.0, "colorTemperature": 5600, "softness": 0.4, "enabled": True, "distance": 1.5}, "lightingStyle": "butterfly"},
        "render": {"resolution": [1024, 1024], "colorSpace": "sRGB", "bitDepth": 8, "aov": ["beauty"], "samples": 40}
    }

    try:
        # 1. Image Generation (v1)
        print("\n--- 1. Image Generation (v1) ---")
        gen_result = client.generate_image(mock_fibo_prompt)
        print(json.dumps(gen_result, indent=2))
        
        # 2. Status Service polling (conceptual)
        print("\n--- 2. Status Service Polling ---")
        job_id = gen_result.get("job_id", "mock_job_123")
        status_result = client.get_status(job_id)
        print(json.dumps(status_result, indent=2))

    except Exception as e:
        print(f"\nAn error occurred during example execution: {e}")
        print("Please ensure FIBO_API_KEY is set in your environment.")
