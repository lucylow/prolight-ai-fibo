"""
16-bit HDR export capability for professional workflows.
"""

from PIL import Image
import numpy as np
from typing import Optional, Tuple
import os


def convert_to_16bit_hdr(
    image_path: str,
    output_path: Optional[str] = None,
    color_space: str = "sRGB"
) -> str:
    """
    Convert image to 16-bit HDR format.
    
    Args:
        image_path: Path to input image
        output_path: Optional output path (default: adds _16bit suffix)
        color_space: Target color space
        
    Returns:
        Path to 16-bit HDR image
    """
    # Load image
    img = Image.open(image_path)
    
    # Convert to RGB if needed
    if img.mode != "RGB":
        img = img.convert("RGB")
    
    # Convert to numpy array
    img_array = np.array(img, dtype=np.uint16)
    
    # Scale to 16-bit range (0-65535)
    if img_array.max() <= 255:
        # Input is 8-bit, scale to 16-bit
        img_array = (img_array.astype(np.uint16) * 257).astype(np.uint16)
    
    # Create 16-bit image
    hdr_img = Image.fromarray(img_array, mode="RGB")
    
    # Determine output path
    if output_path is None:
        base, ext = os.path.splitext(image_path)
        output_path = f"{base}_16bit{ext}"
    
    # Save as 16-bit PNG or TIFF
    if output_path.endswith(".tiff") or output_path.endswith(".tif"):
        hdr_img.save(output_path, format="TIFF", bits=16)
    else:
        # PNG supports 16-bit
        hdr_img.save(output_path, format="PNG", bits=16)
    
    return output_path


def export_hdr_with_metadata(
    image_path: str,
    fibo_json: dict,
    c2pa_metadata: Optional[dict] = None,
    output_path: Optional[str] = None
) -> str:
    """
    Export 16-bit HDR image with C2PA metadata.
    
    Args:
        image_path: Path to input image
        fibo_json: FIBO JSON used for generation
        c2pa_metadata: Optional C2PA metadata
        output_path: Optional output path
        
    Returns:
        Path to exported HDR image
    """
    # Convert to 16-bit
    hdr_path = convert_to_16bit_hdr(image_path, output_path)
    
    # Embed metadata if provided
    if c2pa_metadata:
        from app.utils.c2pa import embed_c2pa_to_image
        embed_c2pa_to_image(hdr_path, c2pa_metadata)
    
    return hdr_path

