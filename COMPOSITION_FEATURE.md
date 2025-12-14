# Composition Feature Implementation

This document describes the composition analysis feature that has been added to ProLight AI.

## Overview

The composition feature allows users to:
- Analyze images for optimal crop proposals using edge detection or CLIP-based saliency
- Preview camera adjustments in the 3D viewer before applying
- Apply composition changes that update camera settings (FOV, pan, tilt)
- Persist composition suggestions to the database

## Backend Components

### Files Added

1. **`backend/app/schemas_compose.py`**
   - Pydantic models for request/response validation
   - Includes `AnalyzeRequest`, `AnalyzeResponse`, `CropProposal`, `CameraAdjustment`

2. **`backend/app/api/compose.py`**
   - Main API endpoints:
     - `POST /api/compose/analyze` - Analyze image and return crop proposals
     - `POST /api/compose/apply` - Apply selected crop and get camera adjustments
   - Supports two analysis methods:
     - `edge` (default) - Fast Sobel edge detection
     - `clip` - Advanced CLIP + Grad-CAM saliency (requires PyTorch)

3. **`backend/app/clip_saliency.py`**
   - Optional CLIP-based saliency analysis
   - Uses CLIP RN50 model for higher-quality subject detection
   - Automatically falls back to edge method if CLIP not available

4. **`backend/app/models/composition_model.py`**
   - SQLAlchemy model for persisting composition suggestions
   - Stores proposals, selected crops, and camera adjustments

### Database Setup

The `composition_suggestions` table is automatically created when the app starts (via SQLAlchemy's declarative base). No manual migration needed.

If you want to add CLIP support (optional):

```bash
cd backend
pip install torch torchvision ftfy regex tqdm
pip install git+https://github.com/openai/CLIP.git
```

## Frontend Components

### Files Added

1. **`src/stores/useCompositionStore.ts`**
   - Zustand store for composition state
   - Manages image URL, proposals, selected crop, and preview camera override

2. **`src/components/composition/CropPreview.tsx`**
   - Visual component showing crop proposals overlaid on image
   - Displays rule-of-thirds grid
   - Clickable crop boxes

3. **`src/components/composition/CompositionPanel.tsx`**
   - Main UI component for composition workflow
   - Supports image URL input or using current generated image
   - Provides Preview/Accept/Cancel flow

### Files Modified

1. **`src/components/lighting/LightVisualizer.tsx`**
   - Added `CameraController` component
   - Applies temporary camera preview overrides from composition store
   - Restores original camera settings when preview is cancelled

2. **`src/pages/Studio.tsx`**
   - Added "Composition" tab to studio interface
   - Integrates CompositionPanel into the studio workflow

## Usage

### In the UI

1. Navigate to Studio page
2. Click on the "Composition" tab
3. Either:
   - Enter an image URL and click "Analyze", or
   - Click "Use Current Generated Image" to analyze the latest generation
4. Select an analysis method:
   - "Fast (Edge)" - Quick analysis using edge detection
   - "Advanced (CLIP)" - Higher-quality analysis (requires CLIP installation)
5. View crop proposals overlaid on the image
6. Click a proposal to select it
7. Click "Preview" to see camera adjustments in the 3D viewer (temporary)
8. Click "Accept & Save" to apply changes permanently

### API Usage

#### Analyze Image

```bash
POST /api/compose/analyze?method=edge
Content-Type: application/json

{
  "image_url": "https://example.com/image.jpg",
  "aspect_ratios": ["1:1", "4:5", "3:2", "16:9"],
  "target_coverage": 0.6,
  "n_proposals": 3
}
```

Or with file upload:

```bash
POST /api/compose/analyze?method=edge
Content-Type: multipart/form-data

file: <image file>
```

#### Apply Composition

```bash
POST /api/compose/apply
Content-Type: application/json

{
  "crop": {
    "x": 100,
    "y": 100,
    "width": 800,
    "height": 800
  },
  "fibo_prompt": {...},  // optional
  "persist": true,       // optional - save to DB
  "image_url": "..."     // optional - for persistence
}
```

## Algorithm Details

### Edge-based Analysis (Default)

1. Converts image to grayscale
2. Applies Sobel edge detection kernels
3. Computes edge magnitude map
4. Calculates subject centroid from edge map
5. Proposes crops based on rule-of-thirds intersections
6. Scores proposals by edge density and intersection proximity

### CLIP-based Analysis (Advanced)

1. Loads CLIP RN50 model
2. Encodes image through CLIP visual backbone
3. Computes Grad-CAM from image embedding norm
4. Generates saliency heatmap
5. Uses saliency map instead of edge map for centroid calculation
6. Produces higher-quality proposals for complex scenes

## Camera Adjustment Mapping

When a crop is applied, camera settings are adjusted:

- **FOV**: Adjusted to match crop zoom level
  - `new_fov = old_fov * (orig_min / crop_min)`
  
- **Pan (Yaw)**: Horizontal offset mapped to rotation
  - `pan = normalized_x_offset * 40°`
  
- **Tilt (Pitch)**: Vertical offset mapped to rotation
  - `tilt = -normalized_y_offset * 30°`

## Notes

- CLIP analysis is optional and requires PyTorch (~500MB download)
- Edge-based analysis works without additional dependencies
- Composition suggestions are persisted when `persist: true` is set
- Preview mode applies temporary camera changes visible in 3D viewer
- Accepted compositions update the lighting store's camera settings

## Future Enhancements

Possible improvements:
- Text-conditioned saliency (analyze based on subject type)
- Batch processing worker for multiple images
- Composition history and undo/redo
- Custom aspect ratio support
- Manual crop box adjustment
