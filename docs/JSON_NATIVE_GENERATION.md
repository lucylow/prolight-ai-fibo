# JSON-Native Generation Guide

## Overview

This guide explains how to leverage FIBO's JSON-native generation architecture for precise lighting control in the Pro Lighting Simulator. The system uses Vision-Language Models (VLM) to translate natural language prompts into structured JSON, then merges this with precise 3D lighting parameters.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  User Input: Scene Description + 3D Lighting Controls   │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Step 1: VLM Base JSON Generation                       │
│  - Converts scene description to structured JSON        │
│  - Includes subject, environment, camera, style         │
│  - NO lighting section (added separately)               │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Step 2: 3D Position to Direction Mapping               │
│  - Converts 3D light positions (x, y, z)                │
│  - To canonical FIBO direction strings                  │
│  - Supports: front, front-right, right, back-right,     │
│    back, back-left, left, front-left, overhead,         │
│    underneath                                           │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Step 3: Merge Base JSON + Precise Lighting             │
│  - Combines VLM-generated base JSON                     │
│  - With precise 3D-mapped lighting configuration        │
│  - Calculates professional lighting ratios              │
│  - Determines lighting style and mood                   │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Step 4: Generate Image with FIBO                       │
│  - Sends complete JSON prompt to FIBO API               │
│  - Receives professionally lit image                    │
└─────────────────────────────────────────────────────────┘
```

## Key Components

### 1. 3D Position to Direction Mapping

The `lightingDirectionMapper.ts` utility converts 3D coordinates to FIBO direction strings:

```typescript
import { vectorToDirection, positionToDirection } from '@/utils/lightingDirectionMapper';

// From 3D vector
const direction = vectorToDirection(1.0, 0.5, 1.0); // "front-right"

// From position object
const direction = positionToDirection(
  { x: -1.0, y: 1.0, z: -1.0 },
  { x: 0, y: 0, z: 0 } // subject at origin
); // "back-left"
```

**Coordinate System:**
- Subject at origin (0, 0, 0)
- Front is +Z
- Right is +X
- Up is +Y

**Direction Mapping:**
- Azimuth angles mapped to 8 horizontal directions (45° slices)
- Elevation > 60° → "overhead"
- Elevation < -60° → "underneath"

### 2. VLM Base JSON Generation

The `vlmBaseJsonGenerator.ts` utility generates base JSON from scene descriptions:

```typescript
import { generateBaseJsonFromScene } from '@/utils/vlmBaseJsonGenerator';

const baseJson = await generateBaseJsonFromScene(
  "a fluffy owl sitting in the trees at night"
);

// Returns JSON with subject, environment, camera, style
// BUT NO lighting section - that's added from 3D controls
```

**Real Implementation:**
In production, replace the placeholder with your actual VLM API call:

```typescript
import { callVLMForBaseJson } from '@/utils/vlmBaseJsonGenerator';

const baseJson = await callVLMForBaseJson(
  sceneDescription,
  apiKey,
  vlmEndpoint
);
```

### 3. FIBO JSON Builder

The `fiboJsonBuilder.ts` utility builds complete FIBO JSON structures:

```typescript
import { 
  lights3DToFiboLighting,
  mergeBaseJsonWithLighting,
  buildFiboJsonFromSceneAndLights 
} from '@/utils/fiboJsonBuilder';

// Convert 3D lights to FIBO lighting config
const lights: LightSettings3D[] = [
  {
    id: 'key',
    position: { x: 1.0, y: 1.0, z: 1.0 },
    intensity: 0.8,
    colorTemperature: 5600,
    softness: 0.3,
    enabled: true,
  },
  // ... fill and rim lights
];

const lightingConfig = lights3DToFiboLighting(lights);

// Merge with base JSON
const completeJson = mergeBaseJsonWithLighting(baseJson, lightingConfig);

// Or do it all in one step
const completeJson = buildFiboJsonFromSceneAndLights(
  "a fluffy owl sitting in the trees at night",
  lights,
  cameraSettings,
  environment
);
```

### 4. Professional Lighting Analysis

The system automatically calculates:

- **Key-to-Fill Ratio**: Determines lighting style (dramatic, classical, soft, etc.)
- **Shadow Intensity**: Based on fill light contribution
- **Contrast Ratio**: Overall lighting contrast
- **Lighting Style**: Automatic classification (Rembrandt, Butterfly, Loop, etc.)
- **Mood**: Based on color temperature and contrast

```typescript
import { calculateLightingRatios, determineMoodFromLighting } from '@/utils/fiboJsonBuilder';

const analysis = calculateLightingRatios(lightingConfig);
// Returns: { keyFillRatio, lightingStyle, shadowIntensity, contrastRatio }

const mood = determineMoodFromLighting(lightingConfig);
// Returns: "dramatic warm", "intimate warm", "professional cool", etc.
```

## Complete Example

```typescript
import { buildFiboJsonFromSceneAndLights } from '@/utils/fiboJsonBuilder';

// 1. Define 3D lights from your simulator
const lights = [
  {
    id: 'key',
    position: { x: 1.0, y: 1.0, z: 1.0 }, // Front-right, elevated
    intensity: 0.8,
    colorTemperature: 5600, // Daylight
    softness: 0.3, // Hard light
    enabled: true,
  },
  {
    id: 'fill',
    position: { x: -0.7, y: 0.5, z: 0.8 }, // Front-left
    intensity: 0.4,
    colorTemperature: 5600,
    softness: 0.7, // Soft light
    enabled: true,
  },
  {
    id: 'rim',
    position: { x: 0.0, y: 1.2, z: -1.0 }, // Behind, elevated
    intensity: 0.6,
    colorTemperature: 3200, // Warm tungsten
    softness: 0.2,
    enabled: true,
  },
];

// 2. Build complete FIBO JSON
const fiboJson = buildFiboJsonFromSceneAndLights(
  "professional model in black dress",
  lights,
  {
    shotType: "medium shot",
    cameraAngle: "eye-level",
    fov: 85,
    lensType: "portrait 85mm",
    aperture: "f/2.8",
  },
  "minimalist studio with gray backdrop"
);

// 3. Send to FIBO API
const response = await fetch('/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: JSON.stringify(fiboJson),
    steps: 50,
    guidance_scale: 7.5,
  }),
});
```

## Python Implementation

The Python backend includes equivalent utilities:

```python
from backend.utils.fibo_json_builder import (
    build_fibo_json_from_scene_and_lights,
    merge_base_json_with_lighting,
)
from backend.utils.vlm_base_json import generate_base_json_from_scene
from backend.utils.lighting_mapper import lights_to_fibo_lighting

# Define 3D lights
lights = [
    {
        "id": "key",
        "position": {"x": 1.0, "y": 1.0, "z": 1.0},
        "intensity": 0.8,
        "color_temperature": 5600,
        "softness": 0.3,
        "enabled": True,
    },
    # ... fill and rim lights
]

# Build complete FIBO JSON
fibo_json = build_fibo_json_from_scene_and_lights(
    scene_description="professional model in black dress",
    lights=lights,
    camera_settings={
        "shot_type": "medium shot",
        "camera_angle": "eye-level",
        "fov": 85,
    },
    environment="minimalist studio with gray backdrop"
)
```

## Key Advantages

### 1. **Deterministic Control**
Same JSON parameters = same results every time. This is critical for professional workflows.

### 2. **Precise 3D Mapping**
Your 3D simulator controls map directly to FIBO parameters via deterministic direction strings.

### 3. **Professional Lighting Analysis**
Automatic calculation of key-to-fill ratios, shadow intensity, and lighting style classification.

### 4. **Natural Language + Precision**
Use VLM for scene understanding, but maintain precise control over lighting parameters.

### 5. **Reproducibility**
Save and share lighting setups as JSON for exact reproduction.

## Integration with Edge Functions

The Supabase edge function `generate-lighting` uses these utilities internally. You can also call them directly from your frontend:

```typescript
import { buildFiboJsonFromSceneAndLights } from '@/utils/fiboJsonBuilder';

// In your component
const handleGenerate = async () => {
  const lights = lightingStore.lights; // From your Zustand store
  
  const fiboJson = buildFiboJsonFromSceneAndLights(
    sceneDescription,
    lights,
    cameraSettings,
    environment
  );
  
  // Send to your API
  const result = await fetch('/api/supabase/functions/generate-lighting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subjectDescription: sceneDescription,
      lightingSetup: lights,
      // ... other params
    }),
  });
};
```

## Best Practices

1. **Always use the direction mapper** - Don't hardcode direction strings. Convert from 3D positions.

2. **Cache VLM base JSON** - If the scene description hasn't changed, reuse the base JSON.

3. **Validate JSON structure** - Use the validation functions before sending to FIBO API.

4. **Log lighting analysis** - Save key-to-fill ratios and lighting styles for learning and improvement.

5. **Test with known setups** - Use classic lighting patterns (Rembrandt, Butterfly, etc.) to verify accuracy.

## Troubleshooting

### Issue: Directions not matching expected behavior
- Check coordinate system: +Z = front, +X = right, +Y = up
- Verify subject is at origin (0, 0, 0)
- Check elevation calculation for overhead/underneath

### Issue: VLM base JSON missing fields
- Use the fallback structure from `generateBaseJsonFromScene`
- Validate JSON before merging with lighting

### Issue: Lighting ratios seem incorrect
- Ensure all lights are enabled
- Check intensity values are 0-1 range
- Verify key/fill/rim light IDs are correct

## Next Steps

1. Integrate actual VLM API endpoint
2. Add caching for base JSON generation
3. Create preset lighting patterns (Rembrandt, Butterfly, Loop, etc.)
4. Build UI for editing JSON directly
5. Add import/export for lighting setups
