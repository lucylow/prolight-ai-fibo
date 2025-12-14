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
        self.api_key = getattr(settings, 'BRIA_API_TOKEN', None) or getattr(settings, 'BRIA_API_KEY', None)
        self.use_mock = getattr(settings, 'USE_MOCK_FIBO', False)
        self.gemini_api_key = getattr(settings, 'GEMINI_API_KEY', None) or getattr(settings, 'GOOGLE_API_KEY', None)
        self.fal_key = getattr(settings, 'FAL_KEY', None) or getattr(settings, 'FAL_API_KEY', None)
        self.prompt_cache: Dict[str, Any] = {}
        self.client = httpx.AsyncClient(timeout=180.0)
        
        # Try to load local FIBO module
        self.local_fibo_module = self._try_load_local_fibo()
        self.local_vlm_module = self._try_load_local_vlm()
        
        # Initialize pipeline caches (lazy loading)
        self._fibo_pipeline = None
        self._vlm_pipeline = None
        
        if self.local_fibo_module:
            print("✓ Local FIBO module loaded from libs/fibo")
        if self.local_vlm_module:
            print("✓ Local VLM module loaded")
        if self.gemini_api_key:
            print("✓ Gemini API configured for VLM operations")
        if self.fal_key:
            print("✓ fal.ai API configured")
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
    
    def _try_load_local_vlm(self) -> Optional[Any]:
        """
        Attempt to load local VLM module (diffusers).
        
        Returns:
            True if diffusers is available, None otherwise
        """
        try:
            import diffusers
            from diffusers.modular_pipelines import ModularPipeline
            return True
        except ImportError:
            return None
    
    def _get_default_negative_prompt(self, existing_json: Dict[str, Any]) -> str:
        """
        Get default negative prompt based on style_medium.
        
        This implements the helper function from the official FIBO guide.
        """
        negative_prompt = ""
        style_medium = existing_json.get("style_medium", "").lower()
        if style_medium in ["photograph", "photography", "photo"]:
            negative_prompt = """{'style_medium':'digital illustration','artistic_style':'non-realistic'}"""
        return negative_prompt
    
    async def generate_from_prompt(
        self,
        short_prompt: str,
        steps: int = 50,
        guidance_scale: float = 5.0,
        negative_prompt: Optional[str] = None,
        use_local_first: bool = True
    ) -> Dict[str, Any]:
        """
        Generate mode: Convert short text prompt to structured JSON, then generate image.
        
        This implements FIBO's "Generate" workflow:
        1. Short prompt -> VLM -> Structured JSON
        2. Structured JSON -> FIBO -> Image
        
        Args:
            short_prompt: Short natural language description
            steps: Number of inference steps
            guidance_scale: Guidance scale
            negative_prompt: Optional negative prompt
            use_local_first: Whether to prefer local FIBO over remote API
            
        Returns:
            Generation result with image URL, JSON prompt, and metadata
        """
        # Step 1: Convert short prompt to structured JSON using VLM
        json_prompt = await self._prompt_to_json(short_prompt)
        
        # Step 2: Generate image from JSON
        return await self.generate(
            prompt_json=json_prompt,
            steps=steps,
            guidance_scale=guidance_scale,
            negative_prompt=negative_prompt,
            use_local_first=use_local_first
        )
    
    async def generate(
        self,
        prompt_json: Union[Dict[str, Any], str],
        steps: int = 50,
        guidance_scale: float = 5.0,
        negative_prompt: Optional[str] = None,
        use_local_first: bool = True
    ) -> Dict[str, Any]:
        """
        Generate image from FIBO JSON prompt.
        
        Tries in order:
        1. Local FIBO module (if available and use_local_first=True)
        2. Remote Bria API (if API key configured)
        3. Mock mode (if enabled)
        
        Args:
            prompt_json: FIBO JSON prompt structure (dict or JSON string)
            steps: Number of generation steps
            guidance_scale: Guidance scale for generation
            negative_prompt: Optional negative prompt
            use_local_first: Whether to prefer local FIBO over remote API
            
        Returns:
            Generation result with image URL and metadata
        """
        # Parse JSON string if needed
        if isinstance(prompt_json, str):
            try:
                prompt_json = json.loads(prompt_json)
            except json.JSONDecodeError:
                raise ValueError("Invalid JSON string provided")
        
        # Validate prompt against Pydantic model
        try:
            validated_prompt = FiboPrompt(**prompt_json)
            prompt_dict = validated_prompt.to_dict()
        except Exception as e:
            # If validation fails, log warning but continue with original
            print(f"⚠ FIBO prompt validation warning: {e}")
            prompt_dict = prompt_json
        
        # Try local FIBO first (diffusers or submodule)
        if use_local_first:
            try:
                # Try diffusers BriaFiboPipeline first
                return await self._generate_local(prompt_dict, steps, guidance_scale, negative_prompt)
            except Exception as e:
                print(f"⚠ Local FIBO generation failed, falling back: {e}")
        
        # Try fal.ai API if configured
        if self.fal_key and not self.use_mock:
            try:
                return await self._generate_fal(prompt_dict, steps, guidance_scale, negative_prompt)
            except Exception as e:
                print(f"⚠ fal.ai generation failed, falling back: {e}")
        
        # Fall back to mock or remote Bria API
        if self.use_mock:
            return await self._generate_mock(prompt_dict, steps, guidance_scale)
        else:
            return await self._generate_remote(prompt_dict, steps, guidance_scale, negative_prompt)
    
    async def _generate_local(
        self,
        prompt_json: Dict[str, Any],
        steps: int,
        guidance_scale: float,
        negative_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate using local FIBO pipeline (BriaFiboPipeline from diffusers).
        
        This implements the official local inference method from the FIBO guide.
        """
        try:
            from diffusers import BriaFiboPipeline
            import torch
            
            # Lazy load pipeline
            if self._fibo_pipeline is None:
                print("Loading BriaFiboPipeline from Hugging Face...")
                torch.set_grad_enabled(False)
                self._fibo_pipeline = BriaFiboPipeline.from_pretrained(
                    "briaai/FIBO",
                    torch_dtype=torch.bfloat16,
                )
                # Try to use GPU if available, otherwise CPU
                if torch.cuda.is_available():
                    self._fibo_pipeline.to("cuda")
                    print("✓ FIBO pipeline loaded on CUDA")
                else:
                    self._fibo_pipeline.to("cpu")
                    # Enable CPU offload for memory efficiency
                    try:
                        self._fibo_pipeline.enable_model_cpu_offload()
                        print("✓ FIBO pipeline loaded on CPU with offload")
                    except AttributeError:
                        print("✓ FIBO pipeline loaded on CPU")
            
            # Get negative prompt if not provided
            if negative_prompt is None:
                negative_prompt = self._get_default_negative_prompt(prompt_json)
            
            # Convert prompt_json to JSON string (FIBO expects JSON string)
            prompt_json_str = json.dumps(prompt_json) if isinstance(prompt_json, dict) else prompt_json
            
            # Generate image
            results = self._fibo_pipeline(
                prompt=prompt_json_str,
                num_inference_steps=steps,
                guidance_scale=guidance_scale,
                negative_prompt=negative_prompt if negative_prompt else None
            )
            
            # Extract image from results
            image = results.images[0] if hasattr(results, 'images') and results.images else results[0]
            
            # Save image
            image_path = self._save_pil_image(image)
            
            return {
                "status": "success",
                "generation_id": f"local_{hashlib.sha256(json.dumps(prompt_json, sort_keys=True).encode()).hexdigest()[:12]}",
                "image_path": image_path,
                "image_url": f"file://{image_path}",
                "duration_seconds": 0,  # Local generation doesn't track duration
                "cost_credits": 0,  # Free for local
                "seed": prompt_json.get("camera", {}).get("seed"),
                "steps": steps,
                "guidance_scale": guidance_scale,
                "timestamp": datetime.utcnow().isoformat(),
                "model": "FIBO-local-diffusers"
            }
            
        except ImportError:
            # Fall back to submodule if diffusers not available
            if not self.local_fibo_module:
                raise RuntimeError("Local FIBO not available: diffusers not installed and no local module found")
            
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
        os.makedirs(out_dir, exist_ok=True)
        data = base64.b64decode(b64_str)
        fn = f"{int(datetime.utcnow().timestamp() * 1000)}_{hashlib.md5(data).hexdigest()[:8]}.png"
        fp = os.path.join(out_dir, fn)
        with open(fp, "wb") as f:
            f.write(data)
        return fp
    
    def _save_pil_image(self, image, out_dir: str = "backend/generated_images") -> str:
        """Save PIL Image to disk."""
        from PIL import Image
        os.makedirs(out_dir, exist_ok=True)
        fn = f"{int(datetime.utcnow().timestamp() * 1000)}_{hashlib.md5(image.tobytes()).hexdigest()[:8]}.png"
        fp = os.path.join(out_dir, fn)
        image.save(fp)
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
    
    async def _generate_fal(
        self,
        prompt_json: Dict[str, Any],
        steps: int,
        guidance_scale: float,
        negative_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate using fal.ai cloud API.
        
        This implements the fal.ai FIBO integration from the official guide.
        """
        if not self.fal_key:
            raise RuntimeError("fal.ai API key not configured. Set FAL_KEY environment variable.")
        
        # Prepare payload for fal.ai
        payload = {
            "prompt": json.dumps(prompt_json),  # fal.ai accepts JSON string
            "seed": prompt_json.get("camera", {}).get("seed", 5555),
            "steps_num": steps,
            "aspect_ratio": "1:1",  # Default, can be extracted from render.resolution
            "guidance_scale": guidance_scale
        }
        
        # Extract aspect ratio from resolution if available
        resolution = prompt_json.get("render", {}).get("resolution", [1024, 1024])
        if isinstance(resolution, list) and len(resolution) >= 2:
            width, height = resolution[0], resolution[1]
            # Calculate aspect ratio
            from math import gcd
            divisor = gcd(width, height)
            aspect_ratio = f"{width // divisor}:{height // divisor}"
            payload["aspect_ratio"] = aspect_ratio
        
        # Use structured_prompt if available (more precise)
        if "structured_prompt" not in payload:
            payload["structured_prompt"] = prompt_json
        
        try:
            # fal.ai uses subscription-based API (fal.run endpoint)
            # Note: This is a Python implementation of the JavaScript fal.subscribe pattern
            response = await self.client.post(
                "https://fal.run/bria/fibo/generate",
                headers={
                    "Authorization": f"Key {self.fal_key}",
                    "Content-Type": "application/json"
                },
                json={"input": payload},
                timeout=300.0  # Longer timeout for image generation
            )
            
            if response.status_code != 200:
                error_detail = response.text[:500]
                raise RuntimeError(f"fal.ai API error {response.status_code}: {error_detail}")
            
            result = response.json()
            
            # Extract image URL from fal.ai response
            image_url = None
            if "data" in result and "image" in result["data"]:
                if isinstance(result["data"]["image"], dict):
                    image_url = result["data"]["image"].get("url")
                else:
                    image_url = result["data"]["image"]
            
            return {
                "status": "success",
                "generation_id": result.get("request_id", f"fal_{hashlib.sha256(json.dumps(prompt_json, sort_keys=True).encode()).hexdigest()[:12]}"),
                "image_url": image_url,
                "duration_seconds": result.get("duration", 0),
                "cost_credits": result.get("cost", 0.04),
                "seed": payload.get("seed"),
                "steps": steps,
                "guidance_scale": guidance_scale,
                "timestamp": datetime.utcnow().isoformat(),
                "model": "FIBO-fal.ai",
                "raw": result
            }
            
        except httpx.HTTPStatusError as e:
            raise RuntimeError(f"fal.ai API error: {e.response.text[:500]}")
        except Exception as e:
            raise RuntimeError(f"fal.ai generation failed: {str(e)}")
    
    async def _generate_remote(
        self,
        prompt_json: Dict[str, Any],
        steps: int,
        guidance_scale: float,
        negative_prompt: Optional[str] = None
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
        existing_json: Union[Dict[str, Any], str],
        instruction: str,
        steps: int = 50,
        guidance_scale: float = 5.0,
        locked_fields: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Refine mode: Update existing JSON prompt with a short instruction.
        
        This implements FIBO's "Refine" workflow:
        1. Existing JSON + instruction -> VLM -> Updated JSON
        2. Updated JSON -> FIBO -> Image
        
        Args:
            existing_json: Previous FIBO JSON prompt (dict or JSON string)
            instruction: Short instruction (e.g., "make it sunset", "add rim light")
            steps: Number of inference steps
            guidance_scale: Guidance scale
            locked_fields: Fields to keep unchanged (e.g., ["camera", "subject"])
            
        Returns:
            Refined generation result with updated JSON and image
        """
        # Parse JSON string if needed
        if isinstance(existing_json, str):
            try:
                existing_json = json.loads(existing_json)
            except json.JSONDecodeError:
                raise ValueError("Invalid JSON string provided")
        
        # Step 1: Use VLM to refine the JSON
        refined_json = await self._refine_json_with_vlm(existing_json, instruction, locked_fields)
        
        # Step 2: Generate image from refined JSON
        result = await self.generate(
            prompt_json=refined_json,
            steps=steps,
            guidance_scale=guidance_scale,
            use_local_first=True
        )
        
        # Add refinement metadata
        result["refinement"] = {
            "instruction": instruction,
            "locked_fields": locked_fields or [],
            "original_json": existing_json,
            "refined_json": refined_json
        }
        
        return result
    
    async def inspire(
        self,
        image: Union[str, bytes, Any],  # URL, base64, PIL Image, or file path
        instruction: Optional[str] = None,
        steps: int = 50,
        guidance_scale: float = 5.0
    ) -> Dict[str, Any]:
        """
        Inspire mode: Extract structured JSON from an image, optionally blend with instruction.
        
        This implements FIBO's "Inspire" workflow:
        1. Image -> VLM -> Structured JSON (optionally blended with instruction)
        2. Structured JSON -> FIBO -> Image (variation)
        
        Args:
            image: Input image (URL string, base64 bytes, PIL Image, or file path)
            instruction: Optional instruction to blend with extracted JSON
            steps: Number of inference steps
            guidance_scale: Guidance scale
            
        Returns:
            Generation result with extracted JSON and new image
        """
        # Step 1: Extract JSON from image using VLM
        extracted_json = await self._extract_json_from_image(image, instruction)
        
        # Step 2: Generate image from extracted JSON
        result = await self.generate(
            prompt_json=extracted_json,
            steps=steps,
            guidance_scale=guidance_scale,
            use_local_first=True
        )
        
        # Add inspiration metadata
        result["inspiration"] = {
            "source_image": str(image)[:100] if isinstance(image, (str, bytes)) else "provided",
            "instruction": instruction,
            "extracted_json": extracted_json
        }
        
        return result
    
    async def _prompt_to_json(self, short_prompt: str) -> Dict[str, Any]:
        """
        Convert short text prompt to structured FIBO JSON using VLM.
        
        Uses Gemini API or local VLM if available.
        """
        # Try local VLM first
        if self.local_vlm_module:
            try:
                return await self._prompt_to_json_local(short_prompt)
            except Exception as e:
                print(f"⚠ Local VLM failed, falling back to Gemini: {e}")
        
        # Fall back to Gemini API
        if self.gemini_api_key:
            return await self._prompt_to_json_gemini(short_prompt)
        
        # Fall back to simple structured prompt
        return self._prompt_to_json_simple(short_prompt)
    
    async def _prompt_to_json_local(self, short_prompt: str) -> Dict[str, Any]:
        """Convert prompt to JSON using local VLM (diffusers ModularPipeline)."""
        try:
            from diffusers.modules import ModularPipeline
            
            # Load VLM pipeline
            if not hasattr(self, '_vlm_pipeline'):
                print("Loading FIBO VLM pipeline...")
                self._vlm_pipeline = ModularPipeline.from_pretrained(
                    "briaai/FIBO-gemini-prompt-to-JSON",
                    trust_remote_code=True
                )
            
            # Generate JSON from prompt
            vlm_output = self._vlm_pipeline(prompt=short_prompt)
            json_prompt_str = vlm_output.values.get("json_prompt", "{}")
            
            return json.loads(json_prompt_str)
        except Exception as e:
            print(f"Error in local VLM: {e}")
            raise
    
    async def _prompt_to_json_gemini(self, short_prompt: str) -> Dict[str, Any]:
        """Convert prompt to JSON using Gemini API."""
        if not self.gemini_api_key:
            raise RuntimeError("Gemini API key not configured")
        
        # Use Gemini to convert prompt to FIBO JSON
        system_prompt = """You are a professional photography director. Convert the short text prompt into a detailed FIBO JSON structure for AI image generation.

Output ONLY valid JSON matching this structure:
{
  "subject": {
    "main_entity": "...",
    "attributes": ["..."],
    "action": "...",
    "mood": "..."
  },
  "environment": {
    "setting": "...",
    "time_of_day": "...",
    "lighting_conditions": "..."
  },
  "camera": {
    "fov": 50.0,
    "aperture": 2.8,
    "shot_type": "...",
    "camera_angle": "..."
  },
  "lighting": {
    "main_light": {
      "type": "area",
      "direction": "...",
      "intensity": 0.8,
      "color_temperature": 5600,
      "softness": 0.5
    }
  },
  "render": {
    "resolution": [1024, 1024]
  }
}

Output ONLY the JSON, no markdown, no explanation."""
        
        try:
            response = await self.client.post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent",
                headers={
                    "Content-Type": "application/json",
                },
                params={"key": self.gemini_api_key},
                json={
                    "contents": [{
                        "parts": [
                            {"text": system_prompt},
                            {"text": f"Convert this prompt to FIBO JSON:\n\n{short_prompt}"}
                        ]
                    }]
                }
            )
            
            if response.status_code != 200:
                raise RuntimeError(f"Gemini API error: {response.status_code}")
            
            data = response.json()
            text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
            
            # Extract JSON from response
            json_match = json.loads(text) if text.strip().startswith("{") else json.loads(text.split("```json")[1].split("```")[0] if "```json" in text else text.split("```")[1] if "```" in text else text)
            return json_match
        except Exception as e:
            print(f"Error calling Gemini API: {e}")
            return self._prompt_to_json_simple(short_prompt)
    
    def _prompt_to_json_simple(self, short_prompt: str) -> Dict[str, Any]:
        """Fallback: Create simple FIBO JSON from prompt."""
        from app.models_fibo import create_default_fibo_prompt
        prompt = create_default_fibo_prompt(subject_text=short_prompt)
        return prompt.to_dict()
    
    async def _refine_json_with_vlm(
        self,
        existing_json: Dict[str, Any],
        instruction: str,
        locked_fields: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Refine existing JSON with instruction using VLM."""
        # Try local VLM first
        if self.local_vlm_module:
            try:
                return await self._refine_json_local(existing_json, instruction, locked_fields)
            except Exception as e:
                print(f"⚠ Local VLM refine failed, falling back to Gemini: {e}")
        
        # Fall back to Gemini
        if self.gemini_api_key:
            return await self._refine_json_gemini(existing_json, instruction, locked_fields)
        
        # Simple fallback: manual refinement
        return self._refine_json_simple(existing_json, instruction, locked_fields)
    
    async def _refine_json_local(
        self,
        existing_json: Dict[str, Any],
        instruction: str,
        locked_fields: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Refine JSON using local VLM."""
        try:
            from diffusers.modules import ModularPipeline
            
            if not hasattr(self, '_vlm_pipeline'):
                self._vlm_pipeline = ModularPipeline.from_pretrained(
                    "briaai/FIBO-gemini-prompt-to-JSON",
                    trust_remote_code=True
                )
            
            json_str = json.dumps(existing_json)
            vlm_output = self._vlm_pipeline(
                json_prompt=json_str,
                prompt=instruction
            )
            refined_json_str = vlm_output.values.get("json_prompt", json_str)
            
            return json.loads(refined_json_str)
        except Exception as e:
            print(f"Error in local VLM refine: {e}")
            raise
    
    async def _refine_json_gemini(
        self,
        existing_json: Dict[str, Any],
        instruction: str,
        locked_fields: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Refine JSON using Gemini API."""
        system_prompt = f"""You are a professional photography director. Update the FIBO JSON based on the instruction, keeping locked fields unchanged.

Locked fields (do not modify): {locked_fields or []}

Output ONLY the updated JSON, no markdown."""
        
        try:
            response = await self.client.post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent",
                headers={"Content-Type": "application/json"},
                params={"key": self.gemini_api_key},
                json={
                    "contents": [{
                        "parts": [
                            {"text": system_prompt},
                            {"text": f"Original JSON:\n{json.dumps(existing_json, indent=2)}\n\nInstruction: {instruction}\n\nUpdated JSON:"}
                        ]
                    }]
                }
            )
            
            if response.status_code != 200:
                raise RuntimeError(f"Gemini API error: {response.status_code}")
            
            data = response.json()
            text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
            
            # Extract JSON
            refined = json.loads(text.split("```json")[1].split("```")[0] if "```json" in text else text.split("```")[1] if "```" in text else text)
            return refined
        except Exception as e:
            print(f"Error calling Gemini API for refine: {e}")
            return self._refine_json_simple(existing_json, instruction, locked_fields)
    
    def _refine_json_simple(
        self,
        existing_json: Dict[str, Any],
        instruction: str,
        locked_fields: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Simple fallback refinement."""
        import copy
        refined = copy.deepcopy(existing_json)
        
        # Simple keyword-based refinement
        instruction_lower = instruction.lower()
        if "sunset" in instruction_lower or "warm" in instruction_lower:
            if "lighting" in refined and isinstance(refined["lighting"], dict):
                if "main_light" in refined["lighting"]:
                    refined["lighting"]["main_light"]["color_temperature"] = 3200
        
        return refined
    
    async def _extract_json_from_image(
        self,
        image: Union[str, bytes, Any],
        instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """Extract FIBO JSON from image using VLM."""
        # Try local VLM first
        if self.local_vlm_module:
            try:
                return await self._extract_json_local(image, instruction)
            except Exception as e:
                print(f"⚠ Local VLM extract failed, falling back to Gemini: {e}")
        
        # Fall back to Gemini
        if self.gemini_api_key:
            return await self._extract_json_gemini(image, instruction)
        
        # Fallback
        return self._prompt_to_json_simple("extracted from image")
    
    async def _extract_json_local(
        self,
        image: Union[str, bytes, Any],
        instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """Extract JSON from image using local VLM."""
        try:
            from diffusers.modular_pipelines import ModularPipeline
            from PIL import Image
            
            # Lazy load VLM pipeline
            if self._vlm_pipeline is None:
                if not os.getenv("GOOGLE_API_KEY") and not self.gemini_api_key:
                    raise RuntimeError("GOOGLE_API_KEY environment variable is not set.")
                
                self._vlm_pipeline = ModularPipeline.from_pretrained(
                    "briaai/FIBO-gemini-prompt-to-JSON",
                    trust_remote_code=True
                )
            
            # Load image
            if isinstance(image, str):
                if image.startswith("http"):
                    # Download image
                    img_response = await self.client.get(image)
                    image = Image.open(BytesIO(img_response.content))
                else:
                    # File path
                    image = Image.open(image)
            elif isinstance(image, bytes):
                image = Image.open(BytesIO(image))
            # If image is already a PIL Image, use it directly
            
            # Extract JSON
            vlm_output = self._vlm_pipeline(
                image=image,
                prompt=instruction or "extract FIBO JSON structure"
            )
            json_str = vlm_output.values.get("json_prompt", "{}")
            
            if isinstance(json_str, str):
                return json.loads(json_str)
            return json_str
        except ImportError as e:
            raise RuntimeError(f"diffusers not installed. Install with: pip install git+https://github.com/huggingface/diffusers")
        except Exception as e:
            print(f"Error in local VLM extract: {e}")
            raise
    
    async def _extract_json_gemini(
        self,
        image: Union[str, bytes, Any],
        instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """Extract JSON from image using Gemini API."""
        # Load and encode image
        if isinstance(image, str):
            if image.startswith("http"):
                img_response = await self.client.get(image)
                image_bytes = img_response.content
            else:
                with open(image, "rb") as f:
                    image_bytes = f.read()
        elif isinstance(image, bytes):
            image_bytes = image
        else:
            # PIL Image
            buffer = BytesIO()
            image.save(buffer, format="PNG")
            image_bytes = buffer.getvalue()
        
        image_b64 = base64.b64encode(image_bytes).decode()
        
        system_prompt = """Extract a FIBO JSON structure from this image. Output ONLY valid JSON matching the FIBO schema."""
        
        try:
            response = await self.client.post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent",
                headers={"Content-Type": "application/json"},
                params={"key": self.gemini_api_key},
                json={
                    "contents": [{
                        "parts": [
                            {"text": system_prompt},
                            {
                                "inline_data": {
                                    "mime_type": "image/png",
                                    "data": image_b64
                                }
                            },
                            {"text": instruction or "Extract FIBO JSON structure from this image."}
                        ]
                    }]
                }
            )
            
            if response.status_code != 200:
                raise RuntimeError(f"Gemini API error: {response.status_code}")
            
            data = response.json()
            text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
            
            # Extract JSON
            extracted = json.loads(text.split("```json")[1].split("```")[0] if "```json" in text else text.split("```")[1] if "```" in text else text)
            return extracted
        except Exception as e:
            print(f"Error calling Gemini API for extract: {e}")
            return self._prompt_to_json_simple("extracted from image")
    
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
