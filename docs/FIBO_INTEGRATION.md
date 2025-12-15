# FIBO Integration Guide

This document describes how ProLight AI integrates with the official [Bria-AI/FIBO](https://github.com/Bria-AI/FIBO) repository.

## Overview

ProLight AI uses FIBO's JSON-native architecture to provide deterministic, professional-grade lighting control. The integration includes:

1. **Git Submodule**: Direct reference to the official FIBO repository
2. **Schema Validation**: Type-safe Pydantic models generated from official schemas
3. **Local/Remote Fallback**: Prefer local FIBO code, fallback to Bria API
4. **UI Mapping**: Convert frontend controls to FIBO JSON format

## Setup

### 1. Add FIBO Submodule

```bash
# Make script executable
chmod +x scripts/add_fibo_submodule.sh

# Add FIBO as submodule
./scripts/add_fibo_submodule.sh
```

This will:
- Clone the FIBO repository into `libs/fibo`
- Initialize the submodule
- Set up for local development

### 2. Generate Pydantic Models

```bash
# Make script executable
chmod +x scripts/gen_pydantic_from_schema.sh

# Generate models from official schema
./scripts/gen_pydantic_from_schema.sh
```

The script will:
- Download the official FIBO JSON schema from GitHub
- Generate type-safe Pydantic models
- Save models to `backend/app/models_fibo.py`

### 3. Verify Integration

```python
from app.models_fibo import FiboPrompt, Camera, Lighting
from app.services.fibo_adapter import FIBOAdapter

# Create a FIBO prompt
prompt = FiboPrompt(
    subject={"main_entity": "luxury watch"},
    camera=Camera(fov=55, aperture=2.8),
    lighting={
        "main_light": {
            "type": "area",
            "direction": "front-left",
            "intensity": 0.8,
            "color_temperature": 5600,
            "softness": 0.3
        }
    }
)

# Generate image
adapter = FIBOAdapter()
result = await adapter.generate(prompt.to_dict())
```

## Architecture

### FIBO Adapter

The `FIBOAdapter` class (`backend/app/services/fibo_adapter.py`) provides a unified interface for FIBO generation:

**Priority Order:**
1. **Local FIBO** (if `libs/fibo` submodule is present and importable)
2. **Remote Bria API** (if `BRIA_API_TOKEN` is configured)
3. **Mock Mode** (for development/testing)

```python
adapter = FIBOAdapter()
# Automatically selects best available option
result = await adapter.generate(fibo_json)
```

### UI Mapping

The `ui_mapping.py` module converts frontend UI state to FIBO JSON:

```python
from app.ui_mapping import ui_to_fibo_json, fibo_json_to_ui

# Frontend -> FIBO
ui_state = {
    "subject_text": "product",
    "camera": {"fov": 55},
    "lights": [{"id": "key", "pos": [0.5, 1.2, 0.8], ...}]
}
fibo_json = ui_to_fibo_json(ui_state)

# FIBO -> Frontend (for loading presets)
ui_state = fibo_json_to_ui(fibo_json)
```

## Testing

### Determinism Tests

Run determinism tests to verify reproducible generation:

```bash
cd backend
pytest tests/test_determinism.py -v
```

These tests verify:
- Same prompt + seed = same result
- Different seeds = different results
- Local vs remote consistency

### Integration Tests

```bash
pytest tests/test_fibo_adapter.py -v
pytest tests/test_lighting_mapper.py -v
```

## Schema Updates

When the FIBO schema changes:

1. Update the submodule:
   ```bash
   git submodule update --remote libs/fibo
   ```

2. Regenerate Pydantic models:
   ```bash
   ./scripts/gen_pydantic_from_schema.sh
   ```

3. Review and commit changes:
   ```bash
   git add backend/app/models_fibo.py
   git commit -m "Update FIBO schema models"
   ```

## Troubleshooting

### Submodule Not Found

If `libs/fibo` doesn't exist:
```bash
./scripts/add_fibo_submodule.sh
```

### Schema Generation Fails

If schema generation fails:
1. Check network connectivity
2. Verify schema URL in the script
3. Check if schema location changed in FIBO repo
4. Use fallback models in `backend/app/models_fibo.py`

### Local FIBO Not Loading

If local FIBO module doesn't load:
1. Verify submodule is initialized: `git submodule status`
2. Check Python path includes `libs/fibo`
3. Verify FIBO repo structure matches expected import paths
4. Adapter will automatically fallback to remote API

## References

- [Bria-AI/FIBO Repository](https://github.com/Bria-AI/FIBO)
- [FIBO Documentation](https://github.com/Bria-AI/FIBO#readme)
- [Bria API Documentation](https://docs.bria.ai/)

