"""
Pytest configuration and fixtures for ProLight AI tests
"""

import os
import sys
import types
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure the backend `app` package is importable when tests are run from the
# repository root (so that `from app.main import app` works reliably).
PROJECT_ROOT = os.path.dirname(os.path.dirname(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Some tests patch `backend.routes.generate.BriaClient`. When running tests
# directly from the `backend` directory, the top-level `backend` package may
# not be on `sys.path`, which leads to `ModuleNotFoundError`. To make this
# robust, ensure a `backend` package is available and points at this folder.
backend_root = Path(PROJECT_ROOT)
if backend_root.name == "backend":
    try:
        import backend  # type: ignore  # noqa: F401
    except ModuleNotFoundError:
        pkg = types.ModuleType("backend")
        pkg.__path__ = [str(backend_root)]  # type: ignore[attr-defined]
        sys.modules["backend"] = pkg
    
    # Ensure `backend.routes.generate` points to the same modules as
    # `routes.generate`, so that tests patching via the fully-qualified
    # name affect the actual implementation used by the app.
    import importlib

    routes_pkg = importlib.import_module("routes")
    # Expose as submodule and attribute on the `backend` package
    sys.modules.setdefault("backend.routes", routes_pkg)
    backend_pkg = sys.modules.get("backend")
    if backend_pkg is not None:
        setattr(backend_pkg, "routes", routes_pkg)

    generate_mod = importlib.import_module("routes.generate")
    sys.modules.setdefault("backend.routes.generate", generate_mod)

from app.main import app


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def mock_lighting_setup():
    """Mock lighting setup for testing"""
    return {
        "mainLight": {
            "type": "area",
            "direction": "45 degrees camera-right",
            "position": [0.7, 1.2, 0.8],
            "intensity": 1.0,
            "colorTemperature": 5600,
            "softness": 0.4,
            "enabled": True,
            "distance": 1.5
        },
        "fillLight": {
            "type": "point",
            "direction": "30 degrees camera-left",
            "position": [-0.5, 0.6, 1.0],
            "intensity": 0.4,
            "colorTemperature": 5600,
            "softness": 0.7,
            "enabled": True,
            "distance": 2.0
        },
        "rimLight": {
            "type": "directional",
            "direction": "behind and slightly above",
            "position": [0.0, 1.2, -0.8],
            "intensity": 0.6,
            "colorTemperature": 3200,
            "softness": 0.3,
            "enabled": True,
            "distance": 1.0
        }
    }


@pytest.fixture
def mock_generation_request():
    """Mock generation request"""
    return {
        "scene_description": "professional model in studio",
        "lighting_setup": {
            "mainLight": {
                "type": "area",
                "direction": "45 degrees",
                "position": [0.7, 1.2, 0.8],
                "intensity": 1.0,
                "colorTemperature": 5600,
                "softness": 0.4,
                "enabled": True,
                "distance": 1.5
            }
        },
        "use_mock": True
    }


@pytest.fixture
def mock_fibo_prompt():
    """Mock FIBO JSON prompt"""
    return {
        "subject": {
            "mainEntity": "professional model",
            "attributes": "elegant, composed",
            "action": "posing for portrait",
            "emotion": "confident"
        },
        "environment": {
            "setting": "studio with gray backdrop",
            "timeOfDay": "controlled lighting",
            "weather": "indoor",
            "interiorStyle": "contemporary"
        },
        "camera": {
            "shotType": "medium close-up",
            "cameraAngle": "eye-level",
            "fov": 85,
            "lensType": "portrait 85mm",
            "aperture": "f/2.8",
            "focusDistance_m": 2.5,
            "pitch": 0,
            "yaw": 0,
            "roll": 0,
            "seed": 42
        },
        "lighting": {
            "mainLight": {
                "type": "area",
                "direction": "45 degrees",
                "position": [0.7, 1.2, 0.8],
                "intensity": 1.0,
                "colorTemperature": 5600,
                "softness": 0.4,
                "enabled": True,
                "distance": 1.5
            }
        },
        "render": {
            "resolution": [2048, 2048],
            "colorSpace": "ACEScg",
            "bitDepth": 16,
            "aov": ["beauty", "diffuse", "specular"],
            "samples": 40
        }
    }
