# ComfyUI Workflows for ProLight AI

This directory contains optimized ComfyUI workflows for professional lighting simulation and image generation. These workflows integrate FIBO's structured JSON prompting, LBM relighting, and cinematic lighting controls.

## Workflow Overview

### 1. FIBO Structured Generation (`fibo-structured-generation.json`)
**Best for:** Creating images from scratch with precise lighting control

- Uses FIBO's structured JSON prompts (~1000 words)
- Leverages FIBO's 8B DiT architecture with flow matching
- Supports comprehensive lighting, camera, and composition control
- Perfect for ProLight AI's JSON-native generation workflow

**Key Features:**
- Structured JSON input support
- Enhanced prompt building matching FIBO training format
- Lighting parameter extraction
- Professional quality output

### 2. LBM Relighting (`lbm-relighting.json`)
**Best for:** Transferring lighting from environment to subject

- Extracts lighting from background images
- Applies environment-aware lighting to foreground subjects
- Perfect for before/after lighting comparisons
- Supports optional FIBO lighting override for fine-tuning

**Key Features:**
- Automatic lighting extraction from backgrounds
- Natural lighting transfer
- Subject-background compositing
- Color matching

### 3. Cinematic Lighting (`cinematic-lighting.json`)
**Best for:** Artistic and cinematic lighting styles

- Uses FluxKontextPro for advanced atmosphere control
- Supports style prompts (e.g., "Wong Kar-wai lighting")
- Cinematic color grading and film grain
- 2.35:1 aspect ratio support

**Key Features:**
- Atmosphere and mood control
- Style-based lighting prompts
- Professional color grading
- Film grain effects

### 4. FIBO Refine Mode (`fibo-refine-mode.json`)
**Best for:** Iterative lighting adjustments without breaking composition

- Refines existing images with targeted instructions
- Preserves locked fields (composition, subject, etc.)
- Perfect for ProLight AI's iterative workflow
- Supports "make it backlit" style adjustments

**Key Features:**
- Locked field preservation
- Instruction-based refinement
- Composition preservation
- Before/after comparison

### 5. Hybrid FIBO + LBM (`hybrid-fibo-lbm.json`)
**Best for:** Professional product photography with environment awareness

- Combines LBM for environment lighting
- Uses FIBO for precise fine-tuning
- Two-pass workflow for best results
- Recommended for ProLight AI production use

**Key Features:**
- Environment-aware lighting transfer
- Precise FIBO fine-tuning
- Professional enhancements
- Production-ready output

## Installation

### Prerequisites

1. **ComfyUI** installed and running
2. **Custom Nodes** (install via ComfyUI Manager):
   - `FIBO_JSON_Loader` - For FIBO JSON support
   - `LoadLBMModel` - For LBM relighting
   - `FluxKontextPro` - For cinematic lighting
   - `FIBO_Lighting_Extractor` - For lighting parameter extraction
   - `FIBO_Refine_Prompt` - For refine mode
   - `FIBO_Extract_From_Image` - For image-to-JSON extraction
   - `FIBO_Merge_JSON` - For JSON merging
   - `FIBO_Lighting_Override` - For lighting overrides
   - `CinematicColorGrade` - For color grading
   - `FilmGrain` - For film grain effects
   - `ProfessionalEnhance` - For final enhancements

### Setup

1. Copy workflow JSON files to your ComfyUI workflows directory:
   ```bash
   cp workflows/comfyui/*.json ~/ComfyUI/workflows/
   ```

2. Install required custom nodes (see Prerequisites above)

3. Load models:
   - FLUX model: `flux1-dev.safetensors`
   - LBM model: `lbm_relighting_v2.safetensors`

## Usage

### Using with ProLight AI

#### 1. Generate from FIBO JSON

```python
from workflows.comfyui.fibo_converter import FIBOToComfyUI

# Your FIBO JSON from ProLight AI
fibo_json = {
    "subject": {"main_entity": "silver watch"},
    "lighting": {"key_light": {...}},
    # ... rest of FIBO structure
}

# Convert to ComfyUI workflow
converter = FIBOToComfyUI()
workflow = converter.convert_fibo_to_workflow(
    fibo_json,
    workflow_template="fibo-structured-generation.json"
)

# Execute in ComfyUI
result = comfyui_client.queue_prompt(workflow)
```

#### 2. Refine Existing Image

```python
# Refine with instruction
workflow = converter.create_refine_workflow(
    reference_image="path/to/image.jpg",
    existing_fibo_json=fibo_json,
    refinement_instruction="make it backlit",
    locked_fields=["subject", "composition", "camera"]
)
```

#### 3. LBM Relighting

```python
# Transfer lighting from background
workflow = converter.create_lbm_workflow(
    background_image="path/to/background.jpg",
    foreground_subject="path/to/subject.jpg",
    lighting_override=fibo_lighting_json  # Optional FIBO fine-tuning
)
```

### Direct ComfyUI Usage

1. Open ComfyUI
2. Load a workflow JSON file
3. Fill in template variables (marked with `{{variable_name}}`)
4. Queue the prompt

## Template Variables

Workflows use template variables that need to be filled:

- `{{fibo_json}}` - FIBO JSON structure (string or object)
- `{{subject_description}}` - Text description of subject
- `{{lighting_style}}` - Lighting style (e.g., "dramatic", "soft")
- `{{atmosphere}}` - Atmosphere description
- `{{mood}}` - Mood description
- `{{style_prompt}}` - Cinematic style prompt
- `{{seed}}` - Random seed for reproducibility
- `{{background_image}}` - Path to background image
- `{{foreground_subject}}` - Path to foreground subject
- `{{lighting_override}}` - FIBO lighting JSON for overrides
- `{{refinement_instruction}}` - Instruction for refine mode
- `{{locked_fields}}` - Fields to preserve during refinement

## Integration with ProLight AI

### Backend Integration

The workflows can be integrated into ProLight AI's backend:

```python
# backend/app/services/comfyui_service.py
from workflows.comfyui.fibo_converter import FIBOToComfyUI

class ComfyUIService:
    def __init__(self, comfyui_url: str, api_key: str):
        self.client = ComfyUIClient(comfyui_url, api_key)
        self.converter = FIBOToComfyUI()
    
    async def generate_from_fibo(
        self, 
        fibo_json: dict,
        workflow_type: str = "fibo-structured-generation"
    ):
        workflow = self.converter.convert_fibo_to_workflow(
            fibo_json,
            workflow_template=workflow_type
        )
        return await self.client.queue_prompt(workflow)
```

### Frontend Integration

Workflows can be triggered from the ProLight AI UI:

```typescript
// src/services/comfyuiService.ts
export async function generateWithComfyUI(
  fiboJson: FIBOJson,
  workflowType: 'fibo' | 'lbm' | 'cinematic' | 'refine' | 'hybrid'
) {
  const response = await fetch('/api/comfyui/generate', {
    method: 'POST',
    body: JSON.stringify({
      fibo_json: fiboJson,
      workflow_type: workflowType
    })
  });
  return response.json();
}
```

## Custom Nodes Reference

### FIBO Nodes

- **FIBO_JSON_Loader**: Loads and validates FIBO JSON structures
- **FIBO_Prompt_Builder**: Converts FIBO JSON to comprehensive text prompts
- **FIBO_Lighting_Extractor**: Extracts lighting parameters from FIBO JSON
- **FIBO_Refine_Prompt**: Refines FIBO JSON based on instructions
- **FIBO_Extract_From_Image**: Extracts FIBO structure from images
- **FIBO_Merge_JSON**: Merges multiple FIBO JSON structures
- **FIBO_Lighting_Override**: Applies FIBO lighting to images

### LBM Nodes

- **LoadLBMModel**: Loads LBM relighting model
- **LBM_Extract_Lighting**: Extracts lighting from background images
- **LBM_Apply_Relighting**: Applies extracted lighting to subjects

### Cinematic Nodes

- **FluxKontextPro**: Advanced lighting and atmosphere control
- **StylePromptEncode**: Encodes cinematic style prompts
- **CinematicColorGrade**: Applies cinematic color grading
- **FilmGrain**: Adds film grain effects

## Best Practices

1. **Use Hybrid Workflow for Production**: The hybrid FIBO + LBM workflow combines the best of both approaches
2. **Start with LBM, Fine-tune with FIBO**: Use LBM for environment awareness, then FIBO for precise control
3. **Use Refine Mode for Iterations**: Don't regenerate from scratch - use refine mode for targeted adjustments
4. **Lock Important Fields**: When refining, lock subject, composition, and camera to preserve scene
5. **Leverage Structured JSON**: Use FIBO's comprehensive JSON structure for maximum control

## Troubleshooting

### Custom Nodes Not Found
- Install nodes via ComfyUI Manager
- Check node compatibility with your ComfyUI version
- Verify node paths in workflow JSON

### Model Not Found
- Download required models (FLUX, LBM)
- Place in ComfyUI models directory
- Update model names in workflow if different

### Template Variables Not Filled
- Ensure all `{{variable}}` placeholders are replaced
- Use the FIBO converter utility to auto-fill from JSON
- Check variable names match workflow definitions

## Security Notes

⚠️ **Important**: Custom nodes can pose security risks. Only install nodes from trusted sources. Review node code before installation, especially if running ComfyUI on a server.

## Resources

- [ComfyUI Documentation](https://github.com/comfyanonymous/ComfyUI)
- [Awesome ComfyUI Custom Nodes](https://github.com/WASasquatch/was-node-suite-comfyui)
- [FIBO Documentation](https://huggingface.co/briaai/FIBO)
- [LBM Relighting Guide](https://github.com/example/lbm-relighting)

## Contributing

To add new workflows:

1. Create workflow JSON following the existing structure
2. Document template variables
3. Add usage examples
4. Update this README

## License

These workflows are part of ProLight AI and follow the same license.
