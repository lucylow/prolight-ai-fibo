# Bria Integration Improvements

This document outlines the improvements made to ProLight AI's Bria/FIBO integration, following Bria's recommended practices and API patterns.

## Overview

The improvements implement a production-grade integration with Bria's ecosystem, focusing on:

1. **Decoupled Structured Prompt Workflow** - Separate prompt generation from image generation
2. **Async Generation with Status Tracking** - Proper async handling with polling
3. **Enhanced Editing Capabilities** - Reimagine API for advanced variations
4. **Better Composition & Camera Mapping** - First-class FIBO JSON handling
5. **TypeScript Client SDK** - Reusable client for frontend integration
6. **Enhanced Python Client** - Improved backend client with better workflows

## 1. Full FIBO Structured Prompt Workflow

### New Edge Function: `structured-prompt.ts`

**Location:** `/edge/bria/structured-prompt.ts`

This implements Bria's recommended decoupled workflow:

```typescript
// Step 1: Generate structured prompt from intent
const promptResult = await fetch('/edge/bria/structured-prompt', {
  method: 'POST',
  body: JSON.stringify({
    prompt: "silver lamp with soft butterfly lighting"
  })
});

// Step 2: Edit/refine the JSON (in UI)
const structuredPrompt = promptResult.structured_prompt;
structuredPrompt.lighting = { /* custom lighting */ };

// Step 3: Pass to image generation
const imageResult = await fetch('/edge/bria/image-generate', {
  method: 'POST',
  body: JSON.stringify({
    structured_prompt: structuredPrompt
  })
});
```

**Benefits:**
- Editable JSON for UI reflection (live JSON panel)
- Better deterministic control
- Auditability
- Separation of concerns

### Python Client Enhancement

The `BriaClient.generate_from_vlm()` method now uses the dedicated `/structured_prompt/generate` endpoint:

```python
# Old approach: Single call to /image/generate
# New approach: Decoupled workflow
vlm_result = await client.generate_structured_prompt(
    prompt=scene_prompt,
    sync=True
)

structured_prompt = vlm_result["structured_prompt"]
structured_prompt["lighting"] = lighting_override

result = await client.generate_image(
    structured_prompt=structured_prompt
)
```

## 2. Async Generation + Status Tracking

### Enhanced Status Polling

**Location:** `/edge/bria/status.ts` (existing, enhanced)

The status endpoint now supports both GET and POST:

```typescript
// GET
const status = await fetch('/edge/bria/status?request_id=abc123');

// POST
const status = await fetch('/edge/bria/status', {
  method: 'POST',
  body: JSON.stringify({ request_id: 'abc123' })
});
```

### TypeScript Client SDK

**Location:** `/src/lib/bria-client.ts`

New `BriaClient` class with automatic polling:

```typescript
import { BriaClient } from '../lib/bria-client';

const client = new BriaClient();

// Generate with automatic polling
const result = await client.generateImage({
  prompt: "silver lamp",
  sync: false
});

// Poll manually
const status = await client.pollStatus(result.request_id, (progress) => {
  console.log('Progress:', progress.status);
});
```

### React Hook for Async Generation

**Location:** `/src/hooks/useBriaAsync.ts`

React hook for managing async jobs:

```tsx
const { generate, status, isLoading, error, cancel } = useBriaAsync({
  onProgress: (status) => console.log('Progress:', status),
  onComplete: (result) => console.log('Done!', result),
});

// Generate
await generate({
  prompt: "silver lamp",
  sync: false
});
```

**Benefits:**
- No server-timeout spikes on heavy jobs
- Real-time progress updates
- Persistent IDs for audit & queue tracking
- Cancellation support

## 3. Reimagine API for Advanced Editing

### New Edge Function: `reimagine.ts`

**Location:** `/edge/bria/reimagine.ts`

Generates stylized variations of existing images with structured prompts:

```typescript
const result = await fetch('/edge/bria/reimagine', {
  method: 'POST',
  body: JSON.stringify({
    asset_id: "bria_asset_id",
    structured_prompt: {
      lighting: { /* custom lighting */ },
      composition: { /* custom composition */ }
    },
    variations: 3
  })
});
```

**Use Cases:**
- Product packshot variations
- Multi-format asset generation
- Style transfer with lighting control
- Automated crop/aspect ratio variants

### Python Client Method

```python
result = await client.reimagine(
    asset_id="bria_asset_id",
    structured_prompt={
        "lighting": { /* custom lighting */ }
    },
    variations=3
)
```

## 4. Better Composition & Camera Mapping

### New Utilities: `fiboComposition.ts`

**Location:** `/src/utils/fiboComposition.ts`

Utilities for working with FIBO JSON structures:

```typescript
import {
  extractCameraFromFibo,
  buildFiboCamera,
  extractCompositionFromFibo,
  mergeLightingIntoFibo,
  diffFiboPrompts,
  applyFiboDiff,
} from '../utils/fiboComposition';

// Extract camera for UI controls
const camera = extractCameraFromFibo(fiboPrompt);
// { shotType, angle, fov, position, rotation, focus }

// Build FIBO camera from UI controls
const fiboCamera = buildFiboCamera({
  shotType: 'close-up',
  angle: 'eye-level',
  fov: 50
});

// Create diff for undo/redo
const diff = diffFiboPrompts(oldPrompt, newPrompt);
const restored = applyFiboDiff(basePrompt, diff);
```

**Features:**
- Auto-populate camera/pose controls from FIBO JSON
- Undo/redo on camera/light via JSON diffs
- UI reflection of structured prompts
- Better deterministic control

## 5. TypeScript Client SDK

### Complete Client Implementation

**Location:** `/src/lib/bria-client.ts`

Full-featured client with:

- **Structured Prompt Generation**
  ```typescript
  const prompt = await client.generateStructuredPrompt({
    prompt: "silver lamp"
  });
  ```

- **Image Generation**
  ```typescript
  const result = await client.generateImage({
    structured_prompt: prompt.structured_prompt
  });
  ```

- **Status Polling**
  ```typescript
  const status = await client.pollStatus(requestId, onProgress);
  ```

- **Reimagine**
  ```typescript
  const variations = await client.reimagine({
    asset_id: "bria_asset_id",
    structured_prompt: { /* ... */ }
  });
  ```

- **Complete Workflow**
  ```typescript
  const { structured_prompt, result } = await client.generateFromPrompt(
    "silver lamp",
    {
      onStructuredPrompt: (prompt) => {
        // Show in UI for editing
      },
      onProgress: (status) => {
        // Show progress
      }
    }
  );
  ```

## 6. Enhanced Python Client

### Improved Methods

**Location:** `/backend/clients/bria_client.py`

Enhanced methods:

1. **`generate_from_vlm()`** - Now uses decoupled workflow
2. **`reimagine()`** - General reimagine (not just tailored models)
3. **`wait_for_completion()`** - Enhanced polling with better error handling
4. **`generate_structured_prompt()`** - Dedicated structured prompt generation

### Example Usage

```python
async with BriaClient(api_token=api_token) as client:
    # Decoupled workflow
    prompt_result = await client.generate_structured_prompt(
        prompt="silver lamp with soft butterfly lighting",
        sync=True
    )
    
    structured_prompt = prompt_result["structured_prompt"]
    structured_prompt["lighting"] = lighting_override
    
    # Generate image
    result = await client.generate_image(
        structured_prompt=structured_prompt,
        sync=False
    )
    
    # Poll for completion
    final = await client.wait_for_completion(
        result["request_id"],
        poll_interval=2.0,
        max_wait=300.0
    )
```

## Integration Checklist

### ✅ Completed

- [x] Dedicated structured prompt generation endpoint
- [x] Enhanced async status tracking
- [x] Reimagine API endpoint
- [x] TypeScript client SDK
- [x] React hook for async generation
- [x] Enhanced Python client methods
- [x] FIBO composition & camera utilities
- [x] Better error handling and retry logic

### 🔄 Recommended Next Steps

- [ ] Add SSE/WebSocket support for real-time status updates
- [ ] Implement request ID tracking in database
- [ ] Add metrics & logging per generation
- [ ] Create UI components for structured prompt editing
- [ ] Add diff viewer for prompt changes
- [ ] Implement undo/redo stack using FIBO diffs

## Example Integration Pattern

### Frontend (React)

```tsx
import { BriaClient } from '../lib/bria-client';
import { useBriaAsync } from '../hooks/useBriaAsync';

function ImageGenerator() {
  const client = new BriaClient();
  const { generate, status, isLoading } = useBriaAsync({
    onProgress: (status) => {
      console.log('Progress:', status.status);
    }
  });

  const handleGenerate = async () => {
    // Step 1: Generate structured prompt
    const promptResult = await client.generateStructuredPrompt({
      prompt: "silver lamp with soft butterfly lighting"
    });

    // Step 2: Show in UI for editing
    setEditablePrompt(promptResult.structured_prompt);

    // Step 3: Generate image
    await generate({
      structured_prompt: promptResult.structured_prompt,
      sync: false
    });
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={isLoading}>
        Generate
      </button>
      {status && <div>Status: {status.status}</div>}
    </div>
  );
}
```

### Backend (Python)

```python
from clients.bria_client import BriaClient

async def generate_with_lighting(scene_prompt: str, lighting_override: dict):
    async with BriaClient(api_token=api_token) as client:
        # Decoupled workflow
        prompt_result = await client.generate_structured_prompt(
            prompt=scene_prompt,
            sync=True
        )
        
        structured_prompt = prompt_result["structured_prompt"]
        structured_prompt["lighting"] = lighting_override
        
        # Generate async
        result = await client.generate_image(
            structured_prompt=structured_prompt,
            sync=False
        )
        
        return {
            "request_id": result["request_id"],
            "status_url": result.get("status_url"),
            "structured_prompt": structured_prompt
        }
```

## Benefits Summary

| Feature | Before | After |
|---------|--------|-------|
| Prompt Generation | Manual JSON crafting | Automatic via API |
| Async Handling | Basic | Full status polling with progress |
| Editing | Basic operations | Reimagine with structured prompts |
| UI Integration | Custom hooks | Reusable SDK + React hooks |
| JSON Handling | Basic | Full composition/camera utilities |
| Workflow | Single-step | Decoupled (prompt → edit → generate) |

## References

- [Bria API Documentation](https://bria.ai/docs)
- [FIBO GitHub Repository](https://github.com/bria-ai/fibo)
- [Bria Blog - Diffusers Integration](https://bria.ai/blog)

