# backend/app/clip_saliency.py
"""
CLIP-based saliency analysis using Grad-CAM.
Optional advanced composition analysis using CLIP visual backbone.
"""
import io
import numpy as np
from PIL import Image
import logging

logger = logging.getLogger(__name__)

# Try to import PyTorch and CLIP (optional dependencies)
try:
    import torch
    import torch.nn.functional as F
    import clip
    
    TORCH_AVAILABLE = True
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    # Load CLIP model (RN50 is a good default - smaller and faster than ViT)
    try:
        model, preprocess = clip.load("RN50", device=device)
        logger.info(f"CLIP model loaded on {device}")
    except Exception as e:
        logger.warning(f"Failed to load CLIP model: {e}")
        model, preprocess = None, None
        TORCH_AVAILABLE = False
    
except ImportError:
    TORCH_AVAILABLE = False
    model, preprocess = None, None
    device = None
    logger.warning("PyTorch or CLIP not available. Install torch and clip for advanced saliency analysis.")


def find_last_conv(module):
    """
    Walk module to find a last conv2d layer to hook into GradCAM.
    """
    last_conv = None
    for name, m in module.named_modules():
        if isinstance(m, torch.nn.Conv2d):
            last_conv = (name, m)
    return last_conv


def compute_clip_gradcam(image_bytes: bytes, top_k: int = 1) -> np.ndarray:
    """
    Returns a saliency heatmap (float32 0..1) same HxW as input image.
    Strategy:
      - Run CLIP visual forward; take image embedding's L2 norm as scalar score,
        backprop gradients to the last conv feature map and compute Grad-CAM.
    """
    if not TORCH_AVAILABLE or model is None:
        raise RuntimeError("CLIP model not available. Install torch and clip packages.")
    
    # prepare image
    pil = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = preprocess(pil).unsqueeze(0).to(device)  # 1x3xH'xW'
    img_orig_w, img_orig_h = pil.size

    model.eval()
    # find last conv layer
    last = find_last_conv(model.visual)
    if last is None:
        raise RuntimeError("No convolution layer found in CLIP visual backbone")
    last_name, last_conv = last

    activations = None
    gradients = None
    
    # forward hook to capture activations
    def forward_hook(module, input, output):
        nonlocal activations
        activations = output.detach()

    # backward hook to capture gradients
    def backward_hook(module, grad_in, grad_out):
        nonlocal gradients
        if grad_out and len(grad_out) > 0:
            gradients = grad_out[0].detach()

    fh = last_conv.register_forward_hook(forward_hook)
    bh = last_conv.register_backward_hook(backward_hook)

    try:
        # forward pass
        img.requires_grad_()
        image_features = model.encode_image(img)  # shape (1, D)
        # scalar score: L2 norm of embedding
        score = image_features.norm(dim=-1).squeeze()

        # backprop to get gradients
        model.zero_grad()
        score.backward(retain_graph=True)

        # now activations: (1, C, Hf, Wf), gradients same shape
        if activations is None or gradients is None:
            # fallback: return uniform map
            logger.warning("Failed to capture activations/gradients, returning uniform map")
            return np.ones((img_orig_h, img_orig_w), dtype=np.float32)

        # global average pool grads -> weights
        weights = gradients.mean(dim=(2,3), keepdim=True)  # (1,C,1,1)
        cam = (weights * activations).sum(dim=1, keepdim=True)  # (1,1,Hf,Wf)
        cam = F.relu(cam)
        cam = cam.squeeze().cpu().numpy()
        
        # normalize
        cam = cam - cam.min()
        if cam.max() > 0:
            cam = cam / cam.max()
        
        # resize to original image size
        cam_img = Image.fromarray((cam * 255).astype('uint8'))
        cam_resized = cam_img.resize((img_orig_w, img_orig_h), Image.BILINEAR)
        cam_arr = np.asarray(cam_resized).astype(np.float32) / 255.0

        return cam_arr
    
    finally:
        # cleanup hooks
        fh.remove()
        bh.remove()
