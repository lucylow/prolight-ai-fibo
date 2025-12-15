"""
Gemini API endpoint - Natural Language to FIBO JSON conversion
Converts voice commands and natural language descriptions to FIBO JSON
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json
import logging
import requests
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# Gemini FIBO Conversion System Prompt
GEMINI_FIBO_SYSTEM_PROMPT = """You are ProLight AI Voice Assistant. Convert natural language photography descriptions to FIBO JSON.

You understand professional photography terminology:
- Lighting: "soft key light", "dramatic rim", "three point", "beauty lighting", "high key", "low key"
- Camera: "85mm f/2.8", "50mm portrait", "wide angle f/8", "telephoto"
- Background: "white seamless", "black backdrop", "gray seamless", "studio background"
- Color: "warm tungsten", "cool daylight", "3200K", "5600K", "daylight balanced"

EXAMPLES:
"soft key light from left" → {
  "lighting": {
    "main_light": {
      "direction": "front-left",
      "intensity": 0.9,
      "angle_horizontal": -45,
      "softness": 0.7,
      "color_temperature": 5600
    }
  }
}

"dramatic rim lighting warm" → {
  "lighting": {
    "rim_light": {
      "direction": "back",
      "intensity": 1.4,
      "color_temperature": 3200,
      "softness": 0.3
    }
  }
}

"85mm portrait f/2.8" → {
  "camera": {
    "fov": 28.5,
    "aperture": "f/2.8",
    "lens_type": "portrait",
    "shot_type": "close-up"
  }
}

"white seamless background" → {
  "environment": {
    "setting": "professional studio with white seamless background",
    "lighting_conditions": "controlled studio lighting"
  }
}

"studio three point lighting f2.8 product shot" → {
  "lighting": {
    "main_light": {"direction": "front-right", "intensity": 0.9, "angle_horizontal": 45, "softness": 0.6, "color_temperature": 5600},
    "fill_light": {"direction": "front-left", "intensity": 0.4, "angle_horizontal": -30, "softness": 0.7, "color_temperature": 5600},
    "rim_light": {"direction": "back", "intensity": 0.6, "angle_horizontal": 180, "softness": 0.3, "color_temperature": 5600}
  },
  "camera": {
    "fov": 50,
    "aperture": "f/2.8",
    "lens_type": "standard",
    "shot_type": "medium shot"
  }
}

ALWAYS return VALID JSON only. Parse lighting ratios, camera specs, backgrounds, and color temperatures.
Return a complete FIBO structure with lighting, camera, and environment sections.
Use snake_case for all keys.
"""


class FIBORequest(BaseModel):
    """Request model for natural language to FIBO conversion."""
    prompt: str
    system: Optional[str] = None


class FIBOResponse(BaseModel):
    """Response model for FIBO JSON conversion."""
    fibo: Dict[str, Any]
    confidence: Optional[float] = None
    parsed_elements: Optional[Dict[str, Any]] = None


def parse_lighting_description(text: str) -> Dict[str, Any]:
    """
    Parse lighting description from natural language.
    Returns a dictionary with detected lighting parameters.
    """
    text_lower = text.lower()
    result: Dict[str, Any] = {}
    
    # Detect lighting types
    if any(word in text_lower for word in ['rim', 'backlight', 'hair light']):
        result['has_rim'] = True
    if any(word in text_lower for word in ['key', 'main', 'primary']):
        result['has_key'] = True
    if any(word in text_lower for word in ['fill', 'secondary']):
        result['has_fill'] = True
    if any(word in text_lower for word in ['three point', '3 point']):
        result['has_three_point'] = True
    
    # Detect intensity modifiers
    if any(word in text_lower for word in ['dramatic', 'strong', 'intense', 'bright']):
        result['intensity_modifier'] = 'high'
    elif any(word in text_lower for word in ['soft', 'gentle', 'subtle', 'low']):
        result['intensity_modifier'] = 'low'
    
    # Detect color temperature
    if any(word in text_lower for word in ['warm', 'tungsten', '3200', 'incandescent']):
        result['color_temp'] = 3200
    elif any(word in text_lower for word in ['cool', 'daylight', '5600', 'day']):
        result['color_temp'] = 5600
    elif 'k' in text_lower:
        # Try to extract Kelvin value
        import re
        kelvin_match = re.search(r'(\d{4})\s*k', text_lower)
        if kelvin_match:
            result['color_temp'] = int(kelvin_match.group(1))
    
    return result


@router.post("/fibo", response_model=FIBOResponse)
async def natural_to_fibo(request: FIBORequest):
    """
    Convert natural language photography description to FIBO JSON.
    
    Args:
        request: FIBORequest with natural language prompt
        
    Returns:
        FIBOResponse with converted FIBO JSON structure
    """
    if not settings.GEMINI_API_KEY and not settings.GOOGLE_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured. Please set GEMINI_API_KEY or GOOGLE_API_KEY environment variable."
        )
    
    api_key = settings.GEMINI_API_KEY or settings.GOOGLE_API_KEY
    system_prompt = request.system or GEMINI_FIBO_SYSTEM_PROMPT
    
    try:
        # Call Gemini API
        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent"
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": system_prompt},
                        {"text": f"Convert this photography description to FIBO JSON: '{request.prompt}'"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.3,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 2048,
            }
        }
        
        response = requests.post(
            url,
            params={"key": api_key},
            json=payload,
            timeout=30
        )
        
        if response.status_code != 200:
            logger.error(f"Gemini API error: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Gemini API error: {response.text[:200]}"
            )
        
        result = response.json()
        
        # Extract text from Gemini response
        if not result.get("candidates") or not result["candidates"][0].get("content"):
            raise HTTPException(
                status_code=500,
                detail="No response from Gemini API"
            )
        
        response_text = result["candidates"][0]["content"]["parts"][0]["text"]
        
        # Clean and parse JSON
        # Remove markdown code blocks if present
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        
        # Parse JSON
        try:
            fibo_json = json.loads(response_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini JSON response: {e}")
            logger.error(f"Response text: {response_text[:500]}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to parse FIBO JSON from Gemini response: {str(e)}"
            )
        
        # Parse additional elements for metadata
        parsed_elements = parse_lighting_description(request.prompt)
        
        return FIBOResponse(
            fibo=fibo_json,
            confidence=0.85,  # Default confidence
            parsed_elements=parsed_elements
        )
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Error calling Gemini API: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Failed to connect to Gemini API: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error in natural_to_fibo: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

