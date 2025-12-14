"""
VLM Base JSON Generator (Python)

Uses Vision-Language Model (VLM) to generate base FIBO JSON from natural language scene descriptions.
The generated JSON can then be merged with precise 3D lighting controls.
"""

import json
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

FIBO_JSON_SYSTEM_PROMPT = """You are a professional photography director and lighting expert. Generate structured FIBO JSON prompts for AI image generation.

CRITICAL: Always output valid JSON with this exact structure. No additional text, no markdown formatting.

Required JSON structure:
{
  "subject": {
    "main_entity": "description of main subject",
    "attributes": ["adjective1", "adjective2"],
    "action": "what the subject is doing",
    "emotion": "emotional state",
    "mood": "overall mood"
  },
  "environment": {
    "setting": "location description",
    "time_of_day": "time period",
    "weather": "weather conditions",
    "lighting_conditions": "ambient lighting description",
    "atmosphere": "atmospheric quality"
  },
  "camera": {
    "shot_type": "close-up/medium shot/wide shot",
    "camera_angle": "eye-level/low angle/high angle",
    "fov": 85,
    "lens_type": "portrait/wide/telephoto",
    "aperture": "f/2.8",
    "focus": "focus description",
    "depth_of_field": "shallow/medium/deep"
  },
  "style_medium": "photograph",
  "artistic_style": "photography style description",
  "color_palette": {
    "white_balance": "5500K",
    "mood": "warm/cool/neutral"
  },
  "composition": {
    "rule_of_thirds": true,
    "depth_layers": ["foreground", "subject", "background"]
  }
}

NOTE: Do NOT include a "lighting" section - lighting will be added separately from 3D controls.

Generate realistic, professional descriptions that match the scene description provided."""


def generate_base_json_from_scene(
    scene_description: str,
    api_key: Optional[str] = None,
    endpoint: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate base FIBO JSON from scene description using VLM.
    
    This function calls a VLM API to generate the base JSON structure.
    In a real implementation, you would integrate with your VLM service (e.g., Bria VLM, Gemini, etc.)
    
    Args:
        scene_description: Natural language description of the scene
        api_key: Optional API key for VLM service
        endpoint: Optional endpoint URL for VLM service
        
    Returns:
        Base FIBO JSON dictionary (without lighting section)
    """
    # This is a placeholder - in real implementation, you would call your VLM API
    # For now, we'll create a reasonable default structure based on the description
    
    lower_desc = scene_description.lower()
    
    # Determine environment type
    if any(word in lower_desc for word in ["outdoor", "outside", "garden", "park"]):
        environment = "outdoor location"
        time_of_day = "night" if "night" in lower_desc else \
                     "sunset" if "sunset" in lower_desc else \
                     "dawn" if "dawn" in lower_desc else "daytime"
        atmosphere = "natural"
    elif any(word in lower_desc for word in ["studio", "backdrop"]):
        environment = "professional studio"
        time_of_day = "controlled lighting"
        atmosphere = "controlled"
    else:
        environment = "indoor setting"
        time_of_day = "controlled lighting"
        atmosphere = "indoor"
    
    # Determine mood/emotion
    if any(word in lower_desc for word in ["dramatic", "intense"]):
        mood = "dramatic"
        emotion = "intense"
    elif any(word in lower_desc for word in ["soft", "gentle", "peaceful"]):
        mood = "soft"
        emotion = "calm"
    elif any(word in lower_desc for word in ["professional", "corporate"]):
        mood = "professional"
        emotion = "confident"
    else:
        mood = "neutral"
        emotion = "calm"
    
    # Build base JSON structure
    base_json: Dict[str, Any] = {
        "subject": {
            "main_entity": scene_description.split(",")[0].strip() or scene_description,
            "attributes": ["professionally lit", "high quality", "detailed", "sharp focus"],
            "action": "posed for professional photograph",
            "emotion": emotion,
            "mood": mood,
        },
        "environment": {
            "setting": environment,
            "time_of_day": time_of_day,
            "weather": "clear" if "outdoor" in environment else "indoor",
            "lighting_conditions": "professional studio",
            "atmosphere": atmosphere,
        },
        "camera": {
            "shot_type": "medium shot",
            "camera_angle": "eye-level",
            "fov": 85,
            "lens_type": "portrait 85mm",
            "aperture": "f/2.8",
            "focus": "sharp on subject",
            "depth_of_field": "shallow",
        },
        "style_medium": "photograph",
        "artistic_style": "professional studio photography",
        "color_palette": {
            "white_balance": "5500K",
            "mood": "neutral",
        },
        "composition": {
            "rule_of_thirds": True,
            "depth_layers": ["foreground", "subject", "background"],
        },
        "enhancements": {
            "professional_grade": True,
            "color_fidelity": True,
            "detail_enhancement": True,
        },
    }
    
    # In a real implementation, you would call the VLM API here:
    """
    import requests
    
    response = requests.post(
        endpoint or 'https://api.vlm-service.com/generate',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        json={
            'prompt': scene_description,
            'system_prompt': FIBO_JSON_SYSTEM_PROMPT,
            'format': 'json',
            'model': 'structured-prompt-generator',
        },
        timeout=30
    )
    
    response.raise_for_status()
    result = response.json()
    
    # Extract JSON from response
    json_text = result.get('json_prompt') or result.get('text') or result.get('content', '')
    
    # Remove markdown code blocks if present
    json_text = json_text.replace('```json\n', '').replace('```\n', '').strip()
    
    # Parse JSON
    vlm_json = json.loads(json_text)
    
    # Remove lighting section if present (we'll add it from 3D controls)
    if 'lighting' in vlm_json:
        del vlm_json['lighting']
    
    # Merge with our structure
    base_json.update(vlm_json)
    """
    
    return base_json


async def call_vlm_for_base_json(
    scene_description: str,
    api_key: str,
    endpoint: str
) -> Dict[str, Any]:
    """
    Call actual VLM API to generate structured JSON.
    
    This is the real implementation that calls your VLM service.
    Replace with your actual VLM API integration.
    
    Args:
        scene_description: Natural language scene description
        api_key: API key for VLM service
        endpoint: Endpoint URL for VLM service
        
    Returns:
        Base FIBO JSON dictionary
    """
    try:
        import httpx
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                endpoint,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "prompt": scene_description,
                    "system_prompt": FIBO_JSON_SYSTEM_PROMPT,
                    "format": "json",
                    "model": "structured-prompt-generator",
                },
            )
            
            response.raise_for_status()
            result = response.json()
            
            # Extract JSON from response
            json_text = result.get("json_prompt") or result.get("text") or result.get("content", "")
            
            # Remove markdown code blocks if present
            json_text = json_text.replace("```json\n", "").replace("```\n", "").strip()
            
            # Parse JSON
            vlm_json = json.loads(json_text)
            
            # Remove lighting section if present (we'll add it from 3D controls)
            if "lighting" in vlm_json:
                del vlm_json["lighting"]
            
            return vlm_json
            
    except Exception as e:
        logger.error(f"Error calling VLM for base JSON: {e}")
        # Fallback to basic structure
        return generate_base_json_from_scene(scene_description)


def validate_base_json(json_data: Any) -> bool:
    """
    Validate base JSON structure.
    
    Args:
        json_data: JSON data to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not json_data or not isinstance(json_data, dict):
        return False
    
    # Should have at least subject or environment
    return (
        (json_data.get("subject") and isinstance(json_data["subject"], dict)) or
        (json_data.get("environment") and isinstance(json_data["environment"], dict))
    )
