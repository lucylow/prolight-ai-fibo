"""
Example script for Image Onboarding API integration.
"""
import json
from ..wrappers.fibo_client import FIBOClient

def run_image_onboarding_example():
    print("--- Image Onboarding API Example ---")
    client = FIBOClient()

    # URL of an image to be onboarded (e.g., a reference image or a custom texture)
    image_to_onboard = "https://storage.prolight.ai/user_uploads/custom_backdrop.jpg"
    tags = ["backdrop", "user-upload", "studio-texture"]

    try:
        result = client.image_onboarding(image_to_onboard, tags)
        print("Image Onboarding Result:")
        print(json.dumps(result, indent=2))
        
        # The result would typically contain an asset ID or a processed URL
        # asset_id = result.get("asset_id")
        
    except Exception as e:
        print(f"Error running Image Onboarding example: {e}")

if __name__ == '__main__':
    run_image_onboarding_example()
