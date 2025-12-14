# ComfyUI Workflows Quick Start

Get started with ComfyUI workflows for ProLight AI in 5 minutes.

## Prerequisites

- ComfyUI installed and running
- Python 3.8+
- Required models downloaded (FLUX, LBM)

## Installation

### 1. Install ComfyUI

```bash
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
pip install -r requirements.txt
```

### 2. Install Custom Nodes

Open ComfyUI Manager and install:
- FIBO JSON nodes (if available)
- LBM Relighting nodes
- FluxKontextPro (if available)

Or install manually:
```bash
cd ComfyUI/custom_nodes
# Clone custom node repositories
```

### 3. Download Models

Place models in `ComfyUI/models/checkpoints/`:
- `flux1-dev.safetensors` (or your FLUX model)
- `lbm_relighting_v2.safetensors` (for LBM workflows)

### 4. Copy Workflows

```bash
cp workflows/comfyui/*.json ~/ComfyUI/workflows/
```

## Quick Test

### Python Test

```python
from workflows.comfyui.fibo_converter import FIBOToComfyUI
from workflows.comfyui.comfyui_client import ComfyUIClient

# Initialize
converter = FIBOToComfyUI()
client = ComfyUIClient(base_url="http://127.0.0.1:8188")

# Simple FIBO JSON
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

# Convert and execute
workflow = converter.convert_fibo_to_workflow(fibo_json)
result = client.queue_prompt(workflow, wait_for_completion=True)

print(f"Generated: {result['outputs']}")
```

### Direct ComfyUI Test

1. Start ComfyUI: `python main.py`
2. Open ComfyUI in browser: `http://127.0.0.1:8188`
3. Load workflow: `fibo-structured-generation.json`
4. Fill template variables:
   - `{{fibo_json}}`: Your FIBO JSON as string
5. Queue prompt

## Workflow Types

### 1. FIBO Structured Generation
**Best for:** Creating images from scratch

```python
workflow = converter.convert_fibo_to_workflow(
    fibo_json,
    workflow_template="fibo-structured-generation"
)
```

### 2. FIBO Refine Mode
**Best for:** Adjusting existing images

```python
workflow = converter.create_refine_workflow(
    reference_image="path/to/image.jpg",
    existing_fibo_json=fibo_json,
    refinement_instruction="make it backlit",
    locked_fields=["subject", "composition"]
)
```

### 3. LBM Relighting
**Best for:** Environment-aware lighting

```python
workflow = converter.create_lbm_workflow(
    background_image="path/to/background.jpg",
    foreground_subject="path/to/subject.jpg",
    lighting_override=fibo_lighting_json  # Optional
)
```

### 4. Hybrid FIBO + LBM
**Best for:** Professional product photography

```python
workflow = converter.convert_fibo_to_workflow(
    fibo_json,
    workflow_template="hybrid",
    background_image="path/to/background.jpg",
    foreground_subject="path/to/subject.jpg"
)
```

### 5. Cinematic Lighting
**Best for:** Artistic styles

```python
workflow = converter.convert_fibo_to_workflow(
    fibo_json,
    workflow_template="cinematic",
    style_prompt="Wong Kar-wai lighting",
    atmosphere="moody"
)
```

## Integration with ProLight AI

### Backend

Add to `backend/app/services/comfyui_service.py`:

```python
from workflows.comfyui.fibo_converter import FIBOToComfyUI
from workflows.comfyui.comfyui_client import ComfyUIClient

class ComfyUIService:
    def __init__(self):
        self.client = ComfyUIClient(base_url="http://127.0.0.1:8188")
        self.converter = FIBOToComfyUI()
    
    async def generate(self, fibo_json):
        workflow = self.converter.convert_fibo_to_workflow(fibo_json)
        return self.client.queue_prompt(workflow, wait_for_completion=True)
```

### Frontend

```typescript
import { comfyuiService } from '@/services/comfyuiService';

const result = await comfyuiService.generateFromFIBO(fiboJson);
```

## Common Issues

### "Custom node not found"
- Install via ComfyUI Manager
- Check node compatibility
- Verify node paths

### "Model not found"
- Download required models
- Place in correct directory
- Update model names in workflow

### "Workflow execution failed"
- Check ComfyUI console logs
- Verify all template variables filled
- Check workflow JSON structure

## Next Steps

1. Read [README.md](README.md) for detailed documentation
2. Read [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) for full integration
3. Test with your FIBO JSON structures
4. Integrate into ProLight AI backend

## Resources

- [ComfyUI GitHub](https://github.com/comfyanonymous/ComfyUI)
- [FIBO Documentation](https://huggingface.co/briaai/FIBO)
- [ProLight AI Documentation](../docs/)
