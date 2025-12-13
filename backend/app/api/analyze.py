"""
Analyze endpoint - Lighting analysis and recommendations.
"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import AnalysisRequest, LightingAnalysis
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/analyze/lighting", response_model=LightingAnalysis)
async def analyze_lighting(request: AnalysisRequest):
    """
    Analyze lighting setup and provide recommendations.
    
    Args:
        request: AnalysisRequest with lighting configuration
        
    Returns:
        LightingAnalysis with metrics and recommendations
    """
    try:
        lighting = request.lighting_setup
        
        # Calculate key-to-fill ratio
        main_intensity = lighting.get("mainLight", {}).get("intensity", 1.0)
        fill_intensity = lighting.get("fillLight", {}).get("intensity", 0.5)
        
        if fill_intensity > 0:
            key_to_fill_ratio = main_intensity / fill_intensity
        else:
            key_to_fill_ratio = main_intensity
        
        # Calculate color temperature consistency
        main_temp = lighting.get("mainLight", {}).get("colorTemperature", 5600)
        fill_temp = lighting.get("fillLight", {}).get("colorTemperature", 5600)
        rim_temp = lighting.get("rimLight", {}).get("colorTemperature", 5600)
        
        temps = [main_temp, fill_temp, rim_temp]
        avg_temp = sum(temps) / len(temps)
        temp_variance = sum((t - avg_temp) ** 2 for t in temps) / len(temps)
        
        # Normalize to 0-1 scale (lower variance = higher consistency)
        color_consistency = max(0, 1 - (temp_variance / 10000000))
        
        # Generate professional rating
        rating = calculate_professional_rating(lighting)
        
        # Generate recommendations
        recommendations = generate_recommendations(lighting, key_to_fill_ratio)
        
        # Assess mood
        mood = assess_mood(lighting)
        
        return LightingAnalysis(
            key_to_fill_ratio=round(key_to_fill_ratio, 2),
            color_temperature_consistency=round(color_consistency, 2),
            professional_rating=round(rating, 1),
            recommendations=recommendations,
            mood_assessment=mood
        )
    
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def calculate_professional_rating(lighting: dict) -> float:
    """Calculate professional rating of lighting setup."""
    rating = 5.0
    
    # Check main light
    main_light = lighting.get("mainLight", {})
    if main_light.get("enabled"):
        intensity = main_light.get("intensity", 1.0)
        if 0.8 <= intensity <= 1.2:
            rating += 1.0
        softness = main_light.get("softness", 0.5)
        if 0.3 <= softness <= 0.7:
            rating += 0.5
    
    # Check fill light
    fill_light = lighting.get("fillLight", {})
    if fill_light.get("enabled"):
        intensity = fill_light.get("intensity", 0.4)
        if 0.2 <= intensity <= 0.6:
            rating += 1.0
        softness = fill_light.get("softness", 0.7)
        if softness >= 0.6:
            rating += 0.5
    
    # Check rim light
    rim_light = lighting.get("rimLight", {})
    if rim_light.get("enabled"):
        intensity = rim_light.get("intensity", 0.5)
        if 0.3 <= intensity <= 0.8:
            rating += 1.0
    
    # Color temperature consistency
    main_temp = main_light.get("colorTemperature", 5600)
    fill_temp = fill_light.get("colorTemperature", 5600)
    if abs(main_temp - fill_temp) <= 500:
        rating += 0.5
    
    return min(10.0, rating)


def generate_recommendations(lighting: dict, key_to_fill_ratio: float) -> list:
    """Generate recommendations for lighting improvement."""
    recommendations = []
    
    # Check key-to-fill ratio
    if key_to_fill_ratio > 4.0:
        recommendations.append("Consider increasing fill light for softer shadows")
    elif key_to_fill_ratio < 1.5:
        recommendations.append("Increase key light intensity for more modeling")
    
    # Check rim light
    rim_light = lighting.get("rimLight", {})
    if not rim_light.get("enabled"):
        recommendations.append("Consider enabling rim light for better separation")
    else:
        rim_intensity = rim_light.get("intensity", 0.5)
        if rim_intensity < 0.3:
            recommendations.append("Rim light could be stronger for more separation")
    
    # Check softness
    main_light = lighting.get("mainLight", {})
    main_softness = main_light.get("softness", 0.5)
    if main_softness < 0.3:
        recommendations.append("Main light is quite hard; consider softening for more flattering results")
    elif main_softness > 0.8:
        recommendations.append("Main light is very soft; consider adding some modeling")
    
    # Check color temperature
    main_temp = main_light.get("colorTemperature", 5600)
    if main_temp < 3500:
        recommendations.append("Main light is quite warm; consider cooling for more natural look")
    elif main_temp > 7000:
        recommendations.append("Main light is quite cool; consider warming for more flattering results")
    
    if not recommendations:
        recommendations.append("Lighting setup looks professional and well-balanced")
    
    return recommendations


def assess_mood(lighting: dict) -> str:
    """Assess the mood created by lighting setup."""
    main_light = lighting.get("mainLight", {})
    fill_light = lighting.get("fillLight", {})
    rim_light = lighting.get("rimLight", {})
    
    # Calculate contrast
    main_intensity = main_light.get("intensity", 1.0)
    fill_intensity = fill_light.get("intensity", 0.5)
    contrast = main_intensity / (fill_intensity + 0.1)
    
    # Calculate warmth
    main_temp = main_light.get("colorTemperature", 5600)
    
    # Determine mood
    mood_parts = []
    
    if contrast > 3.0:
        mood_parts.append("dramatic")
    elif contrast > 2.0:
        mood_parts.append("defined")
    else:
        mood_parts.append("soft")
    
    if main_temp < 4000:
        mood_parts.append("warm")
    elif main_temp > 6500:
        mood_parts.append("cool")
    else:
        mood_parts.append("neutral")
    
    if rim_light.get("enabled"):
        mood_parts.append("separated")
    
    return ", ".join(mood_parts)


@router.post("/analyze/compare")
async def compare_lighting_setups(
    setup_1: dict,
    setup_2: dict
):
    """
    Compare two lighting setups.
    
    Args:
        setup_1: First lighting setup
        setup_2: Second lighting setup
        
    Returns:
        Comparison analysis
    """
    try:
        # Analyze both setups
        analysis_1 = await analyze_lighting(AnalysisRequest(lighting_setup=setup_1))
        analysis_2 = await analyze_lighting(AnalysisRequest(lighting_setup=setup_2))
        
        return {
            "setup_1": analysis_1.dict(),
            "setup_2": analysis_2.dict(),
            "winner": "setup_1" if analysis_1.professional_rating > analysis_2.professional_rating else "setup_2",
            "rating_difference": abs(analysis_1.professional_rating - analysis_2.professional_rating)
        }
    
    except Exception as e:
        logger.error(f"Comparison error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analyze/recommendations/{lighting_style}")
async def get_style_recommendations(lighting_style: str):
    """
    Get recommendations for a specific lighting style.
    
    Args:
        lighting_style: Name of lighting style
        
    Returns:
        Style-specific recommendations
    """
    recommendations = {
        "butterfly": {
            "description": "Soft, flattering beauty lighting",
            "key_to_fill_ratio": "2:1 to 3:1",
            "main_light_position": "Above and slightly forward",
            "fill_light_position": "Below camera",
            "rim_light": "Optional",
            "best_for": ["beauty", "commercial", "headshots"],
            "tips": [
                "Keep fill light soft and diffused",
                "Avoid hard shadows under nose",
                "Use warm color temperature for flattering skin tones"
            ]
        },
        "rembrandt": {
            "description": "Dramatic side lighting with characteristic triangle",
            "key_to_fill_ratio": "3:1 to 4:1",
            "main_light_position": "45 degrees to side and above",
            "fill_light_position": "Opposite side of key",
            "rim_light": "Recommended",
            "best_for": ["dramatic", "editorial", "fine art"],
            "tips": [
                "Position fill light to create triangle under eye",
                "Use cooler color temperature for dramatic effect",
                "Strong rim light adds dimension"
            ]
        },
        "loop": {
            "description": "Subtle side lighting with small shadow loop",
            "key_to_fill_ratio": "2:1 to 2.5:1",
            "main_light_position": "30 degrees to side and above",
            "fill_light_position": "Opposite side, closer than Rembrandt",
            "rim_light": "Optional",
            "best_for": ["corporate", "commercial", "headshots"],
            "tips": [
                "More subtle than Rembrandt",
                "Good for corporate and professional portraits",
                "Balanced between dramatic and flat"
            ]
        },
        "split": {
            "description": "High contrast split lighting",
            "key_to_fill_ratio": "5:1 or higher",
            "main_light_position": "90 degrees to side",
            "fill_light_position": "Minimal or none",
            "rim_light": "Recommended",
            "best_for": ["dramatic", "character", "editorial"],
            "tips": [
                "Very dramatic effect",
                "Use for character or artistic portraits",
                "Strong rim light essential"
            ]
        }
    }
    
    style_lower = lighting_style.lower()
    if style_lower in recommendations:
        return recommendations[style_lower]
    else:
        return {
            "error": f"Unknown lighting style: {lighting_style}",
            "available_styles": list(recommendations.keys())
        }
