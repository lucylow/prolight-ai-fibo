"""
Intent Classifier - Rule-based intent detection and entity extraction.
Can be upgraded to ML-based classifier in the future.
"""

import re
from typing import Dict, Any, List


# ============================================================================
# Intent Patterns
# ============================================================================

INTENT_PATTERNS = {
    "remove_background": [
        r"\bremove (the )?background\b",
        r"\bcut out (the )?subject\b",
        r"\bextract (the )?object\b",
        r"\bisolate (the )?subject\b",
        r"\bseparate (the )?background\b",
    ],
    "relight": [
        r"\brelight\b",
        r"\badjust (lighting|exposure|ev)\b",
        r"\bchange (lighting|temperature)\b",
        r"\bmodify (lighting|exposure)\b",
        r"\bset (lighting|exposure)\b",
        r"\bupdate (lighting|exposure)\b",
    ],
    "generate_image": [
        r"\bcreate (an? )?(image|picture|visual)\b",
        r"\bgenerate (an? )?(image|graphic)\b",
        r"\bmake (an? )?(image|picture)\b",
        r"\bproduce (an? )?(image|visual)\b",
    ],
    "analyze_lighting": [
        r"\banalyze (the )?lighting\b",
        r"\bexamine (the )?lighting\b",
        r"\bassess (the )?lighting\b",
        r"\bevaluate (the )?lighting\b",
        r"\bcheck (the )?lighting\b",
    ],
    "image_onboard": [
        r"\bonboard (this )?(image|photo)\b",
        r"\bupload( this)? (image|picture)\b",
        r"\badd (this )?(image|photo)\b",
        r"\bimport (this )?(image|picture)\b",
    ],
    "chat": [r".*"],  # default fallback
}


# ============================================================================
# Entity Patterns
# ============================================================================

ENTITY_PATTERNS = {
    "temperature": r"(\d{3,4}K)",
    "ev_value": r"([+-]?\d+(\.\d+)?)\s*ev",
    "aspect_ratio": r"(\d+:\d+)",
    "intensity": r"(intensity|brightness)\s*(of\s*)?([0-9.]+)",
    "color_temp": r"(\d{3,4})\s*(kelvin|k)",
}


# ============================================================================
# Intent Classification
# ============================================================================

def classify_intent(text: str) -> Dict[str, Any]:
    """
    Classify user intent from text message.
    
    Args:
        text: User message text
        
    Returns:
        Dictionary with 'intent' and 'confidence' keys
    """
    text_lower = text.lower().strip()
    
    # Check each intent pattern
    for intent, patterns in INTENT_PATTERNS.items():
        if intent == "chat":
            continue  # Skip default fallback for now
            
        for pattern in patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return {
                    "intent": intent,
                    "confidence": 0.9,
                }
    
    # Default to chat if no specific intent found
    return {
        "intent": "chat",
        "confidence": 0.5,
    }


def extract_entities(text: str) -> Dict[str, str]:
    """
    Extract named entities from text.
    
    Args:
        text: User message text
        
    Returns:
        Dictionary of extracted entities
    """
    entities: Dict[str, str] = {}
    text_lower = text.lower()
    
    for key, pattern in ENTITY_PATTERNS.items():
        match = re.search(pattern, text_lower, re.IGNORECASE)
        if match:
            # Extract the matched value
            if key == "temperature" or key == "color_temp":
                entities[key] = match.group(1)
            elif key == "ev_value":
                entities[key] = match.group(1)
            elif key == "aspect_ratio":
                entities[key] = match.group(1)
            elif key == "intensity":
                entities[key] = match.group(3) if len(match.groups()) >= 3 else match.group(1)
            else:
                entities[key] = match.group(1)
    
    return entities


def analyze_message(text: str) -> Dict[str, Any]:
    """
    Complete message analysis: intent + entities.
    
    Args:
        text: User message text
        
    Returns:
        Dictionary with 'intent', 'confidence', and 'entities'
    """
    intent_info = classify_intent(text)
    entities = extract_entities(text)
    
    return {
        **intent_info,
        "entities": entities,
    }

