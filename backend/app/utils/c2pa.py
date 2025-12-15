"""
C2PA (Coalition for Content Provenance and Authenticity) metadata support.
Adds provenance metadata to generated images.
"""

from typing import Dict, Any, Optional
from datetime import datetime
import json
import hashlib


def create_c2pa_metadata(
    fibo_json: Dict[str, Any],
    generation_id: str,
    model_version: str = "FIBO-v2.3",
    creator: str = "ProLight AI"
) -> Dict[str, Any]:
    """
    Create C2PA metadata for generated image.
    
    Args:
        fibo_json: FIBO JSON used for generation
        generation_id: Unique generation ID
        model_version: Model version used
        creator: Creator/application name
        
    Returns:
        C2PA metadata dictionary
    """
    # Create hash of FIBO JSON for provenance
    json_str = json.dumps(fibo_json, sort_keys=True)
    json_hash = hashlib.sha256(json_str.encode()).hexdigest()
    
    metadata = {
        "claim_generator": f"{creator} {model_version}",
        "signature": {
            "alg": "sha256",
            "hash": json_hash
        },
        "assertions": [
            {
                "label": "stds.schema-org.CreativeWork",
                "data": {
                    "@context": "https://schema.org",
                    "@type": "ImageObject",
                    "creator": {
                        "@type": "SoftwareApplication",
                        "name": creator,
                        "version": model_version
                    },
                    "dateCreated": datetime.utcnow().isoformat(),
                    "identifier": generation_id
                }
            },
            {
                "label": "stds.iptc.photo-metadata",
                "data": {
                    "CreatorTool": f"{creator} {model_version}",
                    "DateCreated": datetime.utcnow().isoformat(),
                    "Keywords": ["AI Generated", "FIBO", "ProLight AI"]
                }
            },
            {
                "label": "com.prolight.fibo-json",
                "data": {
                    "fibo_json": fibo_json,
                    "generation_id": generation_id,
                    "model_version": model_version,
                    "deterministic": True
                }
            }
        ],
        "manifest": {
            "claim_generator": f"{creator} {model_version}",
            "claim_generator_info": [
                {
                    "name": creator,
                    "version": model_version
                }
            ],
            "thumbnail": None  # Would contain thumbnail if available
        }
    }
    
    return metadata


def embed_c2pa_to_image(image_path: str, metadata: Dict[str, Any]) -> str:
    """
    Embed C2PA metadata into image file.
    
    Note: Full C2PA implementation requires c2patool or similar.
    This is a placeholder that would integrate with actual C2PA tools.
    
    Args:
        image_path: Path to image file
        metadata: C2PA metadata dictionary
        
    Returns:
        Path to image with embedded metadata
    """
    # TODO: Integrate with actual C2PA tooling
    # For now, return metadata as separate JSON
    metadata_path = image_path.replace(".png", "_c2pa.json")
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    
    return metadata_path

