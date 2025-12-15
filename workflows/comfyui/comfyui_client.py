"""
ComfyUI API Client

Client for executing ComfyUI workflows via API.
Supports async job queuing, status polling, and result retrieval.
"""

import json
import time
import requests
import websocket
import uuid
from typing import Dict, Any, Optional, Callable
from pathlib import Path


class ComfyUIClient:
    """Client for ComfyUI API"""
    
    def __init__(
        self,
        base_url: str = "http://127.0.0.1:8188",
        api_key: Optional[str] = None,
        timeout: int = 300
    ):
        """
        Initialize ComfyUI client.
        
        Args:
            base_url: ComfyUI server URL
            api_key: Optional API key for authentication
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.timeout = timeout
        self.client_id = str(uuid.uuid4())
    
    def _get_headers(self) -> Dict[str, str]:
        """Get request headers with optional API key"""
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers
    
    def queue_prompt(
        self,
        workflow: Dict[str, Any],
        wait_for_completion: bool = False,
        on_progress: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> Dict[str, Any]:
        """
        Queue a workflow prompt.
        
        Args:
            workflow: ComfyUI workflow JSON
            wait_for_completion: If True, wait for job to complete
            on_progress: Optional callback for progress updates
        
        Returns:
            Response with prompt_id or final result
        """
        url = f"{self.base_url}/prompt"
        
        payload = {
            "prompt": workflow,
            "client_id": self.client_id
        }
        
        response = requests.post(
            url,
            json=payload,
            headers=self._get_headers(),
            timeout=self.timeout
        )
        response.raise_for_status()
        
        result = response.json()
        prompt_id = result.get("prompt_id")
        
        if wait_for_completion:
            return self.wait_for_completion(prompt_id, on_progress=on_progress)
        
        return result
    
    def wait_for_completion(
        self,
        prompt_id: str,
        on_progress: Optional[Callable[[Dict[str, Any]], None]] = None,
        poll_interval: float = 1.0,
        max_wait: int = 600
    ) -> Dict[str, Any]:
        """
        Wait for prompt completion.
        
        Args:
            prompt_id: Prompt ID from queue_prompt
            on_progress: Optional callback for progress updates
            poll_interval: Seconds between status checks
            max_wait: Maximum wait time in seconds
        
        Returns:
            Final result with image outputs
        """
        start_time = time.time()
        
        while True:
            status = self.get_status(prompt_id)
            
            if on_progress:
                on_progress(status)
            
            # Check if completed
            if status.get("status") == "completed":
                return self.get_output(prompt_id)
            
            # Check if failed
            if status.get("status") == "error":
                error_msg = status.get("error", "Unknown error")
                raise RuntimeError(f"ComfyUI workflow failed: {error_msg}")
            
            # Check timeout
            if time.time() - start_time > max_wait:
                raise TimeoutError(f"Workflow timed out after {max_wait} seconds")
            
            time.sleep(poll_interval)
    
    def get_status(self, prompt_id: str) -> Dict[str, Any]:
        """Get status of a queued prompt"""
        url = f"{self.base_url}/history/{prompt_id}"
        
        response = requests.get(
            url,
            headers=self._get_headers(),
            timeout=self.timeout
        )
        response.raise_for_status()
        
        return response.json()
    
    def get_output(self, prompt_id: str) -> Dict[str, Any]:
        """Get output images from completed prompt"""
        url = f"{self.base_url}/history/{prompt_id}"
        
        response = requests.get(
            url,
            headers=self._get_headers(),
            timeout=self.timeout
        )
        response.raise_for_status()
        
        history = response.json()
        
        # Extract output images
        outputs = {}
        if prompt_id in history:
            prompt_data = history[prompt_id]
            if "outputs" in prompt_data:
                for node_id, node_output in prompt_data["outputs"].items():
                    if "images" in node_output:
                        images = []
                        for img in node_output["images"]:
                            image_url = f"{self.base_url}/view?filename={img['filename']}&subfolder={img.get('subfolder', '')}&type={img.get('type', 'output')}"
                            images.append({
                                "filename": img["filename"],
                                "url": image_url,
                                "type": img.get("type", "output")
                            })
                        outputs[node_id] = {"images": images}
        
        return {
            "prompt_id": prompt_id,
            "status": "completed",
            "outputs": outputs
        }
    
    def interrupt(self) -> bool:
        """Interrupt current queue"""
        url = f"{self.base_url}/interrupt"
        
        response = requests.post(
            url,
            headers=self._get_headers(),
            timeout=self.timeout
        )
        response.raise_for_status()
        
        return response.json().get("success", False)
    
    def get_queue(self) -> Dict[str, Any]:
        """Get current queue status"""
        url = f"{self.base_url}/queue"
        
        response = requests.get(
            url,
            headers=self._get_headers(),
            timeout=self.timeout
        )
        response.raise_for_status()
        
        return response.json()
    
    def upload_image(
        self,
        image_path: str,
        subfolder: str = "input",
        overwrite: bool = False
    ) -> Dict[str, Any]:
        """
        Upload image to ComfyUI.
        
        Args:
            image_path: Path to image file
            subfolder: Subfolder in ComfyUI input directory
            overwrite: Whether to overwrite existing file
        
        Returns:
            Upload result with filename
        """
        url = f"{self.base_url}/upload/image"
        
        with open(image_path, 'rb') as f:
            files = {
                'image': (Path(image_path).name, f, 'image/jpeg')
            }
            data = {
                'subfolder': subfolder,
                'overwrite': str(overwrite).lower()
            }
            
            response = requests.post(
                url,
                files=files,
                data=data,
                headers={"Authorization": f"Bearer {self.api_key}"} if self.api_key else {},
                timeout=self.timeout
            )
            response.raise_for_status()
            
            return response.json()


# Example usage
if __name__ == "__main__":
    from fibo_converter import FIBOToComfyUI
    
    # Initialize
    client = ComfyUIClient(base_url="http://127.0.0.1:8188")
    converter = FIBOToComfyUI()
    
    # Example FIBO JSON
    fibo_json = {
        "subject": {"main_entity": "silver watch"},
        "lighting": {
            "key_light": {
                "intensity": 0.9,
                "color_temperature": 5600,
                "softness": 0.7,
                "enabled": True
            }
        },
        "camera": {"seed": 12345},
        "render": {"resolution": [2048, 2048]}
    }
    
    # Convert to workflow
    workflow = converter.convert_fibo_to_workflow(fibo_json)
    
    # Queue and wait for completion
    def on_progress(status):
        print(f"Progress: {status}")
    
    result = client.queue_prompt(
        workflow,
        wait_for_completion=True,
        on_progress=on_progress
    )
    
    print(f"Generated images: {result['outputs']}")

