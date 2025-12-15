"""
Example script for Video Editing API integration (async v2).
"""
import json
from ..wrappers.fibo_client import FIBOClient

def run_video_editing_example():
    print("--- Video Editing API Example (Async) ---")
    client = FIBOClient()

    video_to_edit = "https://storage.prolight.ai/user_uploads/product_showcase.mp4"
    edit_instructions = "Change the background to a soft, blurred bokeh effect. Increase the overall color saturation by 15%. Apply a smooth transition between the 5th and 10th second."

    try:
        result = client.video_editing(video_to_edit, edit_instructions)
        print("Video Editing Job Started:")
        print(json.dumps(result, indent=2))
        
        # Since this is async, the result will contain a job ID to poll
        # job_id = result.get("job_id")
        # print(f"Job ID: {job_id}. Poll status with client.get_status('{job_id}')")
        
    except Exception as e:
        print(f"Error running Video Editing example: {e}")

if __name__ == '__main__':
    run_video_editing_example()
