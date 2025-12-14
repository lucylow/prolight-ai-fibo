# FIBO Architecture & Training Improvements

This document describes the improvements made to leverage FIBO's architecture and training characteristics for optimal performance in the ProLight AI application.

## Overview

FIBO (Foundation Image Base Object) is Bria AI's 8-billion-parameter Diffusion Transformer (DiT)-based model with several key architectural features:

- **8B DiT Model**: Uses flow matching for efficient, high-quality image generation
- **SmolLM3-3B Text Encoder**: Optimized for processing long, structured JSON prompts (~1,000 words each)
- **DimFusion Conditioning**: Novel architecture for efficiently handling long captions
- **Wan 2.2 VAE**: Contributes to final clarity and quality
- **JSON-Native & Disentangled Control**: Adjust single parameters without affecting others
- **Training**: ~1 billion fully licensed images with long structured JSON captions

## Key Improvements

### 1. Enhanced JSON Prompt Generation (~1000 Words)

**Problem**: Original prompts were relatively short and didn't leverage FIBO's training on long structured JSON captions.

**Solution**: Enhanced prompt builder creates comprehensive structured JSON prompts matching FIBO's training format:

```typescript
// Before: Simple, short prompts
{
  subject: { main_entity: "product" },
  lighting: { key_light: { intensity: 0.8 } }
}

// After: Comprehensive, detailed prompts (~1000 words)
{
  subject: {
    main_entity: "product",
    attributes: [
      "professionally lit",
      "high quality",
      "detailed",
      "sharp focus",
      "expert lighting",
      "studio quality",
      "magazine editorial standard",
      // ... many more detailed attributes
    ],
    action: "displayed prominently for commercial product photography...",
    mood: "professional and balanced",
    emotion: "professional"
  },
  // ... comprehensive environment, camera, lighting, materials, etc.
}
```

**Benefits**:
- Better alignment with FIBO's training data format
- More precise control over generation
- Higher quality outputs matching training distribution

### 2. DimFusion Conditioning Optimization

**Problem**: Lighting parameters weren't structured to fully leverage DimFusion's ability to handle long captions.

**Solution**: Enhanced lighting structure with detailed parameter descriptions:

```typescript
// Enhanced lighting with comprehensive parameters
{
  key_light: {
    type: "area",
    direction: "front-right",
    intensity: 0.8,
    color_temperature: 5600,
    softness: 0.5,
    distance: 1.5,
    falloff: "inverse_square",
    quality: "medium", // Additional descriptive parameter
    temperature_description: "neutral_daylight" // Helps conditioning
  }
}
```

**Benefits**:
- Better utilization of DimFusion architecture
- More precise lighting control
- Improved conditioning on long structured descriptions

### 3. Comprehensive Subject & Environment Descriptions

**Problem**: Subject and environment descriptions were minimal, not matching FIBO's training format.

**Solution**: Detailed structured descriptions with rich attributes:

```typescript
// Enhanced subject with style-specific attributes
subject: {
  main_entity: "fashion model",
  attributes: [
    "professionally lit",
    "editorial fashion",
    "runway quality",
    "high-end commercial",
    "soft diffused lighting",
    "gradual shadow transitions",
    // ... many more
  ],
  action: "posed confidently for high-fashion editorial photograph...",
  mood: "professional and balanced",
  emotion: "professional"
}

// Enhanced environment with detailed conditions
environment: {
  setting: "professional studio",
  time_of_day: "controlled lighting",
  lighting_conditions: "controlled professional studio environment with precise lighting setup",
  atmosphere: "professional and balanced",
  interior_style: "professional photography studio"
}
```

**Benefits**:
- Matches FIBO's training data structure
- Better subject/environment understanding
- More consistent generation results

### 4. Material & Composition Details

**Problem**: Missing material properties and composition details that FIBO can leverage.

**Solution**: Comprehensive material and composition parameters:

```typescript
materials: {
  surface_reflectivity: 0.15,
  subsurface_scattering: false,
  specular_highlights: 0.64,
  material_response: "photorealistic"
}

composition: {
  rule_of_thirds: true,
  framing: "professional composition",
  depth: "medium",
  negative_space: 0.2,
  leading_lines: ["subject focus", "lighting direction"]
}
```

**Benefits**:
- Full utilization of FIBO's JSON-native capabilities
- Better material rendering
- Improved composition control

### 5. Disentangled Control Implementation

**Problem**: No utilities to ensure proper use of FIBO's disentanglement when modifying lighting.

**Solution**: Created `fiboDisentanglement.ts` with utilities:

```typescript
// Modify only lighting, preserve everything else
const updatedPrompt = createDisentangledLightingUpdate(
  basePrompt,
  newLightingSetup
);

// Verify disentanglement
const verification = verifyDisentanglement(originalPrompt, updatedPrompt);
// Returns: { isDisentangled: true, changedFields: ['lighting'], preservedFields: ['subject', 'environment', 'camera', 'composition'] }
```

**Benefits**:
- Proper use of FIBO's key architectural strength
- Subject and composition remain unchanged when adjusting lighting
- Demonstrates FIBO's unique capabilities

## Implementation Details

### Enhanced FIBO Builder (`fiboEnhancedBuilder.ts`)

Main utility for building comprehensive FIBO prompts:

- `buildEnhancedFIBOPrompt()`: Creates full ~1000 word structured prompts
- `buildEnhancedSubject()`: Detailed subject descriptions with attributes
- `buildEnhancedEnvironment()`: Comprehensive environment descriptions
- `buildEnhancedLighting()`: Detailed lighting structure for DimFusion
- `ensureDisentangledLightingUpdate()`: Ensures proper disentanglement

### Disentanglement Utilities (`fiboDisentanglement.ts`)

Utilities for leveraging FIBO's disentangled control:

- `createDisentangledLightingUpdate()`: Update lighting only
- `verifyDisentanglement()`: Verify that only lighting changed
- `modifyLightingOnly()`: Functional approach to lighting modification
- `modifySingleLightParameter()`: Fine-grained single parameter control

### Updated Functions

**`generate-lighting/index.ts`**:
- Enhanced `buildFiboJson()` to create comprehensive prompts
- Added detailed subject attributes and descriptions
- Enhanced environment descriptions
- Comprehensive material and composition details

**`natural-language-lighting/index.ts`**:
- Enhanced `buildNLImagePrompt()` with detailed technical specifications
- Comprehensive lighting descriptions
- Better alignment with FIBO training format

## Usage Examples

### Building Enhanced Prompts

```typescript
import { buildEnhancedFIBOPrompt } from '@/utils/fiboEnhancedBuilder';

const prompt = buildEnhancedFIBOPrompt({
  subjectDescription: "fashion model",
  environment: "professional studio",
  lightingSetup: {
    key: { direction: "45 degrees right", intensity: 0.8, ... },
    fill: { direction: "30 degrees left", intensity: 0.4, ... }
  },
  cameraSettings: { shotType: "medium shot", ... },
  stylePreset: "fashion",
  enhanceHDR: true
});
```

### Disentangled Lighting Updates

```typescript
import { createDisentangledLightingUpdate } from '@/utils/fiboDisentanglement';

// Only lighting changes, subject/environment/camera preserved
const updated = createDisentangledLightingUpdate(
  originalPrompt,
  {
    key: { ...newKeySettings },
    fill: { ...newFillSettings }
  }
);
```

### Verification

```typescript
import { verifyDisentanglement } from '@/utils/fiboDisentanglement';

const result = verifyDisentanglement(originalPrompt, updatedPrompt);
console.log(result.isDisentangled); // true
console.log(result.preservedFields); // ['subject', 'environment', 'camera', 'composition']
```

## Performance Benefits

1. **Better Quality**: Prompts match FIBO's training distribution, resulting in higher quality outputs
2. **More Control**: Detailed structured prompts provide finer control over generation
3. **Consistency**: Structured format ensures consistent results
4. **Disentanglement**: Proper use of FIBO's unique capability to modify lighting without affecting other aspects
5. **Efficiency**: Better utilization of DimFusion conditioning architecture

## Alignment with FIBO Training

All improvements align with FIBO's training characteristics:

- ✅ Long structured JSON prompts (~1000 words)
- ✅ Detailed attribute descriptions
- ✅ Comprehensive parameter specifications
- ✅ JSON-native format (not natural language)
- ✅ Disentangled control structure
- ✅ Professional photography terminology

## Future Enhancements

Potential areas for further improvement:

1. **Dynamic Prompt Length**: Adjust prompt detail level based on use case
2. **Style-Specific Templates**: Pre-built templates for different photography styles
3. **Learning from Results**: Analyze successful generations to refine prompt structure
4. **Parameter Optimization**: Fine-tune parameter ranges based on FIBO's optimal ranges
5. **Multi-Modal Conditioning**: Leverage additional FIBO capabilities as they become available

## References

- FIBO Architecture: 8B DiT model with flow matching
- Text Encoder: SmolLM3-3B optimized for long JSON prompts
- Conditioning: DimFusion architecture for long captions
- Training: ~1 billion fully licensed images with structured JSON captions
- Documentation: [docs.bria.ai](https://docs.bria.ai)
- GitHub: [github.com/bria-ai](https://github.com/bria-ai)
