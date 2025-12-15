"""
Cost estimation for image generation jobs.
"""
from typing import Optional


def estimate_cost(
    num_variants: int = 1,
    width: int = 1024,
    height: int = 1024,
    model_version: str = "bria-fibo-v1",
    has_controlnet: bool = False,
    num_guidance_images: int = 0
) -> int:
    """
    Estimate cost in cents for image generation.
    
    Pricing model (example - adjust based on actual costs):
    - Base cost per image: 3 cents (1024x1024)
    - Size multiplier: cost scales with pixel count
    - ControlNet: +1 cent per image
    - Guidance images: +0.5 cents per guidance image per image
    
    Args:
        num_variants: Number of variants to generate
        width: Image width
        height: Image height
        model_version: Model version
        has_controlnet: Whether ControlNet is used
        num_guidance_images: Number of guidance images
        
    Returns:
        Estimated cost in cents
    """
    base_cost_cents = 3  # Base cost for 1024x1024
    
    # Size multiplier (cost scales with pixel count relative to 1024x1024)
    base_pixels = 1024 * 1024
    image_pixels = width * height
    size_multiplier = image_pixels / base_pixels
    
    # Base cost per variant
    cost_per_variant = base_cost_cents * size_multiplier
    
    # Add ControlNet cost
    if has_controlnet:
        cost_per_variant += 1
    
    # Add guidance image cost
    if num_guidance_images > 0:
        cost_per_variant += 0.5 * num_guidance_images
    
    # Model version adjustments (HD models cost more)
    if "hd" in model_version.lower() or "v2" in model_version.lower():
        cost_per_variant *= 1.5
    
    # Round to nearest cent
    cost_per_variant = round(cost_per_variant, 2)
    
    # Total cost
    total_cents = int(cost_per_variant * num_variants)
    
    return max(total_cents, 1)  # Minimum 1 cent

