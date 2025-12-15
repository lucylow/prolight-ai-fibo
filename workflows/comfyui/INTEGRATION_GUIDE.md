# ComfyUI Workflows Integration Guide

This guide explains how to integrate the improved ComfyUI workflows into ProLight AI.

## Overview

The ComfyUI workflows provide an alternative backend for image generation that can work alongside or replace the current FIBO API integration. They offer:

- **FIBO Structured JSON Support**: Direct integration with ProLight AI's FIBO JSON format
- **LBM Relighting**: Environment-aware lighting transfer
- **Cinematic Lighting**: Advanced atmosphere and mood control
- **Refine Mode**: Iterative adjustments without breaking composition
- **Hybrid Workflows**: Best of both worlds

## Architecture

```
ProLight AI Frontend
    ↓
Backend API (FastAPI/Python)
    ↓
ComfyUI Service
    ↓
ComfyUI Server (Local or Remote)
    ↓
Generated Images
```

## Backend Integration

### 1. Install Dependencies

Add to `backend/requirements.txt`:

```txt
requests>=2.31.0
websocket-client>=1.6.0
```

### 2. Create ComfyUI Service

Create `backend/app/services/comfyui_service.py`:

```python
from typing import Dict, Any, Optional
from workflows.comfyui.fibo_converter import FIBOToComfyUI
from workflows.comfyui.comfyui_client import ComfyUIClient
from backend.settings import settings


class ComfyUIService:
    """Service for ComfyUI workflow execution"""
    
    def __init__(self):
        comfy_config = settings.comfyui_config()
        if not comfy_config:
            raise RuntimeError("ComfyUI not configured. Set COMFYUI_URL and COMFYUI_API_KEY")
        
        self.client = ComfyUIClient(
            base_url=comfy_config["url"],
            api_key=comfy_config.get("api_key")
        )
        self.converter = FIBOToComfyUI()
    
    async def generate_from_fibo(
        self,
        fibo_json: Dict[str, Any],
        workflow_type: str = "fibo-structured-generation",
        wait_for_completion: bool = True
    ) -> Dict[str, Any]:
        """
        Generate image from FIBO JSON.
        
        Args:
            fibo_json: FIBO JSON structure
            workflow_type: Workflow template name
            wait_for_completion: Wait for job completion
        
        Returns:
            Result with image URLs
        """
        # Convert FIBO JSON to ComfyUI workflow
        workflow = self.converter.convert_fibo_to_workflow(
            fibo_json,
            workflow_template=workflow_type
        )
        
        # Queue workflow
        result = self.client.queue_prompt(
            workflow,
            wait_for_completion=wait_for_completion
        )
        
        return result
    
    async def refine_image(
        self,
        reference_image: str,
        existing_fibo_json: Dict[str, Any],
        refinement_instruction: str,
        locked_fields: Optional[list] = None
    ) -> Dict[str, Any]:
        """
        Refine existing image with FIBO refine mode.
        
        Args:
            reference_image: Path or URL to reference image
            existing_fibo_json: Current FIBO JSON
            refinement_instruction: Instruction (e.g., "make it backlit")
            locked_fields: Fields to preserve
        
        Returns:
            Refined image result
        """
        # Upload reference image if needed
        if reference_image.startswith("http"):
            # Download first, then upload
            # Implementation depends on your needs
            pass
        
        # Create refine workflow
        workflow = self.converter.create_refine_workflow(
            reference_image=reference_image,
            existing_fibo_json=existing_fibo_json,
            refinement_instruction=refinement_instruction,
            locked_fields=locked_fields
        )
        
        # Execute
        return self.client.queue_prompt(workflow, wait_for_completion=True)
    
    async def relight_with_lbm(
        self,
        background_image: str,
        foreground_subject: str,
        lighting_override: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Relight subject using LBM with optional FIBO fine-tuning.
        
        Args:
            background_image: Background with desired lighting
            foreground_subject: Subject to relight
            lighting_override: Optional FIBO lighting for fine-tuning
        
        Returns:
            Relit image result
        """
        workflow = self.converter.create_lbm_workflow(
            background_image=background_image,
            foreground_subject=foreground_subject,
            lighting_override=lighting_override
        )
        
        return self.client.queue_prompt(workflow, wait_for_completion=True)
```

### 3. Add API Endpoint

Add to `backend/routes/generate.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from app.services.comfyui_service import ComfyUIService
from typing import Dict, Any

router = APIRouter()

@router.post("/comfyui/generate")
async def generate_with_comfyui(
    fibo_json: Dict[str, Any],
    workflow_type: str = "fibo-structured-generation",
    service: ComfyUIService = Depends(lambda: ComfyUIService())
):
    """Generate image using ComfyUI workflows"""
    try:
        result = await service.generate_from_fibo(
            fibo_json=fibo_json,
            workflow_type=workflow_type
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/comfyui/refine")
async def refine_with_comfyui(
    reference_image: str,
    existing_fibo_json: Dict[str, Any],
    refinement_instruction: str,
    locked_fields: list = None,
    service: ComfyUIService = Depends(lambda: ComfyUIService())
):
    """Refine image using FIBO refine mode"""
    try:
        result = await service.refine_image(
            reference_image=reference_image,
            existing_fibo_json=existing_fibo_json,
            refinement_instruction=refinement_instruction,
            locked_fields=locked_fields
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### 4. Environment Configuration

Add to `.env`:

```bash
# ComfyUI Configuration
COMFYUI_URL=http://127.0.0.1:8188
COMFYUI_API_KEY=your_api_key_here  # Optional
```

## Frontend Integration

### TypeScript Service

Create `src/services/comfyuiService.ts`:

```typescript
import type { FIBOBaseJson } from '@/utils/fiboJsonBuilder';

export interface ComfyUIResult {
  prompt_id: string;
  status: 'completed' | 'pending' | 'error';
  outputs?: {
    [nodeId: string]: {
      images: Array<{
        filename: string;
        url: string;
        type: string;
      }>;
    };
  };
}

export class ComfyUIService {
  private baseUrl = '/api/comfyui';

  async generateFromFIBO(
    fiboJson: FIBOBaseJson,
    workflowType: 'fibo-structured-generation' | 'lbm-relighting' | 'cinematic' | 'hybrid' = 'fibo-structured-generation'
  ): Promise<ComfyUIResult> {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fibo_json: fiboJson,
        workflow_type: workflowType
      })
    });

    if (!response.ok) {
      throw new Error(`ComfyUI generation failed: ${response.statusText}`);
    }

    return response.json();
  }

  async refineImage(
    referenceImageUrl: string,
    existingFIBOJson: FIBOBaseJson,
    refinementInstruction: string,
    lockedFields?: string[]
  ): Promise<ComfyUIResult> {
    const response = await fetch(`${this.baseUrl}/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference_image: referenceImageUrl,
        existing_fibo_json: existingFIBOJson,
        refinement_instruction: refinementInstruction,
        locked_fields: lockedFields || []
      })
    });

    if (!response.ok) {
      throw new Error(`ComfyUI refine failed: ${response.statusText}`);
    }

    return response.json();
  }

  async relightWithLBM(
    backgroundImageUrl: string,
    foregroundSubjectUrl: string,
    lightingOverride?: FIBOBaseJson['lighting']
  ): Promise<ComfyUIResult> {
    const response = await fetch(`${this.baseUrl}/relight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        background_image: backgroundImageUrl,
        foreground_subject: foregroundSubjectUrl,
        lighting_override: lightingOverride
      })
    });

    if (!response.ok) {
      throw new Error(`ComfyUI relighting failed: ${response.statusText}`);
    }

    return response.json();
  }
}

export const comfyuiService = new ComfyUIService();
```

### React Component Example

```typescript
import { useState } from 'react';
import { comfyuiService } from '@/services/comfyuiService';
import type { FIBOBaseJson } from '@/utils/fiboJsonBuilder';

export function ComfyUIGenerator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [fiboJson, setFiboJson] = useState<FIBOBaseJson>({
    subject: { main_entity: "silver watch" },
    lighting: {
      key_light: {
        intensity: 0.9,
        color_temperature: 5600,
        softness: 0.7,
        enabled: true
      }
    }
  });

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await comfyuiService.generateFromFIBO(
        fiboJson,
        'fibo-structured-generation'
      );
      
      if (result.outputs) {
        // Get first image URL
        const firstNode = Object.values(result.outputs)[0];
        if (firstNode?.images?.[0]) {
          setResult(firstNode.images[0].url);
        }
      }
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating...' : 'Generate with ComfyUI'}
      </button>
      {result && <img src={result} alt="Generated" />}
    </div>
  );
}
```

## Deployment

### Local Development

1. **Start ComfyUI**:
   ```bash
   cd ~/ComfyUI
   python main.py --port 8188
   ```

2. **Configure Backend**:
   ```bash
   export COMFYUI_URL=http://127.0.0.1:8188
   ```

3. **Start Backend**:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

### Production Deployment

#### Option 1: ComfyUI on Same Server

1. Install ComfyUI on production server
2. Run as service (systemd/supervisor)
3. Configure firewall for internal access only
4. Set `COMFYUI_URL=http://localhost:8188` in backend

#### Option 2: ComfyUI on Separate Server

1. Deploy ComfyUI on dedicated server/GPU instance
2. Configure authentication (API key)
3. Set `COMFYUI_URL=http://comfyui-server:8188` in backend
4. Use reverse proxy (nginx) for HTTPS

#### Option 3: ComfyUI Cloud Service

1. Use managed ComfyUI service (if available)
2. Configure API key
3. Set `COMFYUI_URL` to service endpoint

## Workflow Selection Guide

| Use Case | Recommended Workflow | Why |
|----------|---------------------|-----|
| Generate from scratch | `fibo-structured-generation` | Full FIBO JSON control |
| Refine existing image | `fibo-refine-mode` | Preserves composition |
| Environment lighting | `lbm-relighting` | Transfers background lighting |
| Professional product | `hybrid-fibo-lbm` | Best of both worlds |
| Artistic/cinematic | `cinematic-lighting` | Advanced atmosphere control |

## Testing

### Test Workflow Conversion

```python
from workflows.comfyui.fibo_converter import FIBOToComfyUI

converter = FIBOToComfyUI()

fibo_json = {
    "subject": {"main_entity": "test product"},
    "lighting": {"key_light": {"intensity": 0.8, "enabled": True}},
    "camera": {"seed": 12345}
}

workflow = converter.convert_fibo_to_workflow(fibo_json)
print(json.dumps(workflow, indent=2))
```

### Test ComfyUI Connection

```python
from workflows.comfyui.comfyui_client import ComfyUIClient

client = ComfyUIClient(base_url="http://127.0.0.1:8188")
queue = client.get_queue()
print(f"Queue status: {queue}")
```

## Troubleshooting

### ComfyUI Not Responding
- Check if ComfyUI server is running
- Verify URL and port
- Check firewall settings

### Custom Nodes Missing
- Install via ComfyUI Manager
- Check node compatibility
- Verify node paths in workflow JSON

### Workflow Execution Fails
- Check ComfyUI logs
- Verify model files exist
- Check workflow JSON structure
- Ensure all template variables are filled

### Images Not Generated
- Check output node configuration
- Verify image save paths
- Check disk space
- Review ComfyUI console for errors

## Performance Optimization

1. **Use Async Mode**: Don't wait for completion if not needed
2. **Batch Processing**: Queue multiple workflows
3. **GPU Optimization**: Ensure ComfyUI uses GPU
4. **Model Caching**: Keep models loaded in memory
5. **Workflow Caching**: Cache converted workflows

## Security Considerations

1. **API Authentication**: Always use API keys in production
2. **Network Security**: Use HTTPS and restrict access
3. **Input Validation**: Validate FIBO JSON before conversion
4. **Resource Limits**: Set timeouts and memory limits
5. **Custom Nodes**: Review custom node code before installation

## Next Steps

1. Install ComfyUI and required custom nodes
2. Test workflow conversion with sample FIBO JSON
3. Integrate ComfyUI service into backend
4. Add frontend UI for workflow selection
5. Deploy and monitor performance

## Support

For issues or questions:
- Check ComfyUI documentation
- Review workflow JSON structure
- Check backend logs
- Verify ComfyUI server status

