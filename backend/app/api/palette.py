# backend/app/api/palette.py
import io
import math
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel
from PIL import Image
import numpy as np

from app.utils.color_utils import kelvin_to_rgb

router = APIRouter()

# -----------------------
# Helpers: palette extract
# -----------------------
def extract_palette_from_image_bytes(data: bytes, num_colors: int = 5) -> List[List[int]]:
    """
    Use Pillow.quantize to extract a small palette from the image (fast, no sklearn dependency).
    Returns list of RGB triples (integers 0..255).
    """
    img = Image.open(io.BytesIO(data)).convert("RGBA")

    # remove fully transparent pixels
    alpha = np.array(img.split()[-1])
    rgb = np.array(img.convert("RGB"))
    mask = alpha.flatten() > 10
    if mask.sum() == 0:
        # fallback to whole image if alpha mask empty
        small = img.convert("RGB").resize((200, 200), Image.LANCZOS)
        pal = small.quantize(colors=num_colors, method=2).getpalette()[: num_colors * 3]
    else:
        # create reduced image using only opaque pixels (faster)
        h, w = img.size[1], img.size[0]
        small = img.convert("RGB").resize((200, 200), Image.LANCZOS)
        pal = small.quantize(colors=num_colors, method=2).getpalette()[: num_colors * 3]

    # palette is flat array [r,g,b, r,g,b, ...]
    palette = []
    for i in range(0, len(pal), 3):
        palette.append([pal[i], pal[i + 1], pal[i + 2]])
    # If quantize returned less than requested, pad or slice
    return palette[:num_colors]


def image_mean_luminance(data: bytes) -> float:
    img = Image.open(io.BytesIO(data)).convert("L")  # convert to luminance
    arr = np.array(img).astype(np.float32) / 255.0
    return float(arr.mean())


# -----------------------
# Helper: kelvin -> rgb (server)
# -----------------------
def estimate_kelvin_from_rgb(target_rgb: List[int]) -> int:
    """
    Simple brute-force search over 2000..8000K step 50 to find nearest kelvin producing RGB close to target.
    """
    target = np.array(target_rgb, dtype=np.float32)
    best_k = 4000
    best_dist = float("inf")
    for k in range(2000, 8001, 50):
        r, g, b = kelvin_to_rgb(k)
        d = np.sum((target - np.array([r, g, b])) ** 2)
        if d < best_dist:
            best_dist = d
            best_k = k
    return int(best_k)


# -----------------------
# Suggestions logic
# -----------------------
def calculate_suggested_light_adjustments(
    lights: List[Dict[str, Any]], image_luminance: Optional[float] = None
):
    """
    Simple heuristic rules:
    - If mean luminance < 0.45, suggest increasing key intensity.
    - If mean luminance > 0.6, suggest reducing key.
    - Try maintain key:fill ratio around 2.2 (example).
    - Return human-readable suggestions and numeric multiplier patches.
    """
    suggestions = []
    patches = {}  # { light_id: { intensity: newvalue, kelvin: newkelvin? } }

    # compute mean intensity across lights as baseline
    intensities = {l["id"]: l.get("intensity", 1.0) for l in lights}
    key = next((l for l in lights if l["id"] == "key"), None)
    fill = next((l for l in lights if l["id"] == "fill"), None)
    rim = next((l for l in lights if l["id"] == "rim"), None)

    # brightness suggestions from image luminance
    if image_luminance is not None:
        target = 0.5  # heuristic target luminance (0..1)
        # compute stops difference: stops = log2(target / current)
        if image_luminance > 0:
            stops = math.log2(target / image_luminance)
            # convert stops to intensity multiplier: factor = 2**stops
            factor = 2 ** stops
            # propose change only if > 5%
            if abs(factor - 1.0) > 0.05:
                verb = "Increase" if factor > 1.0 else "Decrease"
                pct = (factor - 1.0) * 100
                suggestions.append(
                    f"{verb} overall exposure by {pct:+.0f}% (approx. {stops:+.2f} stops) — try updating key intensity."
                )
                # propose applying factor to key (clamped)
                if key:
                    new_int = max(0.05, min(3.0, key["intensity"] * factor))
                    patches[key["id"]] = {
                        **patches.get(key["id"], {}),
                        "intensity": round(new_int, 3),
                    }

    # Key:Fill ratio suggestion
    if key and fill:
        ratio = (key.get("intensity", 1.0) / max(0.0001, fill.get("intensity", 0.001)))
        target_ratio = 2.2
        if ratio < target_ratio * 0.9:
            suggestions.append(
                f"Make key stronger relative to fill (target key:fill ≈ {target_ratio:.1f})."
            )
            new_key_int = min(3.0, key["intensity"] * (target_ratio / max(0.01, ratio)))
            patches[key["id"]] = {
                **patches.get(key["id"], {}),
                "intensity": round(new_key_int, 3),
            }
        elif ratio > target_ratio * 1.1:
            suggestions.append(
                f"Key seems strong vs fill; consider lowering key or raising fill."
            )
            new_fill_int = min(3.0, fill["intensity"] * (ratio / target_ratio) * 0.8)
            patches[fill["id"]] = {
                **patches.get(fill["id"], {}),
                "intensity": round(new_fill_int, 3),
            }

    # Color palette -> kelvin suggestion (if palette provided as warm or cool)
    # (Handled in /apply_palette endpoint where palette exists.)

    # Add minor rim tone suggestion
    if rim and rim.get("intensity", 0) < 0.2:
        suggestions.append(
            "Consider a slightly stronger rim (0.2–0.6) to separate subject from background."
        )
        patches[rim["id"]] = {
            **patches.get(rim["id"], {}),
            "intensity": max(0.2, rim.get("intensity", 0.2)),
        }

    if not suggestions:
        suggestions.append(
            "Lighting looks within expected ranges; minor tweaks may still improve mood."
        )

    return {"suggestions": suggestions, "patches": patches}


# -----------------------
# API Models
# -----------------------
class LightIn(BaseModel):
    id: str
    intensity: float
    kelvin: int
    direction: List[float]
    softness: float
    distance: float


class SuggestionRequest(BaseModel):
    lights: List[LightIn]
    image_luminance: Optional[float] = None
    palette: Optional[List[List[int]]] = None  # list of rgb triples


class ApplyPaletteRequest(BaseModel):
    lights: List[LightIn]
    palette: List[List[int]]  # dominant colors
    mood: Optional[str] = "neutral"


# -----------------------
# Routes
# -----------------------
@router.post("/palette/extract")
async def palette_extract(file: UploadFile = File(...), num_colors: int = 5):
    data = await file.read()
    try:
        palette = extract_palette_from_image_bytes(data, num_colors=num_colors)
        luminance = image_mean_luminance(data)
        return {"palette": palette, "luminance": luminance}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to extract palette: {e}")


@router.post("/suggestions")
async def suggestions(req: SuggestionRequest):
    res = calculate_suggested_light_adjustments(
        [l.dict() for l in req.lights], image_luminance=req.image_luminance
    )
    return res


@router.post("/apply_palette")
async def apply_palette(req: ApplyPaletteRequest):
    """
    Convert palette -> kelvin suggestion and map to lights:
      - choose a base color (palette[0]) -> estimate kelvin -> set key kelvin
      - scale intensities by mood presets multiplier
      - return patches for each light
    """
    # choose base color (dominant)
    base_rgb = req.palette[0] if len(req.palette) > 0 else [255, 255, 255]
    est_kelvin = estimate_kelvin_from_rgb(base_rgb)

    # mood scaling (simple map)
    mood_map = {
        "neutral": 1.0,
        "warm_cozy": 0.95,
        "cinematic_cool": 1.05,
        "golden_hour": 0.9,
        "high_key": 1.2,
        "low_key": 0.75,
    }
    scale = mood_map.get(req.mood, 1.0)

    patches = {}
    for l in req.lights:
        # set key to estimated kelvin, slightly cooler/warm variants for fill/rim
        if l.id == "key":
            patches[l.id] = {
                "kelvin": int(est_kelvin),
                "intensity": round(max(0.05, min(3.0, l.intensity * scale)), 3),
            }
        elif l.id == "fill":
            # desaturate slightly and keep kelvin similar
            patches[l.id] = {
                "kelvin": int(max(2000, min(8000, est_kelvin + 200))),
                "intensity": round(
                    max(0.01, min(3.0, l.intensity * (scale * 0.9))), 3
                ),
            }
        elif l.id == "rim":
            patches[l.id] = {
                "kelvin": int(max(2000, min(8000, est_kelvin - 400))),
                "intensity": round(
                    max(0.01, min(3.0, l.intensity * (scale * 1.0))), 3
                ),
            }
        else:
            patches[l.id] = {
                "kelvin": int(est_kelvin),
                "intensity": round(max(0.01, min(3.0, l.intensity * scale)), 3),
            }

    # Also produce a human-friendly note
    notes = [
        f"Estimated base Kelvin from palette: {est_kelvin}K (dominant color rgb={base_rgb})",
        f"Mood '{req.mood}' applied (intensity scale {scale})",
    ]

    return {"patches": patches, "notes": notes}
