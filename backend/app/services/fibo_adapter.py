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
from app.models.schemas import FIBOPrompt, GenerationResponse, LightingPreset
from app.data.mock_data import MockDataManager
import asyncio
import time
from typing import Any, Dict, List, Optional


class FIBOAdapter:
    """
    Adapter class to handle all interactions with the external FIBO API.
    Uses mock data when settings.USE_MOCK_FIBO is True.
    """

    def __init__(self):
        self.mock_manager = MockDataManager()
        self.client = httpx.AsyncClient(
            base_url=settings.FIBO_API_URL,
            headers={
                "Authorization": f"Bearer {settings.FIBO_API_KEY}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )
        self.generation_cache: Dict[str, GenerationResponse] = {}

    async def close(self):
        """Close the HTTP client session."""
        await self.client.aclose()

    async def _mock_generate(
        self,
        fibo_prompt: FIBOPrompt,
        steps: int = settings.DEFAULT_STEPS,
        guidance_scale: float = settings.DEFAULT_GUIDANCE_SCALE,
    ) -> GenerationResponse:
        """Simulate a generation request using mock data."""
        # Simple caching based on prompt hash
        prompt_hash = hash(fibo_prompt.json(exclude_none=True))
        if prompt_hash in self.generation_cache:
            return self.generation_cache[prompt_hash]

        await asyncio.sleep(1.5)  # Simulate network latency

        mock_response = self.mock_manager.get_mock_generation_response(
            fibo_prompt=fibo_prompt, steps=steps, guidance_scale=guidance_scale
        )
        
        # Store in cache
        self.generation_cache[prompt_hash] = mock_response
        return mock_response

    async def _real_generate(
        self,
        fibo_prompt: FIBOPrompt,
        steps: int = settings.DEFAULT_STEPS,
        guidance_scale: float = settings.DEFAULT_GUIDANCE_SCALE,
    ) -> GenerationResponse:
        """Send a generation request to the real FIBO API."""
        payload = fibo_prompt.dict(exclude_none=True)
        payload["render"]["steps"] = steps
        payload["render"]["guidance_scale"] = guidance_scale

        try:
            response = await self.client.post("/models/fibo", json=payload)
            response.raise_for_status()
            
            # Assuming the real API returns a job ID for async processing
            job_data = response.json()
            job_id = job_data.get("job_id")
            
            # For simplicity, we'll mock the polling process here or assume a synchronous response
            # In a real app, this would be a separate status check endpoint
            
            # Mocking a synchronous response for now
            return GenerationResponse(
                generation_id=job_id or f"gen_{int(time.time())}",
                status="completed",
                image_url=job_data.get("image_url", "https://via.placeholder.com/2048x2048?text=Real+FIBO+Result"),
                duration_seconds=5.0,
                cost_credits=settings.COST_PER_GENERATION,
                fibo_json=fibo_prompt,
                analysis=self.mock_manager.get_mock_analysis(),
            )

        except httpx.HTTPStatusError as e:
            print(f"FIBO API Error: {e.response.status_code} - {e.response.text}")
            raise

    async def generate(
        self,
        fibo_prompt: FIBOPrompt,
        steps: int = settings.DEFAULT_STEPS,
        guidance_scale: float = settings.DEFAULT_GUIDANCE_SCALE,
    ) -> GenerationResponse:
        """Generate an image using FIBO, choosing between mock and real API."""
        if settings.USE_MOCK_FIBO:
            return await self._mock_generate(fibo_prompt, steps, guidance_scale)
        else:
            return await self._real_generate(fibo_prompt, steps, guidance_scale)

    async def refine(
        self,
        generation_id: str,
        instruction: str,
        locked_fields: List[str],
    ) -> GenerationResponse:
        """Refine an existing generation."""
        if settings.USE_MOCK_FIBO:
            await asyncio.sleep(1.0)
            return self.mock_manager.get_mock_refinement_response(
                generation_id=generation_id, instruction=instruction, locked_fields=locked_fields
            )
        else:
            # Real API implementation would go here
            raise NotImplementedError("Real FIBO refinement not implemented yet.")

    async def get_presets(self) -> List[LightingPreset]:
        """Get a list of professional lighting presets."""
        await asyncio.sleep(0.1)
        return self.mock_manager.get_all_presets()

    async def get_preset_by_id(self, preset_id: str) -> Optional[LightingPreset]:
        """Get a specific preset by ID."""
        await asyncio.sleep(0.1)
        return self.mock_manager.get_preset_by_id(preset_id)

    async def get_generation_status(self, job_id: str) -> Dict[str, Any]:
        """
        Status Service - Polls the status of a generation job.
        """
        if settings.USE_MOCK_FIBO:
            await asyncio.sleep(0.1)
            return self.mock_manager.get_mock_status(job_id)
        else:
            try:
                response = await self.client.get(f"/jobs/{job_id}")
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                print(f"FIBO Status API Error: {e.response.status_code} - {e.response.text}")
                raise

    # --- New API Integrations ---

    async def ads_generation(self, ad_campaign_data: Dict[str, Any]) -> Dict[str, Any]:
        """Ads Generation API - Generates ad creatives."""
        if settings.USE_MOCK_FIBO:
            await asyncio.sleep(2.0)
            return self.mock_manager.get_mock_ads_generation(ad_campaign_data)
        else:
            # Conceptual endpoint for a high-level ad generation service
            response = await self.client.post("/services/ads-generation", json=ad_campaign_data)
            response.raise_for_status()
            return response.json()

    async def image_onboarding(self, image_url: str, tags: Optional[List[str]] = None) -> Dict[str, Any]:
        """Image Onboarding - Uploads and processes an image for use in generation."""
        if settings.USE_MOCK_FIBO:
            await asyncio.sleep(1.0)
            return self.mock_manager.get_mock_image_onboarding(image_url, tags)
        else:
            data = {
                "image_url": image_url,
                "tags": tags or ["prolight-ai", "onboarded"]
            }
            response = await self.client.post("/assets/onboard", json=data)
            response.raise_for_status()
            return response.json()

    async def video_editing(self, video_url: str, edit_instructions: str) -> Dict[str, Any]:
        """Video Editing (async v2) - Starts an asynchronous video editing job."""
        if settings.USE_MOCK_FIBO:
            await asyncio.sleep(1.5)
            return self.mock_manager.get_mock_video_editing(video_url, edit_instructions)
        else:
            data = {
                "video_url": video_url,
                "instructions": edit_instructions,
                "model": "video-edit-v2",
                "async": True
            }
            response = await self.client.post("/models/video-edit", json=data)
            response.raise_for_status()
            return response.json()

    async def tailored_generation(self, fibo_prompt: FIBOPrompt, user_profile: Dict[str, Any]) -> Dict[str, Any]:
        """Tailored Generation - Generation optimized for a specific user profile."""
        if settings.USE_MOCK_FIBO:
            await asyncio.sleep(1.5)
            return self.mock_manager.get_mock_tailored_generation(fibo_prompt, user_profile)
        else:
            data = {
                "fibo_prompt": fibo_prompt.dict(exclude_none=True),
                "user_profile": user_profile
            }
            response = await self.client.post("/models/tailored-fibo", json=data)
            response.raise_for_status()
            return response.json()

    async def product_shot_editing(self, image_url: str, product_prompt: str) -> Dict[str, Any]:
        """Product Shot Editing - Specialized editing for product images."""
        if settings.USE_MOCK_FIBO:
            await asyncio.sleep(1.0)
            return self.mock_manager.get_mock_product_shot_editing(image_url, product_prompt)
        else:
            data = {
                "image_url": image_url,
                "prompt": product_prompt,
                "model": "product-shot-edit-v1"
            }
            response = await self.client.post("/models/edit", json=data)
            response.raise_for_status()
            return response.json()

    async def image_editing(self, image_url: str, edit_prompt: str) -> Dict[str, Any]:
        """Image Editing - Edits an existing image."""
        if settings.USE_MOCK_FIBO:
            await asyncio.sleep(1.0)
            return self.mock_manager.get_mock_image_editing(image_url, edit_prompt)
        else:
            data = {
                "image_url": image_url,
                "prompt": edit_prompt,
                "model": "image-edit-v1"
            }
            response = await self.client.post("/models/edit", json=data)
            response.raise_for_status()
            return response.json()

    async def image_generation_v1(self, fibo_prompt: FIBOPrompt) -> Dict[str, Any]:
        """Image Generation (v1) - Generates an image based on a FIBO prompt."""
        # This is essentially the same as the existing 'generate' but exposed for clarity
        if settings.USE_MOCK_FIBO:
            await asyncio.sleep(1.5)
            return self.mock_manager.get_mock_generation_v1(fibo_prompt)
        else:
            payload = fibo_prompt.dict(exclude_none=True)
            response = await self.client.post("/models/fibo", json=payload)
            response.raise_for_status()
            return response.json()

# Global instance
fibo_adapter = FIBOAdapter()
    """Adapter for FIBO API communication."""
    
    def __init__(self):
        """Initialize FIBO adapter."""
        self.base_url = settings.FIBO_API_KEY
        self.api_key = settings.FIBO_API_KEY
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
        """Generate using real FIBO API."""
        try:
            payload = {
                "prompt": json.dumps(prompt_json),
                "steps": steps,
                "guidance_scale": guidance_scale,
                "output_format": "url",
                "enhance_hdr": prompt_json.get("enhancements", {}).get("hdr", False)
            }
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            response = await self.client.post(
                f"{self.base_url}/generate",
                json=payload,
                headers=headers
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return {
                    "status": "error",
                    "code": f"FIBO_ERROR_{response.status_code}",
                    "message": f"FIBO API returned status {response.status_code}"
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
