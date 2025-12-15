"""
FIBO Adapter - Interface for FIBO API communication.
Handles both mock and real FIBO API calls.
"""

import json
import hashlib
from typing import Dict, Any, Optional
from datetime import datetime
import httpx
from app.core.config import settings


class FIBOAdapter:
    """Adapter for FIBO API communication."""
    
    def __init__(self):
        """Initialize FIBO adapter."""
        # Prefer BRIA_API_URL and BRIA_API_TOKEN, fall back to FIBO_* for backward compatibility
        self.base_url = getattr(settings, 'BRIA_API_URL', None) or settings.FIBO_API_URL
        self.api_key = getattr(settings, 'BRIA_API_TOKEN', None) or settings.FIBO_API_KEY
        self.use_mock = settings.USE_MOCK_FIBO
        self.prompt_cache: Dict[str, Any] = {}
        self.client = httpx.AsyncClient(timeout=180.0)
    
    async def generate(
        self,
        prompt_json: Dict[str, Any],
        steps: int = 40,
        guidance_scale: float = 7.5
    ) -> Dict[str, Any]:
        """
        Generate image from FIBO JSON prompt.
        
        Args:
            prompt_json: FIBO JSON prompt structure
            steps: Number of generation steps
            guidance_scale: Guidance scale for generation
            
        Returns:
            Generation result with image URL and metadata
        """
        if self.use_mock:
            return await self._generate_mock(prompt_json, steps, guidance_scale)
        else:
            return await self._generate_real(prompt_json, steps, guidance_scale)
    
    async def _generate_mock(
        self,
        prompt_json: Dict[str, Any],
        steps: int,
        guidance_scale: float
    ) -> Dict[str, Any]:
        """Generate using mock data."""
        prompt_hash = hashlib.sha256(json.dumps(prompt_json, sort_keys=True).encode()).hexdigest()
        
        # Check cache
        if prompt_hash in self.prompt_cache:
            return self.prompt_cache[prompt_hash]
        
        # Generate mock response
        result = {
            "status": "success",
            "generation_id": f"gen_{prompt_hash[:12]}",
            "image_url": f"https://via.placeholder.com/2048x2048?text=ProLight+AI+{prompt_hash[:8]}",
            "duration_seconds": 3.5,
            "cost_credits": 0.04,
            "seed": prompt_json.get("camera", {}).get("seed", 42),
            "steps": steps,
            "guidance_scale": guidance_scale,
            "timestamp": datetime.utcnow().isoformat(),
            "model": "FIBO",
            "resolution": prompt_json.get("render", {}).get("resolution", [2048, 2048])
        }
        
        # Cache result
        self.prompt_cache[prompt_hash] = result
        return result
    
    async def _generate_real(
        self,
        prompt_json: Dict[str, Any],
        steps: int,
        guidance_scale: float
    ) -> Dict[str, Any]:
        """Generate using real Bria FIBO API."""
        try:
            # Validate API key
            if not self.api_key:
                return {
                    "status": "error",
                    "code": "FIBO_NO_API_KEY",
                    "message": "FIBO_API_KEY or BRIA_API_TOKEN must be configured. Set USE_MOCK_FIBO=true for mock mode."
                }
            
            # Use Bria FIBO API format: /image/generate with structured_prompt
            # Default to Bria API v2 if base_url is not set or is old format
            bria_url = self.base_url if self.base_url and "bria-api.com" in self.base_url else "https://engine.prod.bria-api.com/v2"
            
            payload = {
                "structured_prompt": prompt_json,  # Use structured_prompt, not prompt as JSON string
                "num_results": 1,
                "sync": True,  # Sync mode for simplicity
            }
            
            # Add optional parameters
            if steps:
                payload["steps"] = steps
            if guidance_scale:
                payload["guidance_scale"] = guidance_scale
            
            headers = {
                "api_token": self.api_key,  # Bria uses api_token header, not Authorization Bearer
                "Content-Type": "application/json"
            }
            
            response = await self.client.post(
                f"{bria_url}/image/generate",  # Use correct endpoint
                json=payload,
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                # Extract image URL from Bria response format
                result = {
                    "status": "success",
                    "generation_id": data.get("request_id") or data.get("id"),
                    "image_url": None,
                    "duration_seconds": None,
                    "cost_credits": 0.04,
                    "timestamp": datetime.utcnow().isoformat(),
                    "model": "FIBO"
                }
                
                # Handle Bria API response format
                # Bria returns: { request_id, status, data: { images: [{ url, seed }] } }
                if isinstance(data, dict):
                    # Check data field (sync response)
                    if "data" in data:
                        data_obj = data["data"]
                        if isinstance(data_obj, dict):
                            # Look for images array in data
                            if "images" in data_obj and isinstance(data_obj["images"], list) and len(data_obj["images"]) > 0:
                                first_img = data_obj["images"][0]
                                if isinstance(first_img, dict):
                                    result["image_url"] = first_img.get("url") or first_img.get("image_url")
                                elif isinstance(first_img, str):
                                    result["image_url"] = first_img
                            # Or direct image_url in data
                            elif "image_url" in data_obj:
                                result["image_url"] = data_obj["image_url"]
                    
                    # Check direct images field
                    elif "images" in data:
                        images = data["images"]
                        if isinstance(images, list) and len(images) > 0:
                            first_img = images[0]
                            if isinstance(first_img, dict):
                                result["image_url"] = first_img.get("url") or first_img.get("image_url")
                            elif isinstance(first_img, str):
                                result["image_url"] = first_img
                    
                    # Check direct image_url field
                    elif "image_url" in data:
                        result["image_url"] = data["image_url"]
                    
                    # Extract seed if available
                    if "data" in data and isinstance(data["data"], dict):
                        images = data["data"].get("images", [])
                        if images and len(images) > 0 and isinstance(images[0], dict):
                            result["seed"] = images[0].get("seed")
                
                return result
            else:
                try:
                    error_detail = response.text[:500]
                except:
                    error_detail = f"HTTP {response.status_code}"
                return {
                    "status": "error",
                    "code": f"FIBO_ERROR_{response.status_code}",
                    "message": f"FIBO API returned status {response.status_code}: {error_detail}"
                }
        except Exception as e:
            return {
                "status": "error",
                "code": "FIBO_CONNECTION_ERROR",
                "message": str(e)
            }
    
    async def refine(
        self,
        generation_id: str,
        instruction: str,
        locked_fields: Optional[list] = None
    ) -> Dict[str, Any]:
        """
        Refine a previous generation.
        
        Args:
            generation_id: ID of generation to refine
            instruction: Refinement instruction
            locked_fields: Fields to keep unchanged
            
        Returns:
            Refined generation result
        """
        # Mock implementation
        return {
            "status": "success",
            "generation_id": f"refined_{generation_id}",
            "parent_generation_id": generation_id,
            "instruction": instruction,
            "locked_fields": locked_fields or [],
            "image_url": f"https://via.placeholder.com/2048x2048?text=Refined+{generation_id[:8]}",
            "duration_seconds": 2.8,
            "cost_credits": 0.04,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def batch_generate(
        self,
        items: list,
        preset_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate multiple images in batch.
        
        Args:
            items: List of items to generate
            preset_name: Optional preset to apply
            
        Returns:
            Batch job result
        """
        batch_id = f"batch_{hashlib.md5(str(items).encode()).hexdigest()[:12]}"
        
        results = []
        total_cost = 0
        
        for i, item in enumerate(items):
            result = await self.generate(item)
            result["batch_index"] = i
            results.append(result)
            total_cost += result.get("cost_credits", 0.04)
        
        return {
            "status": "success",
            "batch_id": batch_id,
            "items_total": len(items),
            "items_completed": len(results),
            "total_cost": total_cost,
            "results": results,
            "preset_used": preset_name,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()
