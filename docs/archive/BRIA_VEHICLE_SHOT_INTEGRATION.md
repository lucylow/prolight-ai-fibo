# Bria Vehicle Shot Editing API Integration

Complete integration of Bria's Product Shot Editing APIs for vehicle-specific workflows.

## Overview

This integration adds comprehensive vehicle shot editing capabilities to ProLight AI, including:

- **Vehicle Shot Generation**: Create enriched automotive product shots with realistic environments
- **Segmentation**: Generate masks for vehicle parts (windshield, windows, body, wheels, tires)
- **Reflections**: Add realistic reflections on glass, metal, and glossy surfaces
- **Tire Refinement**: Enhance tire appearance with realistic textures (snow, mud, grass)
- **Visual Effects**: Apply atmospheric effects (dust, snow, fog, light leaks, lens flare)
- **Harmonization**: Match lighting and tone with environmental context (warm/cold, day/night)

## Files Created/Modified

### Backend

1. **`backend/app/services/bria_vehicle_service.py`**
   - Complete service layer for all Bria vehicle shot APIs
   - Handles vehicle shot generation, segmentation, reflections, tire refinement, effects, and harmonization
   - Includes complete workflow orchestration

2. **`backend/app/api/vehicle_shot.py`**
   - FastAPI routes for vehicle shot endpoints
   - Endpoints:
     - `POST /api/vehicle-shot` - Generate vehicle shot
     - `POST /api/vehicle-shot/segment` - Segment vehicle
     - `POST /api/vehicle-shot/apply-effect` - Apply visual effects
     - `POST /api/vehicle-shot/harmonize` - Apply harmonization preset
     - `POST /api/vehicle-shot/complete-enhancement` - Complete workflow

3. **`backend/app/main.py`** (modified)
   - Added vehicle_shot router registration

4. **`backend/app/core/config.py`** (modified)
   - Added `BRIA_API_TOKEN` and `BRIA_API_KEY` configuration options

### Frontend

1. **`src/pages/bria/VehicleShotEditor.tsx`**
   - Complete React component for vehicle shot editing
   - Features:
     - Image upload and preview
     - Scene description input
     - Placement type and generation mode selection
     - Enhancement options (reflections, tire refinement)
     - Visual effects selection
     - Harmonization preset selection
     - Tab-based result viewer
     - Segmentation mask display
     - Download functionality

2. **`src/App.tsx`** (modified)
   - Added route: `/bria/vehicle-shot`

### Edge Functions

1. **`edge/bria/vehicle-shot.ts`**
   - Edge function for vehicle shot operations
   - Supports all vehicle shot operations via edge function proxy

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Bria API Token (for Product Shot Editing APIs)
BRIA_API_TOKEN=your_bria_api_token_here

# Alternative names (also supported)
BRIA_API_KEY=your_bria_api_token_here
FIBO_API_KEY=your_bria_api_token_here  # Falls back to this if others not set
```

### API Endpoints

All endpoints are prefixed with `/api/vehicle-shot`:

- `POST /api/vehicle-shot` - Generate vehicle shot by text
- `POST /api/vehicle-shot/segment` - Segment vehicle into parts
- `POST /api/vehicle-shot/apply-effect` - Apply visual effects
- `POST /api/vehicle-shot/harmonize` - Apply harmonization preset
- `POST /api/vehicle-shot/complete-enhancement` - Complete enhancement workflow

## Usage

### Frontend

Navigate to `/bria/vehicle-shot` to access the Vehicle Shot Editor.

1. Upload or provide URL of vehicle image
2. Enter scene description (50-110 words recommended)
3. Configure options:
   - Placement type (original, automatic, manual_placement, etc.)
   - Generation mode (fast, base, high_control)
   - Enable/disable reflections and tire refinement
   - Select visual effects
   - Choose harmonization preset
4. Click "Enhance Vehicle Shot"
5. View results in tabs (original, reflections, tires, effects, final)
6. Download final result

### Backend API

Example request for complete enhancement:

```python
import requests

response = requests.post(
    "http://localhost:8000/api/vehicle-shot/complete-enhancement",
    json={
        "image_url": "https://example.com/vehicle.jpg",
        "scene_description": "A luxury SUV on a coastal road at sunset with dramatic lighting",
        "include_reflections": True,
        "include_tire_refinement": True,
        "effects": ["dust", "light_leaks"],
        "harmonization_preset": "warm-day"
    }
)

result = response.json()
print(result["data"]["harmonized_url"])
```

## Features

### Vehicle Shot Generation

- **Placement Types**:
  - `original`: Preserve original position
  - `automatic`: Generate with 7 recommended placements
  - `manual_placement`: Choose from predefined positions
  - `custom_coordinates`: Full control over size and position
  - `manual_padding`: Define padding around product
  - `automatic_aspect_ratio`: Auto-center and resize to aspect ratio

- **Generation Modes**:
  - `fast`: Optimal speed and quality balance
  - `base`: Clean, high quality backgrounds
  - `high_control`: Stronger prompt adherence, finer control

### Segmentation

Returns binary masks for:
- Windshield
- Rear window
- Side windows
- Body
- Wheels
- Hubcap
- Tires

### Visual Effects

- `dust`: Dust particles and atmosphere
- `snow`: Snow effects
- `fog`: Fog/mist overlay
- `light_leaks`: Light leak effects
- `lens_flare`: Lens flare effects

### Harmonization Presets

- `warm-day`: Warm daytime lighting
- `cold-day`: Cool daytime lighting
- `warm-night`: Warm nighttime lighting
- `cold-night`: Cool nighttime lighting

## Workflow

The complete enhancement workflow orchestrates:

1. **Generate Vehicle Shot**: Create base shot with scene description
2. **Segment Vehicle**: Identify vehicle parts
3. **Generate Reflections**: Apply reflections to glass/metal surfaces
4. **Refine Tires**: Enhance tire appearance with textures
5. **Apply Effects**: Add atmospheric effects
6. **Harmonize**: Match lighting to scene context

## Error Handling

All endpoints include comprehensive error handling:
- Authentication errors (401)
- Rate limiting (429)
- Validation errors (400)
- Server errors (500)

## Dependencies

### Backend
- `httpx`: Async HTTP client
- `fastapi`: Web framework
- `pydantic`: Data validation

### Frontend
- `react`: UI framework
- `axios`: HTTP client
- `framer-motion`: Animations
- `lucide-react`: Icons
- `sonner`: Toast notifications

## Testing

To test the integration:

1. Start backend: `cd backend && python -m app.main`
2. Start frontend: `npm run dev`
3. Navigate to `http://localhost:5173/bria/vehicle-shot`
4. Upload a vehicle image and configure options
5. Click "Enhance Vehicle Shot"

## API Documentation

Full API documentation available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Notes

- All image URLs returned by Bria APIs are temporary and expire after 1 hour
- For production, implement image storage/download before URLs expire
- The complete enhancement workflow can take 30-60 seconds depending on options selected
- Some operations may fail if vehicle parts are not detected (e.g., no windshield in image)

## Support

For issues or questions:
1. Check backend logs for detailed error messages
2. Verify BRIA_API_TOKEN is correctly configured
3. Ensure image URLs are publicly accessible
4. Check Bria API status and rate limits

