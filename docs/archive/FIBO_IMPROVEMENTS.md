# Bria FIBO Models Integration Improvements

This document summarizes the improvements made to integrate Bria FIBO models according to the official guide from Hugging Face.

## Overview

FIBO (FIBO Image Generation) is a state-of-the-art text-to-image model with a **JSON-native architecture**. Unlike conventional models that use short prompts, FIBO is trained on long, structured JSON captions (up to 1,000+ words), enabling unprecedented control over generated images.

## Key Features Implemented

### 1. Three FIBO Modes

#### Generate Mode

- **Workflow**: Short text prompt → VLM → Structured JSON → Image
- **Implementation**: `FIBOAdapter.generate_from_prompt()`
- **Use Case**: Going from a basic idea to a detailed, controlled image

#### Refine Mode

- **Workflow**: Existing JSON + instruction → VLM → Updated JSON → Image
- **Implementation**: `FIBOAdapter.refine()`
- **Use Case**: Iterative, precise editing without "prompt drift"
- **Features**:
  - Locked fields support (preserve specific attributes)
  - VLM-based JSON refinement
  - Fallback to simple keyword-based refinement

#### Inspire Mode

- **Workflow**: Input image → VLM → Structured JSON → Image (variation)
- **Implementation**: `FIBOAdapter.inspire()`
- **Use Case**: Creating variations of an existing image or merging styles
- **Features**:
  - Image-to-JSON extraction
  - Optional instruction blending
  - Support for URLs, base64, PIL Images, and file paths

### 2. VLM Integration

The adapter now supports multiple VLM backends:

- **Local VLM**: Uses `diffusers` `ModularPipeline` with `briaai/FIBO-gemini-prompt-to-JSON` or `briaai/FIBO-VLM-prompt-to-JSON`
- **Gemini API**: Falls back to Google Gemini API for prompt-to-JSON conversion
- **Simple Fallback**: Basic structured prompt generation when VLM is unavailable

### 3. Local FIBO Model Support

Enhanced local model loading with:

- **Diffusers Integration**: Direct support for `BriaFiboPipeline` from Hugging Face
- **Automatic Detection**: Attempts to load local FIBO models from `libs/fibo` submodule
- **GPU/CPU Support**: Automatic device selection with CPU offload for memory efficiency
- **Error Handling**: Graceful fallback to remote API or mock mode

### 4. Improved JSON Structure

The FIBO JSON structure now matches the official schema:

```json
{
  "subject": {
    "main_entity": "...",
    "attributes": [...],
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
    "main_light": {...},
    "fill_light": {...},
    "rim_light": {...},
    "ambient_light": {...},
    "lighting_style": "..."
  },
  "render": {
    "resolution": [2048, 2048],
    "color_space": "sRGB"
  }
}
```

### 5. Enhanced Lighting Structure

The lighting setup now uses FIBO's native structure:

- `main_light`: Key light configuration
- `fill_light`: Fill light configuration
- `rim_light`: Rim/hair light configuration
- `ambient_light`: Ambient light configuration
- `lighting_style`: Automatically determined from key-to-fill ratio

## Dependencies Added

Updated `requirements.txt` with FIBO dependencies:

```txt
torch>=2.0.0
torchvision>=0.15.0
google-genai>=0.2.0  # For Gemini API integration
boltons>=23.0.0
ujson>=5.9.0
sentencepiece>=0.1.99
accelerate>=0.25.0
transformers>=4.36.0
# diffusers>=0.30.0  # Install from source: git+https://github.com/huggingface/diffusers
```

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# FIBO Configuration
BRIA_API_TOKEN=your_bria_api_key
GEMINI_API_KEY=your_gemini_api_key  # For VLM operations
USE_MOCK_FIBO=false  # Set to true for development/testing
```

### Hugging Face Setup

1. **Access the Model**: Visit [FIBO model page on Hugging Face](https://huggingface.co/briaai/FIBO), log in, and accept the license terms
2. **Authenticate**: Run `hf auth login` in your terminal
3. **Install Dependencies**:
   ```bash
   pip install git+https://github.com/huggingface/diffusers torch torchvision google-genai boltons ujson sentencepiece accelerate transformers
   ```

## Usage Examples

### Generate Mode

```python
from app.services.fibo_adapter import FIBOAdapter

adapter = FIBOAdapter()

# Generate from short prompt
result = await adapter.generate_from_prompt(
    short_prompt="A hyper-detailed, ultra-fluffy owl sitting in the trees at night",
    steps=50,
    guidance_scale=5.0
)

print(result["image_url"])
print(result["json_prompt"])  # The generated FIBO JSON
```

### Refine Mode

```python
# Refine existing JSON
existing_json = {...}  # Previous FIBO JSON

result = await adapter.refine(
    existing_json=existing_json,
    instruction="make the owl brown",
    locked_fields=["camera", "environment"],  # Keep these unchanged
    steps=50
)

print(result["image_url"])
print(result["refinement"]["refined_json"])
```

### Inspire Mode

```python
# Extract JSON from image and generate variation
result = await adapter.inspire(
    image="path/to/image.jpg",  # or URL, base64, PIL Image
    instruction="add a futuristic city in the background",  # Optional
    steps=50
)

print(result["image_url"])
print(result["inspiration"]["extracted_json"])
```

## Architecture

### Priority Order

The adapter tries methods in this order:

1. **Local FIBO** (if available and `use_local_first=True`)
   - Direct model inference using `BriaFiboPipeline`
   - Requires GPU and model weights from Hugging Face
2. **Remote Bria API** (if API key configured)
   - Uses Bria's cloud API
3. **Mock Mode** (if `USE_MOCK_FIBO=true`)
   - Returns placeholder images for development

### VLM Priority

For prompt-to-JSON conversion:

1. **Local VLM** (if available)
   - Uses `ModularPipeline` from diffusers
2. **Gemini API** (if API key configured)
   - Uses Google Gemini API
3. **Simple Fallback**
   - Basic structured prompt generation

## Benefits

1. **Deterministic Control**: Precise control over lighting, composition, color, and camera settings
2. **Disentanglement**: Tweak single attributes without affecting the rest
3. **Professional Quality**: Trained on 1 billion+ fully licensed images
4. **Flexible Deployment**: Supports local, remote, and hybrid setups
5. **Three Workflows**: Generate, Refine, and Inspire modes for different use cases

## Notes

- **Computational Resources**: FIBO is an 8-billion-parameter model. Running locally requires a powerful GPU with sufficient VRAM
- **Commercial Licensing**: For commercial use, obtain a separate license from BRIA AI
- **Structured JSON is Key**: FIBO is designed for structured JSON prompts. Freeform text prompts won't produce optimal results

## Future Enhancements

- [ ] Add support for batch generation with multiple prompts
- [ ] Implement prompt caching for frequently used JSON structures
- [ ] Add support for FIBO's advanced features (materials, post-processing)
- [ ] Create UI components for visual JSON editing
- [ ] Add support for FIBO's video generation capabilities

## References

- [Bria FIBO on Hugging Face](https://huggingface.co/briaai/FIBO)
- [FIBO Documentation](https://huggingface.co/briaai/FIBO)
- [Diffusers Documentation](https://huggingface.co/docs/diffusers)
