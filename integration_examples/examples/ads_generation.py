"""
Example script for Ads Generation API integration.
"""
import json
from ..wrappers.fibo_client import FIBOClient

def run_ads_generation_example():
    print("--- Ads Generation API Example ---")
    client = FIBOClient()

    ad_campaign_data = {
        "campaign_name": "Luxury Watch Holiday Sale",
        "target_audience": "High-net-worth individuals, aged 35-55",
        "product_image_url": "https://storage.bria.ai/assets/watch_shot_001.png",
        "ad_formats": ["instagram_story", "facebook_feed", "website_banner"],
        "call_to_action": "Shop Now and Save 20%",
        "style_intent": "Elegant, festive, high-contrast"
    }

    try:
        result = client.ads_generation(ad_campaign_data)
        print("Ads Generation Job Started:")
        print(json.dumps(result, indent=2))
        
        # In a real scenario, you would poll the status service for completion
        # job_id = result.get("job_id")
        # status = client.get_status(job_id)
        
    except Exception as e:
        print(f"Error running Ads Generation example: {e}")

if __name__ == '__main__':
    run_ads_generation_example()
