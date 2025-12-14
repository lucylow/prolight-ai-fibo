"""
Bria API V1 Wrapper Endpoints

Wraps Bria V1 pipelines:
- text-to-image (base/fast/hd)
- text-to-vector
- reimagine
- prompt_enhancer

Features:
- Accepts guidance images as base64 or URLs (server fetches URLs automatically)
- Supports up to 2 ControlNet guidance methods
- Supports Image Prompt Adapter
- Handles sync/async modes
- Integrates with status polling service
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
import httpx
import base64
import os
from app.core.config import settings

router = APIRouter(prefix="/api/v1", tags=["Bria V1"])

BRIA_API_TOKEN = settings.BRIA_API_TOKEN or os.getenv("BRIA_API_TOKEN")
BRIA_V1_BASE = os.getenv("BRIA_V1_BASE", "https://engine.prod.bria-api.com/v1")

if not BRIA_API_TOKEN:
    print("WARNING: BRIA_API_TOKEN not set. Bria V1 endpoints will fail.")


# ============================================================================
# Request/Response Models
# ============================================================================

class GuidanceMethod(BaseModel):
    """ControlNet guidance method configuration."""
    method: Literal["controlnet_canny", "controlnet_depth", "controlnet_recoloring", "controlnet_color_grid"]
    scale: float = Field(default=1.0, ge=0.0, le=1.0)
    image_base64: Optional[str] = None
    image_url: Optional[str] = None


class ImagePromptAdapter(BaseModel):
    """Image Prompt Adapter configuration."""
    mode: Literal["regular", "style_only"] = "regular"
    scale: float = Field(default=1.0, ge=0.0, le=1.0)
    image_base64: Optional[str] = None
    image_urls: Optional[List[str]] = None


class GenerateImageRequest(BaseModel):
    """Request for /v1/generate/image endpoint."""
    pipeline: Literal["base", "fast", "hd"] = "base"
    model_version: Optional[str] = None
    prompt: str
    num_results: int = Field(default=1, ge=1, le=4)
    aspect_ratio: Literal["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9"] = "1:1"
    sync: bool = False
    seed: Optional[int] = None
    negative_prompt: Optional[str] = None
    steps_num: Optional[int] = None
    text_guidance_scale: Optional[float] = None
    medium: Optional[Literal["photography", "art"]] = None
    prompt_enhancement: bool = False
    enhance_image: bool = False
    prompt_content_moderation: bool = True
    content_moderation: bool = False
    ip_signal: bool = False
    guidance_methods: Optional[List[GuidanceMethod]] = None
    image_prompt_adapter: Optional[ImagePromptAdapter] = None


class GenerateVectorRequest(BaseModel):
    """Request for /v1/generate/vector endpoint."""
    pipeline: Literal["base", "fast"] = "base"
    model_version: str = "3.2"
    prompt: str
    num_results: int = Field(default=1, ge=1, le=4)
    aspect_ratio: Literal["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9"] = "1:1"
    sync: bool = False
    seed: Optional[int] = None
    negative_prompt: Optional[str] = None
    steps_num: Optional[int] = None
    text_guidance_scale: Optional[float] = None
    prompt_content_moderation: bool = True
    content_moderation: bool = False
    ip_signal: bool = False
    guidance_methods: Optional[List[GuidanceMethod]] = None
    image_prompt_adapter: Optional[ImagePromptAdapter] = None


class ReimagineRequest(BaseModel):
    """Request for /v1/reimagine endpoint."""
    prompt: str
    structure_image_url: Optional[str] = None
    structure_image_file_base64: Optional[str] = None
    structure_ref_influence: float = Field(default=0.75, ge=0.0, le=1.0)
    num_results: int = Field(default=1, ge=1, le=4)
    sync: bool = True
    fast: bool = True
    seed: Optional[int] = None
    enhance_image: bool = False
    prompt_content_moderation: bool = True
    content_moderation: bool = False
    ip_signal: bool = False
    tailored_model_id: Optional[str] = None
    tailored_checkpoint_step: Optional[int] = None
    tailored_model_influence: Optional[float] = None
    include_generation_prefix: bool = True
    steps_num: Optional[int] = None
    image_prompt_adapter: Optional[ImagePromptAdapter] = None


class PromptEnhanceRequest(BaseModel):
    """Request for /v1/prompt/enhance endpoint."""
    prompt: str


# ============================================================================
# Helper Functions
# ============================================================================

async def fetch_image_url_to_base64(image_url: str) -> str:
    """Fetch an image URL and return as base64 data URI."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(image_url)
        resp.raise_for_status()
        content_type = resp.headers.get("content-type", "image/png")
        base64_data = base64.b64encode(resp.content).decode("utf-8")
        return f"data:{content_type};base64,{base64_data}"


async def finalize_guidance_payload(guidance_methods: List[GuidanceMethod]) -> dict:
    """Convert guidance methods to Bria V1 payload format."""
    payload = {}
    for i, g in enumerate(guidance_methods[:2], start=1):
        payload[f"guidance_method_{i}"] = g.method
        payload[f"guidance_method_{i}_scale"] = g.scale
        
        if g.image_base64:
            # Ensure it's a data URI
            if g.image_base64.startswith("data:"):
                payload[f"guidance_method_{i}_image_file"] = g.image_base64
            else:
                payload[f"guidance_method_{i}_image_file"] = f"data:image/png;base64,{g.image_base64}"
        elif g.image_url:
            payload[f"guidance_method_{i}_image_file"] = await fetch_image_url_to_base64(g.image_url)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"guidance_method_{i} requires image_base64 or image_url"
            )
    return payload


async def build_image_prompt_adapter_fields(ipa: Optional[ImagePromptAdapter]) -> dict:
    """Build image prompt adapter fields for Bria V1 payload."""
    if not ipa:
        return {}
    
    payload = {
        "image_prompt_mode": ipa.mode,
        "image_prompt_scale": ipa.scale
    }
    
    if ipa.image_base64:
        if ipa.image_base64.startswith("data:"):
            payload["image_prompt_file"] = ipa.image_base64
        else:
            payload["image_prompt_file"] = f"data:image/png;base64,{ipa.image_base64}"
    elif ipa.image_urls:
        payload["image_prompt_urls"] = ipa.image_urls
    
    return payload


async def start_status_poll(request_id: str):
    """Call status service to start polling (non-blocking)."""
    status_service_url = os.getenv("STATUS_SERVICE_URL", "http://localhost:8000")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{status_service_url}/api/status/start_poll",
                json={"request_id": request_id}
            )
    except Exception as e:
        print(f"Warning: Failed to start status poll: {e}")


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/generate/image")
async def generate_image(request: GenerateImageRequest):
    """
    Generate image using Bria V1 text-to-image pipelines.
    
    Supports base, fast, and hd pipelines with ControlNet guidance and Image Prompt Adapter.
    """
    if not BRIA_API_TOKEN:
        raise HTTPException(status_code=500, detail="BRIA_API_TOKEN not configured")
    
    # Determine endpoint path
    pipeline = request.pipeline.lower()
    if pipeline in ["base", "fast"]:
        model_version = request.model_version or ("3.2" if pipeline == "base" else "2.3")
        endpoint_path = f"/text-to-image/{pipeline}/{model_version}"
    elif pipeline == "hd":
        model_version = request.model_version or "2.2"
        endpoint_path = f"/text-to-image/hd/{model_version}"
    else:
        raise HTTPException(status_code=400, detail="Invalid pipeline")
    
    # Build payload
    payload = {
        "prompt": request.prompt,
        "num_results": request.num_results,
        "aspect_ratio": request.aspect_ratio,
        "sync": request.sync,
    }
    
    # Optional fields
    if request.seed is not None:
        payload["seed"] = request.seed
    if request.negative_prompt:
        payload["negative_prompt"] = request.negative_prompt
    if request.steps_num is not None:
        payload["steps_num"] = request.steps_num
    if request.text_guidance_scale is not None:
        payload["text_guidance_scale"] = request.text_guidance_scale
    if request.medium:
        payload["medium"] = request.medium
    if request.prompt_enhancement:
        payload["prompt_enhancement"] = request.prompt_enhancement
    if request.enhance_image:
        payload["enhance_image"] = request.enhance_image
    if request.prompt_content_moderation is not None:
        payload["prompt_content_moderation"] = request.prompt_content_moderation
    if request.content_moderation is not None:
        payload["content_moderation"] = request.content_moderation
    if request.ip_signal:
        payload["ip_signal"] = request.ip_signal
    
    # Add guidance methods
    if request.guidance_methods:
        guidance_payload = await finalize_guidance_payload(request.guidance_methods)
        payload.update(guidance_payload)
    
    # Add image prompt adapter
    if request.image_prompt_adapter:
        ipa_payload = await build_image_prompt_adapter_fields(request.image_prompt_adapter)
        payload.update(ipa_payload)
    
    # Call Bria V1 API
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(
                f"{BRIA_V1_BASE}{endpoint_path}",
                json=payload,
                headers={
                    "api_token": BRIA_API_TOKEN,
                    "Content-Type": "application/json"
                }
            )
            resp.raise_for_status()
            data = resp.json()
            
            # If async, start status polling
            request_id = data.get("request_id") or data.get("requestId")
            if not request.sync and request_id:
                await start_status_poll(request_id)
            
            return data
        except httpx.HTTPStatusError as e:
            error_detail = e.response.json() if e.response.content else {"error": str(e)}
            raise HTTPException(status_code=e.response.status_code, detail=error_detail)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate/vector")
async def generate_vector(request: GenerateVectorRequest):
    """
    Generate vector graphics using Bria V1 text-to-vector pipelines.
    
    Supports base and fast pipelines with ControlNet guidance and Image Prompt Adapter.
    """
    if not BRIA_API_TOKEN:
        raise HTTPException(status_code=500, detail="BRIA_API_TOKEN not configured")
    
    pipeline = request.pipeline.lower()
    if pipeline not in ["base", "fast"]:
        raise HTTPException(status_code=400, detail="Pipeline must be base or fast")
    
    endpoint_path = f"/text-to-vector/{pipeline}/{request.model_version}"
    
    # Build payload
    payload = {
        "prompt": request.prompt,
        "num_results": request.num_results,
        "aspect_ratio": request.aspect_ratio,
        "sync": request.sync,
    }
    
    # Optional fields
    if request.seed is not None:
        payload["seed"] = request.seed
    if request.negative_prompt:
        payload["negative_prompt"] = request.negative_prompt
    if request.steps_num is not None:
        payload["steps_num"] = request.steps_num
    if request.text_guidance_scale is not None:
        payload["text_guidance_scale"] = request.text_guidance_scale
    if request.prompt_content_moderation is not None:
        payload["prompt_content_moderation"] = request.prompt_content_moderation
    if request.content_moderation is not None:
        payload["content_moderation"] = request.content_moderation
    if request.ip_signal:
        payload["ip_signal"] = request.ip_signal
    
    # Add guidance methods
    if request.guidance_methods:
        guidance_payload = await finalize_guidance_payload(request.guidance_methods)
        payload.update(guidance_payload)
    
    # Add image prompt adapter
    if request.image_prompt_adapter:
        ipa_payload = await build_image_prompt_adapter_fields(request.image_prompt_adapter)
        payload.update(ipa_payload)
    
    # Call Bria V1 API
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(
                f"{BRIA_V1_BASE}{endpoint_path}",
                json=payload,
                headers={
                    "api_token": BRIA_API_TOKEN,
                    "Content-Type": "application/json"
                }
            )
            resp.raise_for_status()
            data = resp.json()
            
            # If async, start status polling
            request_id = data.get("request_id") or data.get("requestId")
            if not request.sync and request_id:
                await start_status_poll(request_id)
            
            return data
        except httpx.HTTPStatusError as e:
            error_detail = e.response.json() if e.response.content else {"error": str(e)}
            raise HTTPException(status_code=e.response.status_code, detail=error_detail)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.post("/reimagine")
async def reimagine(request: ReimagineRequest):
    """
    Reimagine endpoint - structure-preserving image generation.
    
    Uses a reference image to maintain structure while applying new materials, colors, and textures.
    """
    if not BRIA_API_TOKEN:
        raise HTTPException(status_code=500, detail="BRIA_API_TOKEN not configured")
    
    # Build payload
    payload = {
        "prompt": request.prompt,
        "num_results": request.num_results,
        "sync": request.sync,
        "fast": request.fast,
        "structure_ref_influence": request.structure_ref_influence,
    }
    
    # Structure image handling
    if request.structure_image_url:
        payload["structure_image_url"] = request.structure_image_url
    elif request.structure_image_file_base64:
        if request.structure_image_file_base64.startswith("data:"):
            payload["structure_image_file"] = request.structure_image_file_base64
        else:
            payload["structure_image_file"] = f"data:image/png;base64,{request.structure_image_file_base64}"
    else:
        raise HTTPException(status_code=400, detail="structure_image_url or structure_image_file_base64 required")
    
    # Optional fields
    if request.seed is not None:
        payload["seed"] = request.seed
    if request.enhance_image:
        payload["enhance_image"] = request.enhance_image
    if request.prompt_content_moderation is not None:
        payload["prompt_content_moderation"] = request.prompt_content_moderation
    if request.content_moderation is not None:
        payload["content_moderation"] = request.content_moderation
    if request.ip_signal:
        payload["ip_signal"] = request.ip_signal
    if request.tailored_model_id:
        payload["tailored_model_id"] = request.tailored_model_id
    if request.tailored_checkpoint_step is not None:
        payload["tailored_checkpoint_step"] = request.tailored_checkpoint_step
    if request.tailored_model_influence is not None:
        payload["tailored_model_influence"] = request.tailored_model_influence
    if request.include_generation_prefix is not None:
        payload["include_generation_prefix"] = request.include_generation_prefix
    if request.steps_num is not None:
        payload["steps_num"] = request.steps_num
    
    # Add image prompt adapter
    if request.image_prompt_adapter:
        ipa_payload = await build_image_prompt_adapter_fields(request.image_prompt_adapter)
        payload.update(ipa_payload)
    
    # Call Bria V1 API
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(
                f"{BRIA_V1_BASE}/reimagine",
                json=payload,
                headers={
                    "api_token": BRIA_API_TOKEN,
                    "Content-Type": "application/json"
                }
            )
            resp.raise_for_status()
            data = resp.json()
            
            # If async, start status polling
            request_id = data.get("request_id") or data.get("requestId")
            if not request.sync and request_id:
                await start_status_poll(request_id)
            
            return data
        except httpx.HTTPStatusError as e:
            error_detail = e.response.json() if e.response.content else {"error": str(e)}
            raise HTTPException(status_code=e.response.status_code, detail=error_detail)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@router.post("/prompt/enhance")
async def enhance_prompt(request: PromptEnhanceRequest):
    """
    Enhance a simple prompt into a more detailed and vivid description.
    
    Uses Bria's prompt enhancement service powered by Meta Llama 3.
    """
    if not BRIA_API_TOKEN:
        raise HTTPException(status_code=500, detail="BRIA_API_TOKEN not configured")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(
                f"{BRIA_V1_BASE}/prompt_enhancer",
                json={"prompt": request.prompt},
                headers={
                    "api_token": BRIA_API_TOKEN,
                    "Content-Type": "application/json"
                }
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            error_detail = e.response.json() if e.response.content else {"error": str(e)}
            raise HTTPException(status_code=e.response.status_code, detail=error_detail)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
