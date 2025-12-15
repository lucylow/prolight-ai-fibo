# ControlNet Integration Guide

## Overview

ControlNet is a powerful neural network structure that provides precise control over image generation by conditioning on structural information from guidance images. This guide covers the comprehensive ControlNet integration in ProLight AI, optimized for professional lighting workflows.

## Table of Contents

1. [ControlNet Methods](#controlnet-methods)
2. [Integration Architecture](#integration-architecture)
3. [Usage Examples](#usage-examples)
4. [Best Practices](#best-practices)
5. [Advanced Techniques](#advanced-techniques)
6. [Troubleshooting](#troubleshooting)

---

## ControlNet Methods

ProLight AI supports four ControlNet methods, each optimized for different use cases:

### 1. **Canny Edge Detection** (`controlnet_canny`)

**Best For:**
- Architectural renders
- Product outlines
- Structural preservation
- Maintaining composition and shape

**Description:**
Preserves structure and outlines by detecting edges in the guidance image. Excellent for maintaining the geometric structure of your scene while allowing creative interpretation of details.

**When to Use:**
- You need to preserve the exact layout and composition
- Working with architectural or product photography
- Combining with other ControlNet methods for maximum control

**Example Scale Values:**
- `0.7-0.8`: Balanced control with creative freedom
- `0.9-1.0`: Strict adherence to edge structure

---

### 2. **Depth Map** (`controlnet_depth`) ⭐ **Recommended for ProLight AI**

**Best For:**
- **Lighting control** (primary use case for ProLight AI)
- 3D spatial accuracy
- Professional lighting workflows
- Depth-aware scene generation

**Description:**
Controls 3D spatial relationships using depth information. This is the **most powerful method for lighting-sensitive scenes** because depth maps inherently contain 3D spatial information that strongly correlates with lighting and shadow placement.

**When to Use:**
- **ProLight AI workflows** - This is the recommended method
- You need precise control over lighting direction and shadow placement
- Working with 3D scenes or spatial relationships
- Combining with lighting parameters for professional results

**Example Scale Values:**
- `0.8-0.9`: Recommended for lighting workflows (balanced control)
- `0.95-1.0`: Maximum spatial accuracy for critical lighting setups

**Depth Map Generation:**
You can generate depth maps using:
- **ComfyUI ControlNet Auxiliary Preprocessors** (local)
- **Bria API** (if available)
- **Online tools** like Hugging Face Spaces
- **3D software** like Blender (export depth pass)

---

### 3. **Recoloring** (`controlnet_recoloring`)

**Best For:**
- Color style transfer
- Maintaining structure with new colors
- Artistic color manipulation

**Description:**
Maintains structure while allowing color changes. Useful when you want to preserve the composition but change the color palette or style.

**When to Use:**
- Style transfer workflows
- Color grading experiments
- Maintaining structure while changing mood through color

**Example Scale Values:**
- `0.7-0.85`: Balanced color control
- `0.9-1.0`: Strict color adherence

---

### 4. **Color Grid** (`controlnet_color_grid`)

**Best For:**
- Color composition control
- Palette placement
- Artistic color distribution

**Description:**
Controls color distribution and placement. Useful for artistic compositions where color placement is critical.

**When to Use:**
- Artistic compositions
- Color palette control
- Design workflows requiring specific color placement

**Example Scale Values:**
- `0.6-0.8`: Creative color control
- `0.9-1.0`: Strict color placement

---

## Integration Architecture

### Backend Implementation

The ControlNet integration is implemented in `backend/app/api/bria_v1.py`:

```python
class GuidanceMethod(BaseModel):
    """ControlNet guidance method configuration."""
    method: Literal["controlnet_canny", "controlnet_depth", "controlnet_recoloring", "controlnet_color_grid"]
    scale: float = Field(default=1.0, ge=0.0, le=1.0)
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
```

**Key Features:**
- Supports up to **2 ControlNet methods simultaneously**
- Automatic image fetching from URLs
- Base64 and URL image support
- Comprehensive validation and error handling
- Detailed error messages for debugging

### Frontend Implementation

The frontend component (`src/pages/bria/V1Generator.tsx`) provides:

- **Multiple ControlNet Support**: Add up to 2 methods simultaneously
- **Visual Previews**: See guidance images before generation
- **Method Information**: Descriptions and best-use cases
- **Scale Control**: Precise control strength adjustment
- **File Upload**: Direct S3 upload with progress tracking
- **URL Support**: Alternative image URL input

---

## Usage Examples

### Example 1: Single Depth ControlNet (ProLight AI Workflow)

**Use Case:** Professional product photography with precise lighting control

```typescript
const requestBody = {
  pipeline: "hd",
  model_version: "2.2",
  prompt: "A luxury watch on a marble surface, professional studio lighting",
  guidance_methods: [
    {
      method: "controlnet_depth",
      scale: 0.9,
      image_url: "https://example.com/depth-map.png"
    }
  ],
  num_results: 1,
  sync: false
};
```

**Why Depth ControlNet?**
- Depth maps contain 3D spatial information
- Perfect for controlling lighting direction and shadow placement
- Works seamlessly with ProLight AI's lighting parameters

### Example 2: Combined Canny + Depth ControlNet

**Use Case:** Maximum structural and lighting control

```typescript
const requestBody = {
  pipeline: "base",
  model_version: "3.2",
  prompt: "Architectural interior with dramatic lighting",
  guidance_methods: [
    {
      method: "controlnet_canny",
      scale: 0.8,
      image_url: "https://example.com/edges.png"
    },
    {
      method: "controlnet_depth",
      scale: 0.85,
      image_url: "https://example.com/depth.png"
    }
  ],
  num_results: 1
};
```

**Benefits:**
- Canny preserves structural outlines
- Depth controls 3D spatial relationships and lighting
- Combined control for maximum precision

### Example 3: Recoloring for Style Transfer

**Use Case:** Maintain structure while changing color palette

```typescript
const requestBody = {
  pipeline: "fast",
  model_version: "2.3",
  prompt: "Modern product shot with warm color palette",
  guidance_methods: [
    {
      method: "controlnet_recoloring",
      scale: 0.75,
      image_url: "https://example.com/reference-colors.png"
    }
  ]
};
```

### Example 4: Using Base64 Images

```typescript
// Convert image to base64
const imageBase64 = await convertImageToBase64(imageFile);

const requestBody = {
  pipeline: "base",
  prompt: "Professional product photography",
  guidance_methods: [
    {
      method: "controlnet_depth",
      scale: 0.9,
      image_base64: imageBase64 // Direct base64 data URI
    }
  ]
};
```

---

## Best Practices

### 1. **Scale Parameter Guidelines**

The `scale` parameter controls how strongly ControlNet influences generation:

| Scale Range | Effect | Use Case |
|------------|--------|----------|
| `0.0-0.5` | Minimal control, high creativity | Artistic interpretation |
| `0.5-0.7` | Moderate control | Balanced workflows |
| `0.7-0.9` | **Strong control (Recommended)** | Professional lighting, product photography |
| `0.9-1.0` | Maximum control | Critical structural requirements |

**ProLight AI Recommendation:** Use `0.8-0.9` for depth ControlNet in lighting workflows.

### 2. **Method Selection Guide**

**For Lighting Control:**
- ✅ **Primary:** `controlnet_depth` (scale: 0.8-0.9)
- ✅ **Secondary:** `controlnet_canny` (scale: 0.7-0.8) for structure

**For Product Photography:**
- ✅ `controlnet_depth` for lighting
- ✅ `controlnet_canny` for product outlines

**For Architectural Renders:**
- ✅ `controlnet_canny` for structure
- ✅ `controlnet_depth` for spatial accuracy

**For Style Transfer:**
- ✅ `controlnet_recoloring` (scale: 0.7-0.85)

### 3. **Image Quality Requirements**

**Guidance Image Best Practices:**
- **Resolution:** Match or exceed target generation resolution
- **Format:** PNG or JPEG (PNG preferred for depth maps)
- **Quality:** High quality, minimal compression artifacts
- **Content:** Clear, well-defined structure matching your use case

**Depth Map Specific:**
- Use grayscale depth maps (black = far, white = near)
- Ensure proper depth range (avoid pure black/white unless intentional)
- Consider depth map preprocessing for better results

### 4. **Combining Multiple ControlNets**

**When to Combine:**
- Need both structural and spatial control
- Working with complex scenes requiring multiple constraints
- Professional workflows requiring maximum precision

**Combination Strategies:**
1. **Canny + Depth:** Structure + Lighting (Recommended for ProLight AI)
2. **Depth + Recoloring:** Spatial + Color control
3. **Canny + Color Grid:** Structure + Color placement

**Scale Balancing:**
- When combining, slightly reduce individual scales
- Example: Use 0.75-0.85 for each method instead of 0.9
- Total influence should not exceed ~1.5 combined

### 5. **Prompt Engineering with ControlNet**

**Effective Prompt Structure:**
```
[Subject Description] + [Environment] + [Lighting Intent] + [Quality Keywords]
```

**Example:**
```
"A luxury watch on a marble surface, professional studio environment, 
dramatic three-point lighting, high-end product photography, 
sharp focus, professional quality, magazine editorial standard"
```

**Key Points:**
- ControlNet handles structure - focus prompts on style, mood, quality
- Don't duplicate structural information already in guidance image
- Emphasize lighting characteristics that complement depth maps

---

## Advanced Techniques

### 1. **Dynamic Scale Adjustment**

Adjust scale based on generation stage or iteration:

```typescript
// Start with lower scale for initial generation
let scale = 0.7;

// Increase for refinement
if (isRefinement) {
  scale = 0.9;
}
```

### 2. **Conditional ControlNet Selection**

Choose method based on scene type:

```typescript
function selectControlNetMethod(sceneType: string) {
  switch (sceneType) {
    case 'product':
      return 'controlnet_depth'; // Best for lighting
    case 'architectural':
      return 'controlnet_canny'; // Best for structure
    case 'portrait':
      return 'controlnet_depth'; // Best for lighting control
    default:
      return 'controlnet_depth';
  }
}
```

### 3. **Preprocessing Workflows**

**Depth Map Generation:**
1. Use 3D software (Blender, Maya) to render depth pass
2. Use ComfyUI ControlNet Auxiliary Preprocessors
3. Use online tools (Hugging Face Spaces)
4. Use AI-based depth estimation (MiDaS, DPT)

**Canny Edge Detection:**
1. Use OpenCV in preprocessing pipeline
2. Use ComfyUI preprocessors
3. Use image editing software with edge detection filters

### 4. **Integration with ProLight AI Lighting Parameters**

ControlNet works seamlessly with ProLight AI's lighting system:

```typescript
// 1. Set up lighting parameters
const lightingSetup = {
  key: { direction: "front-left", intensity: 0.8, ... },
  fill: { direction: "front-right", intensity: 0.4, ... },
  // ...
};

// 2. Generate depth map from 3D scene (if available)
const depthMap = generateDepthMap(lightingSetup);

// 3. Use depth ControlNet with lighting parameters
const request = {
  prompt: buildLightingPrompt(lightingSetup),
  guidance_methods: [{
    method: "controlnet_depth",
    scale: 0.9,
    image_url: depthMap
  }]
};
```

---

## Troubleshooting

### Common Issues

#### 1. **ControlNet Not Having Effect**

**Symptoms:** Generated image doesn't follow guidance image structure

**Solutions:**
- Increase scale (try 0.9-1.0)
- Check guidance image quality and resolution
- Ensure guidance image matches prompt intent
- Verify image format (PNG recommended)

#### 2. **Over-Controlled Results**

**Symptoms:** Image too rigid, lacks creativity

**Solutions:**
- Decrease scale (try 0.6-0.8)
- Simplify guidance image
- Adjust prompt to allow more interpretation

#### 3. **Multiple ControlNet Conflicts**

**Symptoms:** Conflicting results when using 2 methods

**Solutions:**
- Reduce both scales (try 0.7-0.8 each)
- Ensure guidance images are compatible
- Use complementary methods (canny + depth work well together)

#### 4. **Image Upload Failures**

**Symptoms:** Guidance images not uploading or processing

**Solutions:**
- Check file size (recommended < 10MB)
- Verify image format (PNG, JPEG supported)
- Check network connectivity
- Try base64 encoding as alternative

#### 5. **Depth Map Quality Issues**

**Symptoms:** Poor lighting control with depth ControlNet

**Solutions:**
- Ensure depth map has proper range (not pure black/white)
- Use high-quality depth maps from 3D software
- Preprocess depth map for better contrast
- Adjust scale (0.85-0.95 recommended)

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Maximum 2 ControlNet guidance methods allowed` | Too many methods | Remove excess methods |
| `Duplicate ControlNet methods not allowed` | Same method used twice | Use different methods |
| `guidance_method requires image_base64 or image_url` | Missing image | Provide image for each method |
| `Failed to fetch guidance image from URL` | Invalid URL or network issue | Check URL, try base64 instead |

---

## API Reference

### Backend Endpoint

**POST** `/api/v1/generate/image`

**Request Body:**
```typescript
{
  pipeline: "base" | "fast" | "hd",
  model_version?: string,
  prompt: string,
  guidance_methods?: Array<{
    method: "controlnet_canny" | "controlnet_depth" | "controlnet_recoloring" | "controlnet_color_grid",
    scale: number, // 0.0-1.0
    image_base64?: string,
    image_url?: string
  }>,
  // ... other parameters
}
```

**Response:**
```typescript
{
  request_id?: string,
  result?: Array<{
    urls: string[],
    seed?: number
  }>,
  // ... other fields
}
```

### Frontend Component

**Component:** `V1Generator` (`src/pages/bria/V1Generator.tsx`)

**Features:**
- Multiple ControlNet method management
- Image upload with S3 integration
- Visual previews
- Real-time scale adjustment
- Method information and guidance

---

## Resources

### Documentation
- [Bria API Documentation](https://bria.ai/docs)
- [ControlNet Paper](https://arxiv.org/abs/2302.05543)
- [ComfyUI ControlNet Guide](https://github.com/comfyanonymous/ComfyUI)

### Tools
- **ComfyUI ControlNet Auxiliary Preprocessors**: For generating guidance images
- **Hugging Face Spaces**: Online depth map and edge detection tools
- **Blender**: 3D software for depth map generation

### Community
- Bria AI Discord
- ControlNet GitHub Discussions
- ProLight AI Community

---

## Summary

ControlNet integration in ProLight AI provides:

✅ **Four ControlNet Methods**: Canny, Depth, Recoloring, Color Grid  
✅ **Multiple Method Support**: Up to 2 methods simultaneously  
✅ **Professional Lighting Control**: Depth ControlNet optimized for lighting workflows  
✅ **Comprehensive Validation**: Error handling and user guidance  
✅ **Flexible Image Input**: Base64 and URL support  
✅ **Advanced UI**: Visual previews, method information, scale control  

**Recommended Workflow for ProLight AI:**
1. Use `controlnet_depth` with scale `0.8-0.9` for lighting control
2. Optionally combine with `controlnet_canny` for structure
3. Generate high-quality depth maps from 3D scenes
4. Integrate with ProLight AI lighting parameters for maximum control

For questions or issues, refer to the troubleshooting section or contact support.

