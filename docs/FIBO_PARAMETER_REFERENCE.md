# FIBO API Parameter Reference

Complete parameter reference for Bria's FIBO (Foundation Image Base Object) API based on [docs.bria.ai](https://docs.bria.ai).

## Table of Contents

1. [Overview](#overview)
2. [Camera Parameters](#camera-parameters)
3. [Lighting Parameters](#lighting-parameters)
4. [Color Palette Parameters](#color-palette-parameters)
5. [Subject Parameters](#subject-parameters)
6. [Environment Parameters](#environment-parameters)
7. [Style Parameters](#style-parameters)
8. [Render Parameters](#render-parameters)
9. [Complete JSON Schema](#complete-json-schema)
10. [Parameter Validation](#parameter-validation)

## Overview

FIBO uses a structured JSON prompt format that provides deterministic control over image generation. All parameters are machine-readable and reproducible when combined with a seed value.

**Key Principles:**
- ✅ JSON-native generation (not natural language)
- ✅ Deterministic results (same JSON + seed = identical output)
- ✅ Professional-grade control over all visual aspects
- ✅ Transparent and editable structured prompts

## Camera Parameters

### Camera Object Structure

```typescript
{
  camera: {
    shot_type: string,        // Type of shot (e.g., "close-up", "medium shot", "wide shot")
    camera_angle: string,      // Camera angle description (e.g., "eye-level", "high angle", "low angle")
    fov: number,               // Field of view in degrees (10-180)
    lens_type: string,         // Lens type (e.g., "portrait", "wide-angle", "telephoto", "macro")
    aperture: string,          // Aperture setting (e.g., "f/2.8", "f/11", "f/16")
    focus_distance_m: number,  // Focus distance in meters (0.1+)
    pitch: number,             // Pitch angle in degrees (-90 to 90)
    yaw: number,               // Yaw angle in degrees (-180 to 180)
    roll: number,              // Roll angle in degrees (-180 to 180)
    seed: number               // Random seed for reproducibility
  }
}
```

### Parameter Details

#### `shot_type` (string)
**Description:** Type of photographic shot  
**Valid Values:**
- `"extreme close-up"` - Very tight framing
- `"close-up"` - Tight framing of subject
- `"medium close-up"` - Closer than medium shot
- `"medium shot"` - Standard framing
- `"medium wide shot"` - Wider than medium
- `"wide shot"` - Full scene view
- `"extreme wide shot"` - Very wide view
- `"establishing shot"` - Scene-setting view

#### `camera_angle` (string)
**Description:** Camera angle relative to subject  
**Valid Values:**
- `"eye-level"` - Standard eye-level perspective
- `"high angle"` - Looking down on subject
- `"low angle"` - Looking up at subject
- `"bird's eye view"` - Directly above
- `"worm's eye view"` - Directly below
- `"dutch angle"` - Tilted camera
- `"overhead"` - Top-down view
- `"side angle"` - From the side

#### `fov` (number)
**Description:** Field of view in degrees  
**Range:** `10` to `180`  
**Common Values:**
- `10-30` - Telephoto/portrait
- `35-50` - Standard/normal
- `50-85` - Wide-angle
- `85-120` - Ultra-wide
- `120-180` - Fisheye

#### `lens_type` (string)
**Description:** Type of camera lens  
**Valid Values:**
- `"portrait"` - 85mm-135mm equivalent
- `"standard"` - 50mm equivalent
- `"wide-angle"` - 24mm-35mm equivalent
- `"ultra-wide"` - 14mm-24mm equivalent
- `"telephoto"` - 70mm-200mm+ equivalent
- `"macro"` - Close-up lens
- `"fisheye"` - Extreme wide-angle

#### `aperture` (string)
**Description:** Aperture setting (f-stop)  
**Format:** `"f/X.X"` where X.X is the f-number  
**Common Values:**
- `"f/1.4"` - Very wide (shallow depth of field)
- `"f/2.8"` - Wide (portrait)
- `"f/5.6"` - Medium
- `"f/8"` - Standard
- `"f/11"` - Narrow (product photography)
- `"f/16"` - Very narrow (landscape)

#### `focus_distance_m` (number)
**Description:** Focus distance in meters  
**Range:** `0.1` to `1000+`  
**Common Values:**
- `0.1-0.5` - Macro/close-up
- `0.5-2.0` - Portrait range
- `2.0-10.0` - Medium distance
- `10.0+` - Landscape/infinity

#### `pitch` (number)
**Description:** Camera pitch angle (up/down tilt) in degrees  
**Range:** `-90` to `90`  
- `-90` - Pointing straight down
- `0` - Level/horizontal
- `90` - Pointing straight up

#### `yaw` (number)
**Description:** Camera yaw angle (left/right rotation) in degrees  
**Range:** `-180` to `180`  
- `-180` - Facing opposite direction
- `0` - Facing forward
- `180` - Facing opposite direction (same as -180)

#### `roll` (number)
**Description:** Camera roll angle (tilt) in degrees  
**Range:** `-180` to `180`  
- `0` - Level/horizontal
- `±45` - Moderate tilt
- `±90` - Vertical tilt

#### `seed` (number)
**Description:** Random seed for reproducibility  
**Range:** Any integer  
**Usage:** Same seed + same JSON = identical output

## Lighting Parameters

### Lighting Object Structure

```typescript
{
  lighting: {
    main_light: {
      direction: string,        // Light direction (e.g., "front-right", "top-left")
      intensity: number,         // Light intensity (0.0-2.0)
      color_temperature: number, // Color temperature in Kelvin (1000-10000)
      softness: number,          // Light softness (0.0-1.0)
      distance: number,          // Light distance (0.5-10.0)
      falloff: string            // Light falloff type
    },
    fill_light?: { /* same structure */ },
    rim_light?: { /* same structure */ },
    ambient_light?: {
      intensity: number,
      color_temperature: number
    }
  }
}
```

### Parameter Details

#### `direction` (string)
**Description:** Light direction relative to camera/subject  
**Valid Values (10 canonical directions):**
- `"front"` - Directly in front
- `"front-right"` - 45° camera-right
- `"front-left"` - 45° camera-left
- `"right"` - 90° camera-right
- `"left"` - 90° camera-left
- `"back-right"` - Behind and right
- `"back-left"` - Behind and left
- `"back"` - Directly behind
- `"top"` - Directly above
- `"bottom"` - Directly below

**Alternative Format:**
- `"45 degrees camera-right"` - Descriptive format
- `"top-left, 45 degrees"` - Combined format

#### `intensity` (number)
**Description:** Light intensity/brightness  
**Range:** `0.0` to `2.0`  
**Common Values:**
- `0.0-0.3` - Very dim (fill/ambient)
- `0.3-0.6` - Dim (fill light)
- `0.6-1.0` - Standard (key light)
- `1.0-1.5` - Bright (strong key)
- `1.5-2.0` - Very bright (dramatic)

#### `color_temperature` (number)
**Description:** Color temperature in Kelvin  
**Range:** `1000` to `10000`  
**Common Values:**
- `1000-2000` - Candlelight (very warm)
- `2000-3000` - Tungsten (warm)
- `3000-4000` - Warm white
- `4000-5000` - Neutral white
- `5000-6000` - Daylight (neutral)
- `6000-7000` - Cool white
- `7000-10000` - Sky/overcast (cool)

#### `softness` (number)
**Description:** Light softness (hard to soft)  
**Range:** `0.0` to `1.0`  
- `0.0-0.3` - Hard light (sharp shadows)
- `0.3-0.6` - Medium soft
- `0.6-1.0` - Soft light (diffused shadows)

#### `distance` (number)
**Description:** Light distance from subject  
**Range:** `0.5` to `10.0` meters  
**Effect:** Closer = brighter, farther = dimmer (inverse square law)

#### `falloff` (string)
**Description:** Light falloff type  
**Valid Values:**
- `"inverse_square"` - Physical falloff (default)
- `"linear"` - Linear falloff
- `"constant"` - No falloff

## Color Palette Parameters

### Color Palette Object Structure

```typescript
{
  color_palette: {
    white_balance: string,     // White balance in Kelvin (e.g., "5600K")
    mood: string,               // Color mood (e.g., "warm", "cool", "neutral")
    dominant_colors?: string[],  // Dominant color scheme
    saturation?: number,        // Overall saturation (0.0-2.0)
    contrast?: number,          // Overall contrast (0.0-2.0)
    hue_shift?: number          // Hue shift in degrees (-180 to 180)
  }
}
```

### Parameter Details

#### `white_balance` (string)
**Description:** White balance setting  
**Format:** `"XXXXK"` where XXXX is Kelvin value  
**Common Values:**
- `"2000K"` - Very warm (candlelight)
- `"3200K"` - Warm (tungsten)
- `"4000K"` - Neutral warm
- `"5600K"` - Daylight (standard)
- `"6500K"` - Cool daylight
- `"8000K"` - Very cool (overcast)

#### `mood` (string)
**Description:** Color mood/temperature  
**Valid Values:**
- `"warm"` - Warm tones (reds, oranges, yellows)
- `"cool"` - Cool tones (blues, cyans)
- `"neutral"` - Balanced tones
- `"vibrant"` - High saturation
- `"muted"` - Low saturation
- `"monochrome"` - Grayscale

#### `dominant_colors` (string[])
**Description:** Dominant color scheme  
**Example:** `["warm gold", "deep blue", "neutral gray"]`

#### `saturation` (number)
**Description:** Overall color saturation  
**Range:** `0.0` to `2.0`  
- `0.0` - Grayscale
- `0.5` - Desaturated
- `1.0` - Normal
- `1.5` - Vibrant
- `2.0` - Highly saturated

#### `contrast` (number)
**Description:** Overall image contrast  
**Range:** `0.0` to `2.0`  
- `0.0-0.5` - Low contrast (flat)
- `0.5-1.0` - Normal contrast
- `1.0-1.5` - High contrast
- `1.5-2.0` - Very high contrast

#### `hue_shift` (number)
**Description:** Global hue shift in degrees  
**Range:** `-180` to `180`  
- `-180` - Full shift (opposite colors)
- `0` - No shift
- `180` - Full shift (same as -180)

## Subject Parameters

### Subject Object Structure

```typescript
{
  subject: {
    main_entity: string,        // Main subject description
    attributes: string[],        // Subject attributes
    action: string,             // Subject action/pose
    emotion?: string,            // Emotional state
    mood?: string               // Subject mood
  }
}
```

### Parameter Details

#### `main_entity` (string)
**Description:** Primary subject of the image  
**Example:** `"professional model"`, `"luxury watch"`, `"modern car"`

#### `attributes` (string[])
**Description:** Descriptive attributes of the subject  
**Example:** `["professionally lit", "high quality", "detailed", "sharp focus"]`

#### `action` (string)
**Description:** What the subject is doing  
**Example:** `"posed for professional photograph"`, `"displayed on velvet cushion"`

#### `emotion` (string, optional)
**Description:** Emotional state of subject  
**Valid Values:** `"happy"`, `"serious"`, `"confident"`, `"calm"`, etc.

#### `mood` (string, optional)
**Description:** Overall mood conveyed  
**Valid Values:** `"professional"`, `"elegant"`, `"dramatic"`, `"serene"`, etc.

## Environment Parameters

### Environment Object Structure

```typescript
{
  environment: {
    setting: string,            // Environment description
    time_of_day: string,        // Time of day
    lighting_conditions: string, // Lighting conditions
    atmosphere: string,         // Atmosphere description
    weather?: string,           // Weather conditions
    interior_style?: string     // Interior style (if applicable)
  }
}
```

### Parameter Details

#### `setting` (string)
**Description:** Environment/setting description  
**Example:** `"professional studio"`, `"minimalist studio with dark marble surface"`

#### `time_of_day` (string)
**Description:** Time of day  
**Valid Values:**
- `"controlled lighting"` - Studio lighting
- `"dawn"` - Early morning
- `"daylight"` - Daytime
- `"dusk"` - Evening
- `"night"` - Nighttime

#### `lighting_conditions` (string)
**Description:** Natural lighting conditions  
**Valid Values:**
- `"professional studio"` - Controlled studio
- `"natural daylight"` - Natural light
- `"mixed lighting"` - Combination

#### `atmosphere` (string)
**Description:** Atmospheric quality  
**Valid Values:** `"controlled"`, `"natural"`, `"dramatic"`, `"serene"`, etc.

## Style Parameters

### Style Object Structure

```typescript
{
  style_medium: string,         // Medium type
  artistic_style: string,       // Artistic style
  composition?: {
    rule_of_thirds: boolean,
    depth_layers: number,
    framing: string
  }
}
```

### Parameter Details

#### `style_medium` (string)
**Description:** Type of medium  
**Valid Values:**
- `"photograph"` - Photography
- `"digital art"` - Digital artwork
- `"illustration"` - Illustration
- `"3D render"` - 3D rendering

#### `artistic_style` (string)
**Description:** Artistic style  
**Example:** `"professional studio photography"`, `"cinematic"`, `"minimalist"`

## Render Parameters

### Render Object Structure

```typescript
{
  render: {
    resolution: [number, number], // [width, height]
    color_space: string,          // Color space
    bit_depth: number,            // Bit depth
    samples?: number,              // Render samples
    denoiser?: string              // Denoiser type
  }
}
```

### Parameter Details

#### `resolution` ([number, number])
**Description:** Output resolution [width, height]  
**Common Values:**
- `[1024, 1024]` - Standard square
- `[2048, 2048]` - High-res square
- `[1920, 1080]` - 16:9 HD
- `[4096, 4096]` - Ultra-high res

#### `color_space` (string)
**Description:** Color space  
**Valid Values:**
- `"sRGB"` - Standard RGB
- `"ACEScg"` - ACES CG
- `"linear"` - Linear color space

#### `bit_depth` (number)
**Description:** Bit depth  
**Valid Values:** `8`, `16`, `32`

## Complete JSON Schema

### Full FIBO Prompt Structure

```json
{
  "subject": {
    "main_entity": "string",
    "attributes": ["string"],
    "action": "string",
    "emotion": "string (optional)",
    "mood": "string (optional)"
  },
  "environment": {
    "setting": "string",
    "time_of_day": "string",
    "lighting_conditions": "string",
    "atmosphere": "string",
    "weather": "string (optional)",
    "interior_style": "string (optional)"
  },
  "camera": {
    "shot_type": "string",
    "camera_angle": "string",
    "fov": 85,
    "lens_type": "string",
    "aperture": "string",
    "focus_distance_m": 2.0,
    "pitch": 0,
    "yaw": 0,
    "roll": 0,
    "seed": 12345
  },
  "lighting": {
    "main_light": {
      "direction": "string",
      "intensity": 0.8,
      "color_temperature": 5600,
      "softness": 0.5,
      "distance": 1.5,
      "falloff": "inverse_square"
    },
    "fill_light": { /* optional, same structure */ },
    "rim_light": { /* optional, same structure */ },
    "ambient_light": {
      "intensity": 0.1,
      "color_temperature": 4000
    }
  },
  "color_palette": {
    "white_balance": "5600K",
    "mood": "neutral",
    "dominant_colors": ["string"],
    "saturation": 1.0,
    "contrast": 1.0,
    "hue_shift": 0
  },
  "style_medium": "photograph",
  "artistic_style": "professional studio photography",
  "composition": {
    "rule_of_thirds": true,
    "depth_layers": 3,
    "framing": "centered"
  },
  "render": {
    "resolution": [2048, 2048],
    "color_space": "sRGB",
    "bit_depth": 16,
    "samples": 100,
    "denoiser": "default"
  },
  "enhancements": {
    "hdr": true,
    "professional_grade": true,
    "color_fidelity": true,
    "detail_enhancement": true,
    "noise_reduction": true
  }
}
```

## Parameter Validation

### Validation Rules

1. **Camera FOV:** Must be between 10 and 180 degrees
2. **Camera Angles:** Pitch/yaw/roll must be within specified ranges
3. **Light Intensity:** Must be between 0.0 and 2.0
4. **Color Temperature:** Must be between 1000 and 10000 Kelvin
5. **Softness:** Must be between 0.0 and 1.0
6. **Saturation/Contrast:** Must be between 0.0 and 2.0

### Best Practices

1. **Use canonical directions** for lighting (10 standard directions)
2. **Set seed** for reproducibility
3. **Match color temperature** across lights for consistency
4. **Use appropriate FOV** for shot type
5. **Balance key-to-fill ratio** (typically 2:1 or 3:1)

## References

- [Bria AI Documentation](https://docs.bria.ai)
- [FIBO Model Card](https://huggingface.co/briaai/FIBO)
- [Bria GitHub Repository](https://github.com/bria-ai)

## Support

For parameter-specific questions or issues:
- Check [Bria API Documentation](https://docs.bria.ai)
- Review [FIBO Examples](../integration_examples/)
- Contact Bria Support

