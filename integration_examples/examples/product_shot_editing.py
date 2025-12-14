"""
Example script for Product Shot Editing API integration.
"""
import json
from ..wrappers.fibo_client import FIBOClient

def run_product_shot_editing_example():
    print("--- Product Shot Editing API Example ---")
    client = FIBOClient()

    product_image_url = "https://storage.prolight.ai/product_shots/luxury_watch_raw.png"
    product_prompt = "Change the background to a clean, white infinity cove. Enhance the reflections on the watch face to be sharper and more defined. Increase the overall brightness by 10%."

    try:
        result = client.product_shot_editing(product_image_url, product_prompt)
        print("Product Shot Editing Result:")
        print(json.dumps(result, indent=2))
        
        # The result would contain the URL of the edited image
        # edited_image_url = result.get("image_url")
        
    except Exception as e:
        print(f"Error running Product Shot Editing example: {e}")

if __name__ == '__main__':
    run_product_shot_editing_example()
