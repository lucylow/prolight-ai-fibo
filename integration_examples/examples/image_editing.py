"""
Example script for Image Editing API integration.
"""
import json
from ..wrappers.fibo_client import FIBOClient

def run_image_editing_example():
    print("--- Image Editing API Example ---")
    client = FIBOClient()

    image_to_edit = "https://storage.prolight.ai/generations/portrait_001.png"
    edit_prompt = "Apply a subtle film grain effect and shift the color temperature to a warmer, golden hour tone (3500K)."

    try:
        result = client.image_editing(image_to_edit, edit_prompt)
        print("Image Editing Result:")
        print(json.dumps(result, indent=2))
        
        # The result would contain the URL of the edited image
        # edited_image_url = result.get("image_url")
        
    except Exception as e:
        print(f"Error running Image Editing example: {e}")

if __name__ == '__main__':
    run_image_editing_example()
