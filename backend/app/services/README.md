# Lighting Generation Service

## Quick Start

```python
from app.services.lighting_generation_service import (
    LightingGenerationService,
    SceneRequest,
    NaturalLanguageRequest,
    LightType,
    LightSettings,
    CameraSettings
)

# Initialize service
service = LightingGenerationService()

# Method 1: Generate from structured lighting setup
scene_request = SceneRequest(
    subject_description="Professional portrait of a business executive",
    environment="modern office studio",
    lighting_setup={
        LightType.KEY: LightSettings(
            direction="45 degrees camera-right, elevated 30 degrees",
            intensity=0.8,
            color_temperature=5600,
            softness=0.5,
            distance=1.5,
            enabled=True
        ),
        LightType.FILL: LightSettings(
            direction="30 degrees camera-left",
            intensity=0.4,
            color_temperature=5600,
            softness=0.7,
            distance=2.0,
            enabled=True
        ),
        LightType.RIM: LightSettings(
            direction="behind subject, camera-left",
            intensity=0.6,
            color_temperature=5600,
            softness=0.3,
            distance=1.2,
            enabled=True
        )
    },
    camera_settings=CameraSettings(
        shot_type="medium shot",
        camera_angle="eye-level",
        fov=85,
        lens_type="portrait",
        aperture="f/2.8"
    ),
    style_preset="professional portrait",
    enhance_hdr=True
)

result = await service.generate_from_lighting_setup(
    scene_request,
    user_id="user123"
)

# Method 2: Generate from natural language
nl_request = NaturalLanguageRequest(
    scene_description="Professional headshot of a CEO",
    lighting_description="Soft Rembrandt lighting with warm fill and subtle rim light",
    subject="business executive",
    style_intent="professional corporate",
    environment="studio"
)

result = await service.generate_from_natural_language(
    nl_request,
    user_id="user123"
)

# Method 3: Batch generation
requests = [
    {"lighting_setup": {...}, "subject_description": "...", ...},  # SceneRequest format
    {"scene_description": "...", "lighting_description": "..."}  # NaturalLanguageRequest format
]

results = await service.batch_generate(requests, user_id="user123")

# Health check
health = await service.health_check()
print(health)
```

## Service Components

### LightingGenerationService
Main service class that orchestrates all lighting generation operations.

**Key Methods:**
- `generate_from_lighting_setup()`: Generate from structured lighting configuration
- `generate_from_natural_language()`: Generate from natural language description
- `refine_lighting()`: Refine existing generation with adjustments
- `batch_generate()`: Process multiple requests in parallel
- `health_check()`: Check service and dependency health

### LightingAnalyzer
Analyzes lighting setups and provides professional recommendations.

**Features:**
- Key-to-fill ratio calculation
- Color temperature consistency analysis
- Professional rating (1-10 scale)
- Mood assessment
- Intelligent recommendations

### LLMTranslator
Translates natural language descriptions to structured lighting JSON.

**Note:** Currently a stub implementation. Replace with actual Gemini/OpenAI integration.

### ImageStorageService
Handles image storage and retrieval.

**Note:** Currently a stub implementation. Replace with actual storage (S3, Supabase Storage, etc.).

## Error Handling

The service uses a custom exception hierarchy:

```python
from app.services.lighting_generation_service import (
    LightingGenerationError,
    InvalidLightingSetupError,
    FIBOGenerationError,
    NaturalLanguageTranslationError
)

try:
    result = await service.generate_from_lighting_setup(scene_request)
except InvalidLightingSetupError as e:
    # Handle invalid lighting configuration
    print(f"Invalid setup: {e}")
except FIBOGenerationError as e:
    # Handle FIBO API errors
    print(f"FIBO error: {e}")
except NaturalLanguageTranslationError as e:
    # Handle LLM translation errors
    print(f"Translation error: {e}")
except LightingGenerationError as e:
    # Handle other generation errors
    print(f"Generation error: {e}")
```

## Integration with FastAPI

```python
from fastapi import APIRouter, HTTPException
from app.services.lighting_generation_service import (
    LightingGenerationService,
    SceneRequest,
    GenerationResponse
)

router = APIRouter()
service = LightingGenerationService()

@router.post("/generate", response_model=GenerationResponse)
async def generate_image(request: SceneRequest):
    try:
        return await service.generate_from_lighting_setup(
            request,
            user_id="current_user_id"  # Get from auth
        )
    except InvalidLightingSetupError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FIBOGenerationError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Best Practices

1. **Always validate inputs**: Pydantic models handle this automatically
2. **Use specific exceptions**: Catch specific exceptions for better error handling
3. **Log appropriately**: Service includes comprehensive logging
4. **Handle batch failures**: Check individual result statuses in batch operations
5. **Monitor health**: Regularly check service health in production
6. **Clean up resources**: Call `service.close()` when done

## Performance Tips

- **Batch Processing**: Use `batch_generate()` for multiple requests
- **Async Operations**: All methods are async - use `await` properly
- **Connection Reuse**: Service reuses HTTP connections automatically
- **Error Isolation**: Individual batch failures don't block others

## Next Steps

1. Implement actual `LLMTranslator` with Gemini AI
2. Implement actual `ImageStorageService` with your storage backend
3. Add database persistence for image metadata
4. Add caching for frequently used lighting setups
5. Add rate limiting and authentication
6. Add comprehensive tests

