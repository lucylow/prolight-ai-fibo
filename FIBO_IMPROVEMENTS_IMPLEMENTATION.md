# FIBO Text-to-Image Foundation Model Improvements

This document describes the improvements made to the FIBO implementation based on the official BRIA FIBO guide.

## Overview

The FIBO adapter has been enhanced to support three main implementation methods:

1. **Local Inference (Diffusers)** - Full control with `BriaFiboPipeline`
2. **Cloud API (fal.ai)** - Fast, serverless deployment option
3. **Remote Bria API** - Original API integration (maintained)

## Key Improvements

### 1. Enhanced Local Inference with Diffusers

**File**: `backend/app/services/fibo_adapter.py`

- ✅ Added proper `BriaFiboPipeline` support from Hugging Face diffusers
- ✅ Automatic GPU/CPU detection with CPU offload for memory efficiency
- ✅ Lazy loading of pipelines to reduce startup time
- ✅ Proper error handling and fallback mechanisms

**Usage**:
```python
from app.services.fibo_adapter import FIBOAdapter

adapter = FIBOAdapter()
result = await adapter.generate(
    prompt_json=fibo_json,
    steps=50,
    guidance_scale=5.0
)
```

**Requirements**:
```bash
pip install git+https://github.com/huggingface/diffusers torch torchvision google-genai boltons ujson sentencepiece accelerate transformers
export GOOGLE_API_KEY="your_gemini_api_key_here"
```

### 2. fal.ai Cloud API Support

**New Feature**: Added fal.ai as an alternative cloud API option.

- ✅ Direct integration with fal.ai's FIBO endpoint
- ✅ Support for structured JSON prompts
- ✅ Automatic aspect ratio calculation from resolution
- ✅ Proper error handling and timeout management

**Configuration**:
```bash
export FAL_KEY="your_fal_api_key_here"
```

**Priority Order**:
1. Local FIBO (diffusers) - if available
2. fal.ai API - if `FAL_KEY` configured
3. Remote Bria API - if `BRIA_API_TOKEN` configured
4. Mock mode - for development/testing

### 3. Improved VLM Integration

**Enhancements**:
- ✅ Fixed import path: `diffusers.modular_pipelines.ModularPipeline` (was incorrectly `diffusers.modules.ModularPipeline`)
- ✅ Proper lazy loading of VLM pipeline
- ✅ Environment variable support for `GOOGLE_API_KEY`
- ✅ Better error messages with installation instructions

**VLM Models Supported**:
- `briaai/FIBO-gemini-prompt-to-JSON` (recommended)
- `briaai/FIBO-VLM-prompt-to-JSON` (alternative)

### 4. Negative Prompt Helper

**New Function**: `_get_default_negative_prompt()`

Implements the official FIBO negative prompt strategy:
- Automatically generates negative prompts based on `style_medium`
- Prevents unwanted style artifacts (e.g., digital illustration in photographs)
- Improves image quality and consistency

**Example**:
```python
# Automatically applied when style_medium is "photograph"
negative_prompt = "{'style_medium':'digital illustration','artistic_style':'non-realistic'}"
```

### 5. Configuration Updates

**File**: `backend/app/core/config.py`

Added new environment variables:
- `GOOGLE_API_KEY` - Alternative name for `GEMINI_API_KEY`
- `FAL_KEY` / `FAL_API_KEY` - fal.ai API key

**Environment Variables**:
```bash
# For local inference with diffusers
GOOGLE_API_KEY=your_gemini_api_key

# For fal.ai cloud API
FAL_KEY=your_fal_api_key

# For remote Bria API (existing)
BRIA_API_TOKEN=your_bria_api_token
```

## Three FIBO Modes

All three modes are fully implemented:

### 1. Generate Mode
```python
# Short prompt → VLM → Structured JSON → Image
result = await adapter.generate_from_prompt(
    short_prompt="A cozy rooftop garden in Paris at night",
    steps=50,
    guidance_scale=5.0
)
```

### 2. Refine Mode
```python
# Existing JSON + instruction → VLM → Updated JSON → Image
result = await adapter.refine(
    existing_json=previous_json,
    instruction="make the owl brown",
    locked_fields=["camera", "subject"]  # Preserve these fields
)
```

### 3. Inspire Mode
```python
# Image → VLM → Structured JSON → Image (variation)
result = await adapter.inspire(
    image="path/to/image.png",
    instruction="Make it futuristic",
    steps=50
)
```

## Implementation Details

### Local Inference Pipeline

The local inference now properly uses `BriaFiboPipeline`:

```python
from diffusers import BriaFiboPipeline
import torch

torch.set_grad_enabled(False)
pipe = BriaFiboPipeline.from_pretrained(
    "briaai/FIBO",
    torch_dtype=torch.bfloat16,
)
pipe.to("cuda")  # or "cpu" with enable_model_cpu_offload()
```

### fal.ai Integration

The fal.ai integration follows the official pattern:

```python
# Python equivalent of JavaScript fal.subscribe("bria/fibo/generate", ...)
response = await client.post(
    "https://fal.run/bria/fibo/generate",
    headers={"Authorization": f"Key {fal_key}"},
    json={"input": {
        "prompt": json_prompt_string,
        "structured_prompt": fibo_json_dict,
        "seed": 5555,
        "steps_num": 50,
        "aspect_ratio": "1:1",
        "guidance_scale": 5
    }}
)
```

## Migration Guide

### For Existing Users

1. **Update dependencies** (if using local inference):
   ```bash
   pip install git+https://github.com/huggingface/diffusers
   ```

2. **Set environment variables**:
   ```bash
   export GOOGLE_API_KEY="your_key"  # For VLM operations
   export FAL_KEY="your_key"  # Optional: for fal.ai
   ```

3. **No code changes required** - The adapter automatically detects available backends and uses them in priority order.

### For New Users

1. Choose your preferred method:
   - **Local**: Install diffusers and set `GOOGLE_API_KEY`
   - **Cloud (fal.ai)**: Set `FAL_KEY`
   - **Cloud (Bria)**: Set `BRIA_API_TOKEN`

2. The adapter will automatically use the best available option.

## Testing

Test each mode:

```python
# Test Generate mode
result = await adapter.generate_from_prompt("A professional product photo")

# Test Refine mode
result = await adapter.refine(existing_json, "add rim light")

# Test Inspire mode
result = await adapter.inspire("image.png", "make it cinematic")
```

## Performance Considerations

- **Local Inference**: Requires GPU (CUDA) for best performance. CPU offload available for memory-constrained systems.
- **fal.ai**: Fast, serverless, no local resources needed. Best for production deployments.
- **Bria API**: Reliable, official endpoint. Good for enterprise use.

## Troubleshooting

### "diffusers not installed"
```bash
pip install git+https://github.com/huggingface/diffusers torch torchvision
```

### "GOOGLE_API_KEY not set"
```bash
export GOOGLE_API_KEY="your_key"
```

### "CUDA Out of Memory"
The adapter automatically enables CPU offload if available. For manual control:
```python
pipe.enable_model_cpu_offload()
```

## References

- [BRIA FIBO Official Guide](https://huggingface.co/briaai/FIBO)
- [fal.ai Documentation](https://fal.ai)
- [Diffusers Documentation](https://huggingface.co/docs/diffusers)

## Summary

The FIBO adapter now supports:
- ✅ Local inference with `BriaFiboPipeline` (diffusers)
- ✅ fal.ai cloud API integration
- ✅ Improved VLM integration with correct imports
- ✅ Negative prompt helper for better quality
- ✅ All three FIBO modes (Generate, Refine, Inspire)
- ✅ Automatic fallback chain for reliability
- ✅ Better error handling and user feedback

The implementation follows the official BRIA FIBO guide and provides a production-ready foundation for text-to-image generation with FIBO.
