"""
FIBO Adapter - Interface for FIBO API communication.
Handles local FIBO repo (if available), mock, and remote API calls.
Prefers local FIBO code from libs/fibo submodule, falls back to Bria API.
"""

import json
import hashlib
import os
import sys
import importlib
import importlib.util
from typing import Dict, Any, Optional
from datetime import datetime
from pathlib import Path
import httpx
from app.core.config import settings
from app.models_fibo import FiboPrompt


class FIBOAdapter:
    """
    Adapter for FIBO API communication.
    
    Supports three modes (in priority order):
    1. Local FIBO repo (libs/fibo) - if submodule is present and importable
    2. Remote Bria API - if API key is configured
    3. Mock mode - for development/testing
    """
    
    def __init__(self):
        """Initialize FIBO adapter."""
        self.base_url = getattr(settings, 'BRIA_API_URL', 'https://engine.prod.bria-api.com/v2')
        self.api_key = getattr(settings, 'BRIA_API_TOKEN', None)
        self.use_mock = getattr(settings, 'USE_MOCK_FIBO', False)
        self.prompt_cache: Dict[str, Any] = {}
        self.client = httpx.AsyncClient(timeout=180.0)
        
        # Try to load local FIBO module
        self.local_fibo_module = self._try_load_local_fibo()
        
        if self.local_fibo_module:
            print("✓ Local FIBO module loaded from libs/fibo")
        elif self.api_key and not self.use_mock:
            print("✓ Using remote Bria API")
        else:
            print("⚠ Using mock FIBO (no local repo, no API key)")
    
    def _try_load_local_fibo(self) -> Optional[Any]:
        """
        Attempt to load local FIBO module from libs/fibo submodule.
        
        Returns:
            Module if found, None otherwise
        """
        try:
            # Get repo root (assuming backend/app/services/fibo_adapter.py structure)
            repo_root = Path(__file__).resolve().parents[3]
            fibo_path = repo_root / "libs" / "fibo"
            
            if not fibo_path.exists():
                return None
            
            # Add to Python path
            if str(fibo_path) not in sys.path:
                sys.path.insert(0, str(fibo_path))
            
            # Try to import FIBO module
            # Note: Actual import path depends on Bria-AI/FIBO repo structure
            # Common patterns: fibo, fibo_api, src.fibo, etc.
            for module_name in ['fibo', 'fibo_api', 'src.fibo', 'api']:
                try:
                    spec = importlib.util.find_spec(module_name)
                    if spec and spec.loader:
                        module = importlib.import_module(module_name)
                        # Check if it has expected functions
                        if hasattr(module, 'generate') or hasattr(module, 'generate_from_json'):
                            return module
                except (ImportError, ModuleNotFoundError):
                    continue
            
            # If direct import fails, check for Python files in fibo_path
            python_files = list(fibo_path.rglob("*.py"))
            if python_files:
                # Try importing from the first Python file found
                # This is a fallback - actual structure may vary
                return None  # Could implement more sophisticated discovery here
            
            return None
        except Exception as e:
            print(f"⚠ Could not load local FIBO module: {e}")
            return None
    
    async def generate(
        self,
        prompt_json: Dict[str, Any],
        steps: int = 40,
        guidance_scale: float = 7.5,
        use_local_first: bool = True
    ) -> Dict[str, Any]:
        """
        Generate image from FIBO JSON prompt.
        
        Tries in order:
        1. Local FIBO module (if available and use_local_first=True)
        2. Remote Bria API (if API key configured)
        3. Mock mode (if enabled)
        
        Args:
            prompt_json: FIBO JSON prompt structure (validated via Pydantic)
            steps: Number of generation steps
            guidance_scale: Guidance scale for generation
            use_local_first: Whether to prefer local FIBO over remote API
            
        Returns:
            Generation result with image URL and metadata
        """
        # Validate prompt against Pydantic model
        try:
            validated_prompt = FiboPrompt(**prompt_json)
            prompt_dict = validated_prompt.to_dict()
        except Exception as e:
            # If validation fails, log warning but continue with original
            print(f"⚠ FIBO prompt validation warning: {e}")
            prompt_dict = prompt_json
        
        # Try local FIBO first
        if use_local_first and self.local_fibo_module:
            try:
                return await self._generate_local(prompt_dict, steps, guidance_scale)
            except Exception as e:
                print(f"⚠ Local FIBO generation failed, falling back: {e}")
        
        # Fall back to mock or remote
        if self.use_mock:
            return await self._generate_mock(prompt_dict, steps, guidance_scale)
        else:
            return await self._generate_remote(prompt_dict, steps, guidance_scale)
    
    async def _generate_local(
        self,
        prompt_json: Dict[str, Any],
        steps: int,
        guidance_scale: float
    ) -> Dict[str, Any]:
        """
        Generate using local FIBO module from libs/fibo.
        
        This is a placeholder that adapts to the actual FIBO repo API.
        The exact function signature depends on the Bria-AI/FIBO repository structure.
        """
        if not self.local_fibo_module:
            raise RuntimeError("Local FIBO module not available")
        
        # Try common function names from FIBO API
        if hasattr(self.local_fibo_module, 'generate_from_json'):
            result = self.local_fibo_module.generate_from_json(
                prompt_json,
                steps=steps,
                guidance_scale=guidance_scale
            )
        elif hasattr(self.local_fibo_module, 'generate'):
            result = self.local_fibo_module.generate(
                prompt_json,
                steps=steps,
                guidance_scale=guidance_scale
            )
        else:
            raise RuntimeError(
                "Local FIBO module found but no recognized generate function. "
                "Expected 'generate_from_json' or 'generate'."
            )
        
        # Normalize result format
        if isinstance(result, dict):
            if "image_path" in result or "image_url" in result:
                return result
            # If result has base64 image, save it
            if "b64" in result or "base64" in result:
                b64_data = result.get("b64") or result.get("base64")
                image_path = self._save_base64_image(b64_data)
                result["image_path"] = image_path
                result["image_url"] = f"file://{image_path}"
            return result
        
        # If result is a PIL Image or other format, convert
        return {
            "status": "success",
            "generation_id": f"local_{hashlib.sha256(json.dumps(prompt_json, sort_keys=True).encode()).hexdigest()[:12]}",
            "raw_result": str(result),
            "model": "FIBO-local"
        }
    
    def _save_base64_image(self, b64_str: str, out_dir: str = "backend/generated_images") -> str:
        """Save base64 image to disk."""
        import base64
        os.makedirs(out_dir, exist_ok=True)
        data = base64.b64decode(b64_str)
        fn = f"{int(datetime.utcnow().timestamp() * 1000)}_{hashlib.md5(data).hexdigest()[:8]}.png"
        fp = os.path.join(out_dir, fn)
        with open(fp, "wb") as f:
            f.write(data)
        return fp
    
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
    
    async def _generate_remote(
        self,
        prompt_json: Dict[str, Any],
        steps: int,
        guidance_scale: float
    ) -> Dict[str, Any]:
        """
        Generate using remote Bria API.
        
        Uses the BriaClient for proper API communication.
        """
        if not self.api_key:
            raise RuntimeError("Bria API key not configured. Set BRIA_API_TOKEN environment variable.")
        
        try:
            # Use BriaClient for proper API communication
            from app.clients.bria_client import BriaClient
            
            async with BriaClient(
                api_token=self.api_key,
                base_url=self.base_url
            ) as client:
                result = await client.generate_image(
                    structured_prompt=prompt_json,
                    num_results=1,
                    sync=True
                )
                
                # Normalize response format
                if "image_url" in result or "images" in result:
                    return {
                        "status": "success",
                        "generation_id": result.get("request_id", "unknown"),
                        "image_url": result.get("image_url") or (result.get("images", [None])[0]),
                        "duration_seconds": result.get("duration", 0),
                        "cost_credits": result.get("cost", 0.04),
                        "seed": prompt_json.get("camera", {}).get("seed"),
                        "steps": steps,
                        "guidance_scale": guidance_scale,
                        "timestamp": datetime.utcnow().isoformat(),
                        "model": "FIBO-remote",
                        "resolution": prompt_json.get("render", {}).get("resolution", [1024, 1024]),
                        "raw": result
                    }
                return result
                
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
