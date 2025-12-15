# backend/app/api/compose.py
"""
Composition analysis and adjustment endpoints.
Analyzes images for crop proposals and generates camera adjustments.
"""
import io
import math
from typing import List, Tuple, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from pydantic import BaseModel
from PIL import Image, ImageOps
import numpy as np
import httpx
import logging

from ..schemas_compose import AnalyzeRequest, AnalyzeResponse, CropProposal, CameraAdjustment

logger = logging.getLogger(__name__)
router = APIRouter()

# Try to import CLIP saliency (optional)
try:
    from ..clip_saliency import compute_clip_gradcam
    CLIP_AVAILABLE = True
except ImportError:
    CLIP_AVAILABLE = False
    logger.warning("CLIP saliency not available. Install torch and clip for advanced analysis.")


# ---------- Utilities ----------
def load_image_from_bytes(data: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(data)).convert("RGB")
    return img

async def fetch_image(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.content

def edge_magnitude_array(img: Image.Image) -> np.ndarray:
    """
    Compute a simple edge magnitude map using basic Sobel kernels (grayscale).
    Returns float32 array normalized to [0,1].
    """
    gray = ImageOps.grayscale(img)
    a = np.asarray(gray, dtype=np.float32) / 255.0
    # Sobel kernels
    Kx = np.array([[-1,0,1],[-2,0,2],[-1,0,1]], dtype=np.float32)
    Ky = np.array([[-1,-2,-1],[0,0,0],[1,2,1]], dtype=np.float32)
    # Convolve (simple, small image sizes are fine)
    def convolve(img_arr, K):
        h, w = img_arr.shape
        out = np.zeros_like(img_arr)
        padded = np.pad(img_arr, 1, mode="reflect")
        for y in range(h):
            for x in range(w):
                patch = padded[y:y+3, x:x+3]
                out[y,x] = np.sum(patch * K)
        return out
    gx = convolve(a, Kx)
    gy = convolve(a, Ky)
    mag = np.hypot(gx, gy)
    if mag.max() > 0:
        mag = mag / mag.max()
    return mag

def compute_centroid(edge_map: np.ndarray) -> Tuple[float,float]:
    """
    Compute luminance-weighted centroid of edge map (subject center approx).
    Returns (cx, cy) in pixel coordinates.
    """
    h,w = edge_map.shape
    total = edge_map.sum() + 1e-9
    ys = np.arange(h).reshape(h,1)
    xs = np.arange(w).reshape(1,w)
    cy = (edge_map * ys).sum() / total
    cx = (edge_map * xs).sum() / total
    return float(cx), float(cy)

def rule_of_thirds_points(width:int, height:int):
    """
    Return the four main rule-of-thirds intersections (as fraction coords).
    Standard divides into thirds; intersections are (1/3,1/3), (2/3,1/3), (1/3,2/3), (2/3,2/3)
    """
    pts = {
        "top_left": (width/3.0, height/3.0),
        "top_right": (2*width/3.0, height/3.0),
        "bottom_left": (width/3.0, 2*height/3.0),
        "bottom_right": (2*width/3.0, 2*height/3.0)
    }
    return pts

def best_rule_intersection(cx: float, cy: float, pts: dict) -> Tuple[str, Tuple[float,float], float]:
    best = None
    bdist = float("inf")
    for k,v in pts.items():
        d = math.hypot(cx-v[0], cy-v[1])
        if d < bdist:
            bdist = d
            best = (k,v,d)
    return best  # name, coords, dist

def aspect_to_wh(aspect:str, base_w:int, base_h:int, coverage: float):
    # aspect string like "4:5" -> width/height ratio
    aw, ah = aspect.split(":")
    ratio = float(aw)/float(ah)
    # choose crop size such that the smaller dimension is coverage * min(base_w, base_h)
    mn = min(base_w, base_h)
    crop_min = int(max(32, coverage * mn))
    # compute crop dimensions preserving ratio and centered by min constraint
    if base_w / base_h >= ratio:
        # image is wider than aspect -> height limited
        ch = crop_min
        cw = int(ch * ratio)
    else:
        cw = crop_min
        ch = int(cw / ratio)
    # ensure within bounds
    cw = min(base_w, cw)
    ch = min(base_h, ch)
    return cw, ch

def clamp_box(x:int,y:int,w:int,h:int,maxw:int,maxh:int):
    x = max(0, min(x, maxw-w))
    y = max(0, min(y, maxh-h))
    return x,y,w,h

# ---------- Core algorithm: propose crops ----------
def propose_crops(img: Image.Image, aspect_ratios: List[str], target_coverage: float=0.6, n_proposals:int=3):
    w,h = img.size
    edge = edge_magnitude_array(img)
    cx,cy = compute_centroid(edge)
    thirds = rule_of_thirds_points(w,h)

    # compute best intersection
    name, coords, dist = best_rule_intersection(cx,cy,thirds)
    # score baseline: distance normalized by diagonal
    diag = math.hypot(w,h)
    rot = dist/diag

    proposals = []
    for aspect in aspect_ratios:
        cw,ch = aspect_to_wh(aspect, w, h, target_coverage)
        # create center around subject centroid, then nudge toward rule-of-thirds intersection
        # move fraction toward intersection (0..1) proportional to current distance ratio (more distance -> larger nudge)
        frac = min(0.6, rot * 5.0)  # heuristic
        target_x = cx + frac * (coords[0] - cx)
        target_y = cy + frac * (coords[1] - cy)
        # crop centered at target
        x = int(target_x - cw/2.0)
        y = int(target_y - ch/2.0)
        x,y,cw,ch = clamp_box(x,y,cw,ch,w,h)
        # compute a score: combination of edge density inside crop and closeness to thirds intersection
        crop_edge = edge[y:y+ch, x:x+cw]
        edge_density = float(crop_edge.mean())
        # distance between crop center and ideal intersection
        crop_cx = x + cw/2.0
        crop_cy = y + ch/2.0
        d_inter = math.hypot(crop_cx - coords[0], crop_cy - coords[1]) / diag
        # score higher when edge_density high and d_inter small
        score = float(edge_density * 0.7 + (1.0 - d_inter) * 0.3)
        proposals.append({
            "x": int(x), "y": int(y), "width": int(cw), "height": int(ch),
            "score": round(score,4), "aspect": aspect
        })

    # sort descending
    proposals = sorted(proposals, key=lambda p: p["score"], reverse=True)
    # return top n_proposals
    return {"width": w, "height": h, "centroid": (cx,cy), "proposals": proposals[:n_proposals], "thirds": thirds}


def propose_from_saliency(img: Image.Image, sal_map: np.ndarray, aspect_ratios, target_coverage, n_proposals):
    """Propose crops from a saliency map instead of edge map."""
    w,h = img.size
    # compute centroid from sal_map (same logic as compute_centroid)
    total = sal_map.sum() + 1e-9
    ys = np.arange(sal_map.shape[0]).reshape(sal_map.shape[0],1)
    xs = np.arange(sal_map.shape[1]).reshape(1,sal_map.shape[1])
    cy = (sal_map * ys).sum() / total
    cx = (sal_map * xs).sum() / total
    thirds = rule_of_thirds_points(w,h)
    # compute diag ratio
    diag = math.hypot(w,h)
    dist = min((math.hypot(cx - v[0]*(sal_map.shape[1]/w), cy - v[1]*(sal_map.shape[0]/h)) for v in thirds.values()), default=0)
    rot = dist/diag
    proposals = []
    for aspect in aspect_ratios:
        cw,ch = aspect_to_wh(aspect, w, h, target_coverage)
        frac = min(0.6, rot * 5.0)
        # adjust coords between sal_map size and image size
        scale_x = w / sal_map.shape[1]
        scale_y = h / sal_map.shape[0]
        target_x = cx*scale_x + frac * ((list(thirds.values())[0][0]) - cx*scale_x)
        target_y = cy*scale_y + frac * ((list(thirds.values())[0][1]) - cy*scale_y)
        x = int(target_x - cw/2.0)
        y = int(target_y - ch/2.0)
        x,y,cw,ch = clamp_box(x,y,cw,ch,w,h)
        # compute saliency density inside crop via resampled sal_map
        sx0 = int(x/scale_x); sy0 = int(y/scale_y); sx1 = min(sal_map.shape[1], int((x+cw)/scale_x)); sy1 = min(sal_map.shape[0], int((y+ch)/scale_y))
        crop_sal = sal_map[sy0:sy1, sx0:sx1] if sy1 > sy0 and sx1 > sx0 else np.array([0])
        density = float(crop_sal.mean()) if crop_sal.size>0 else 0.0
        score = float(density * 0.8 + (1.0 - 0.0) * 0.2)  # simple: prioritize high saliency
        proposals.append({"x":x,"y":y,"width":cw,"height":ch,"score":round(score,4),"aspect":aspect})
    proposals = sorted(proposals, key=lambda p: p["score"], reverse=True)
    return {"width": w, "height": h, "centroid": (cx* (w/sal_map.shape[1]), cy*(h/sal_map.shape[0])), "proposals": proposals[:n_proposals], "thirds": thirds}

# ---------- FIBO camera adjustment helper (simplified) ----------
def camera_adjustment_from_crop(orig_w:int, orig_h:int, crop:dict, camera:dict):
    """
    Simple mapping:
      - new_fov = old_fov * (orig_min / crop_min)
      - pan/tilt: compute offset of crop center from image center (normalized -0.5..0.5) and map to degrees via small factor.
    Returns CameraAdjustment model.
    """
    old_fov = camera.get("fov", 50.0)
    orig_min = min(orig_w, orig_h)
    crop_min = min(crop["width"], crop["height"])
    scale = orig_min / max(1, crop_min)
    new_fov = float(old_fov / scale)  # narrower fov for crop (simple)
    # compute offsets
    crop_center_x = crop["x"] + crop["width"]/2.0
    crop_center_y = crop["y"] + crop["height"]/2.0
    img_center_x = orig_w / 2.0
    img_center_y = orig_h / 2.0
    nx = (crop_center_x - img_center_x) / orig_w  # -0.5..0.5
    ny = (crop_center_y - img_center_y) / orig_h
    # map normalized offsets to degrees (small)
    pan = float(nx * 40.0)   # yaw change
    tilt = float(-ny * 30.0) # pitch change (invert axis)
    note = f"Adjusted fov {old_fov} -> {new_fov:.2f}. Pan {pan:.2f}°, Tilt {tilt:.2f}°."
    return CameraAdjustment(fov=new_fov, pan=pan, tilt=tilt, note=note)

# ---------- Routes ----------
@router.post("/compose/analyze", response_model=AnalyzeResponse)
async def analyze(
    req: AnalyzeRequest = Depends(), 
    file: UploadFile = File(None),
    method: str = Query("edge", enum=["edge","clip"])
):
    """
    Analyze uploaded image or image_url, return centroid and crop proposals.
    
    Args:
        req: AnalyzeRequest with image_url and parameters
        file: Optional uploaded file
        method: "edge" (fast sobel) or "clip" (higher-quality gradcam using CLIP)
    """
    try:
        if file is not None:
            raw = await file.read()
            img = load_image_from_bytes(raw)
            img_bytes = raw
        elif req.image_url:
            data = await fetch_image(req.image_url)
            img = load_image_from_bytes(data)
            img_bytes = data
        else:
            raise HTTPException(status_code=400, detail="Provide upload file or image_url")
    except Exception as e:
        logger.error(f"Failed to load image: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to load image: {e}")

    if method == "clip" and CLIP_AVAILABLE:
        try:
            sal_map = compute_clip_gradcam(img_bytes)
            # convert sal_map (HxW float) into proposals
            result = propose_from_saliency(img, sal_map, req.aspect_ratios, req.target_coverage, req.n_proposals)
        except Exception as e:
            logger.warning(f"CLIP saliency failed, falling back to edge: {e}")
            result = propose_crops(img, req.aspect_ratios, req.target_coverage, req.n_proposals)
    else:
        if method == "clip" and not CLIP_AVAILABLE:
            logger.warning("CLIP not available, using edge method")
        result = propose_crops(img, req.aspect_ratios, req.target_coverage, req.n_proposals)

    proposals = [CropProposal(**p) for p in result["proposals"]]
    thirds = {k: (int(v[0]), int(v[1])) for k,v in result["thirds"].items()}
    return AnalyzeResponse(
        width=result["width"], 
        height=result["height"], 
        centroid=result["centroid"],
        proposals=proposals, 
        rule_of_thirds=thirds
    )


class ApplyComposeRequest(BaseModel):
    crop: dict   # x,y,width,height
    camera: Optional[dict] = {}
    fibo_prompt: Optional[dict] = None  # optional original fibo prompt to patch
    image_url: Optional[str] = None
    persist: Optional[bool] = False


@router.post("/compose/apply")
async def apply_compose(req: ApplyComposeRequest, user_id: Optional[str] = None):
    """
    Accept a selected crop; return camera adjustment and optionally patched FIBO JSON with camera changes.
    
    Args:
        req: ApplyComposeRequest with crop, camera, and optional fibo_prompt
        user_id: Optional user ID for persistence
    """
    crop = req.crop
    # For safety, require crop keys
    for k in ("x","y","width","height"):
        if k not in crop:
            raise HTTPException(status_code=400, detail=f"crop missing required key: {k}")
    
    # need orig dims - if fibo_prompt includes render.resolution use it; else assume crop relative to 1:1
    if req.fibo_prompt and req.fibo_prompt.get("render", {}).get("resolution"):
        orig_w, orig_h = req.fibo_prompt["render"]["resolution"]
    else:
        # fallback: assume 2048x2048
        orig_w, orig_h = (2048, 2048)
    
    camera = req.camera or (req.fibo_prompt.get("camera", {}) if req.fibo_prompt else {})
    adj = camera_adjustment_from_crop(orig_w, orig_h, crop, camera)
    patched = {}
    
    if req.fibo_prompt:
        # apply camera changes to a copy of fibo prompt
        patched = dict(req.fibo_prompt)
        patched_camera = patched.get("camera", {})
        patched_camera["fov"] = adj.fov
        patched_camera["pan"] = adj.pan
        patched_camera["tilt"] = adj.tilt
        patched["camera"] = patched_camera
    
    # Persist if requested
    saved_id = None
    if req.persist:
        try:
            from app.models.composition_model import CompositionSuggestion
            from app.db import SessionLocal
            
            db = SessionLocal()
            try:
                suggestion = CompositionSuggestion(
                    user_id=user_id,
                    image_url=req.image_url,
                    proposals=req.fibo_prompt.get("_proposals") if req.fibo_prompt and "_proposals" in req.fibo_prompt else [],
                    selected=crop,
                    camera_adjustment=adj.dict(),
                    accepted=True
                )
                db.add(suggestion)
                db.commit()
                db.refresh(suggestion)
                saved_id = suggestion.id
                logger.info(f"Saved composition suggestion: {saved_id}")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Failed to persist composition: {e}")
            # Don't fail the request if persistence fails
    
    return {
        "camera_adjustment": adj.dict(), 
        "patched_prompt": patched,
        "saved_id": saved_id
    }

