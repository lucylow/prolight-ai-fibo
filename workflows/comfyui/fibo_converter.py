"""
FIBO to ComfyUI Workflow Converter

Converts FIBO JSON structures to ComfyUI workflow JSON.
Supports all workflow types: structured generation, refine mode, LBM relighting, etc.
"""

import json
import os
from typing import Dict, Any, Optional, List
from pathlib import Path


class FIBOToComfyUI:
    """Convert FIBO JSON to ComfyUI workflows"""
    
    def __init__(self, workflows_dir: Optional[str] = None):
        """
        Initialize converter with workflows directory.
        
        Args:
            workflows_dir: Path to ComfyUI workflows directory.
                          Defaults to same directory as this file.
        """
        if workflows_dir:
            self.workflows_dir = Path(workflows_dir)
        else:
            self.workflows_dir = Path(__file__).parent
        
        self.workflow_templates = {
            "fibo-structured-generation": "fibo-structured-generation.json",
            "fibo-refine": "fibo-refine-mode.json",
            "lbm-relighting": "lbm-relighting.json",
            "cinematic": "cinematic-lighting.json",
            "hybrid": "hybrid-fibo-lbm.json"
        }
    
    def load_workflow_template(self, template_name: str) -> Dict[str, Any]:
        """Load workflow template JSON file"""
        if template_name not in self.workflow_templates:
            raise ValueError(f"Unknown workflow template: {template_name}")
        
        template_path = self.workflows_dir / self.workflow_templates[template_name]
        
        if not template_path.exists():
            raise FileNotFoundError(f"Workflow template not found: {template_path}")
        
        with open(template_path, 'r') as f:
            return json.load(f)
    
    def convert_fibo_to_workflow(
        self,
        fibo_json: Dict[str, Any],
        workflow_template: str = "fibo-structured-generation",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Convert FIBO JSON to ComfyUI workflow.
        
        Args:
            fibo_json: FIBO JSON structure
            workflow_template: Template name (fibo-structured-generation, fibo-refine, etc.)
            **kwargs: Additional parameters for workflow customization
        
        Returns:
            ComfyUI workflow JSON
        """
        workflow = self.load_workflow_template(workflow_template)
        
        # Fill template variables based on workflow type
        if workflow_template == "fibo-structured-generation":
            workflow = self._fill_fibo_generation(workflow, fibo_json, **kwargs)
        elif workflow_template == "fibo-refine":
            workflow = self._fill_fibo_refine(workflow, fibo_json, **kwargs)
        elif workflow_template == "lbm-relighting":
            workflow = self._fill_lbm_relighting(workflow, fibo_json, **kwargs)
        elif workflow_template == "cinematic":
            workflow = self._fill_cinematic(workflow, fibo_json, **kwargs)
        elif workflow_template == "hybrid":
            workflow = self._fill_hybrid(workflow, fibo_json, **kwargs)
        
        return workflow
    
    def _fill_fibo_generation(
        self,
        workflow: Dict[str, Any],
        fibo_json: Dict[str, Any],
        **kwargs
    ) -> Dict[str, Any]:
        """Fill FIBO structured generation workflow"""
        # Node 1: FIBO_JSON_Loader
        workflow["nodes"]["1"]["inputs"]["fibo_json"] = json.dumps(fibo_json)
        
        # Node 2: Build enhanced prompt from FIBO JSON
        prompt_text = self._fibo_json_to_prompt(fibo_json)
        workflow["nodes"]["2"]["inputs"]["json_input"] = ["1", 0]
        
        # Node 5: Set resolution from FIBO render settings
        if "render" in fibo_json:
            render = fibo_json["render"]
            if "resolution" in render:
                width, height = render["resolution"]
                workflow["nodes"]["5"]["inputs"]["width"] = width
                workflow["nodes"]["5"]["inputs"]["height"] = height
        
        # Node 6: Set seed and steps
        if "camera" in fibo_json and "seed" in fibo_json["camera"]:
            workflow["nodes"]["6"]["inputs"]["seed"] = fibo_json["camera"]["seed"]
        
        if "render" in fibo_json and "samples" in fibo_json["render"]:
            workflow["nodes"]["6"]["inputs"]["steps"] = min(
                fibo_json["render"]["samples"], 100
            )
        
        return workflow
    
    def _fill_fibo_refine(
        self,
        workflow: Dict[str, Any],
        fibo_json: Dict[str, Any],
        reference_image: str,
        refinement_instruction: str,
        locked_fields: Optional[List[str]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Fill FIBO refine mode workflow"""
        # Node 1: Reference image
        workflow["nodes"]["1"]["inputs"]["image"] = reference_image
        
        # Node 2: Existing FIBO JSON
        workflow["nodes"]["2"]["inputs"]["fibo_json"] = json.dumps(fibo_json)
        
        # Node 3: Refinement instruction
        workflow["nodes"]["3"]["inputs"]["refinement_instruction"] = refinement_instruction
        workflow["nodes"]["3"]["inputs"]["locked_fields"] = locked_fields or []
        
        # Node 6: Build refined prompt
        refined_json = self._apply_refinement(fibo_json, refinement_instruction, locked_fields)
        workflow["nodes"]["6"]["inputs"]["json_input"] = ["5", 0]
        
        return workflow
    
    def _fill_lbm_relighting(
        self,
        workflow: Dict[str, Any],
        fibo_json: Dict[str, Any],
        background_image: str,
        foreground_subject: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Fill LBM relighting workflow"""
        # Node 1: Background
        workflow["nodes"]["1"]["inputs"]["image"] = background_image
        
        # Node 2: Foreground subject
        workflow["nodes"]["2"]["inputs"]["image"] = foreground_subject
        
        # Node 6: Optional FIBO lighting override
        if "lighting" in fibo_json:
            workflow["nodes"]["6"]["inputs"]["lighting_json"] = json.dumps(
                fibo_json["lighting"]
            )
        
        return workflow
    
    def _fill_cinematic(
        self,
        workflow: Dict[str, Any],
        fibo_json: Dict[str, Any],
        **kwargs
    ) -> Dict[str, Any]:
        """Fill cinematic lighting workflow"""
        # Node 1: FluxKontextPro
        subject = fibo_json.get("subject", {})
        workflow["nodes"]["1"]["inputs"]["prompt"] = subject.get(
            "main_entity", kwargs.get("subject_description", "")
        )
        
        # Extract lighting style and mood
        lighting = fibo_json.get("lighting", {})
        workflow["nodes"]["1"]["inputs"]["lighting_style"] = lighting.get(
            "lighting_style", kwargs.get("lighting_style", "dramatic")
        )
        
        environment = fibo_json.get("environment", {})
        workflow["nodes"]["1"]["inputs"]["atmosphere"] = environment.get(
            "atmosphere", kwargs.get("atmosphere", "cinematic")
        )
        workflow["nodes"]["1"]["inputs"]["mood"] = subject.get(
            "mood", kwargs.get("mood", "dramatic")
        )
        
        # Style prompt
        workflow["nodes"]["4"]["inputs"]["style_prompt"] = kwargs.get(
            "style_prompt", "cinematic lighting"
        )
        
        # Seed
        if "camera" in fibo_json and "seed" in fibo_json["camera"]:
            workflow["nodes"]["7"]["inputs"]["seed"] = fibo_json["camera"]["seed"]
        
        return workflow
    
    def _fill_hybrid(
        self,
        workflow: Dict[str, Any],
        fibo_json: Dict[str, Any],
        background_image: str,
        foreground_subject: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Fill hybrid FIBO + LBM workflow"""
        # Fill LBM parts
        workflow = self._fill_lbm_relighting(
            workflow, fibo_json, background_image, foreground_subject, **kwargs
        )
        
        # Node 6: FIBO lighting JSON
        if "lighting" in fibo_json:
            workflow["nodes"]["6"]["inputs"]["fibo_json"] = json.dumps(
                fibo_json["lighting"]
            )
        
        return workflow
    
    def _fibo_json_to_prompt(self, fibo_json: Dict[str, Any]) -> str:
        """Convert FIBO JSON to comprehensive text prompt (~1000 words)"""
        parts = []
        
        # Subject
        subject = fibo_json.get("subject", {})
        if "main_entity" in subject:
            parts.append(f"Subject: {subject['main_entity']}")
        if "attributes" in subject:
            if isinstance(subject["attributes"], list):
                parts.append(f"Attributes: {', '.join(subject['attributes'])}")
            else:
                parts.append(f"Attributes: {subject['attributes']}")
        if "action" in subject:
            parts.append(f"Action: {subject['action']}")
        
        # Environment
        environment = fibo_json.get("environment", {})
        if "setting" in environment:
            parts.append(f"Setting: {environment['setting']}")
        if "atmosphere" in environment:
            parts.append(f"Atmosphere: {environment['atmosphere']}")
        
        # Camera
        camera = fibo_json.get("camera", {})
        if "shot_type" in camera:
            parts.append(f"Shot: {camera['shot_type']}")
        if "camera_angle" in camera:
            parts.append(f"Angle: {camera['camera_angle']}")
        if "lens_type" in camera:
            parts.append(f"Lens: {camera['lens_type']}")
        if "aperture" in camera:
            parts.append(f"Aperture: {camera['aperture']}")
        
        # Lighting
        lighting = fibo_json.get("lighting", {})
        lighting_desc = []
        for light_name, light_data in lighting.items():
            if isinstance(light_data, dict) and light_data.get("enabled", True):
                desc = f"{light_name}: "
                if "direction" in light_data:
                    desc += f"{light_data['direction']}, "
                if "intensity" in light_data:
                    desc += f"{light_data['intensity']*100:.0f}% intensity, "
                if "color_temperature" in light_data:
                    desc += f"{light_data['color_temperature']}K, "
                if "softness" in light_data:
                    soft = "soft" if light_data['softness'] > 0.6 else "hard" if light_data['softness'] < 0.3 else "medium"
                    desc += f"{soft} quality"
                lighting_desc.append(desc)
        
        if lighting_desc:
            parts.append(f"Lighting: {'; '.join(lighting_desc)}")
        
        # Style
        if "artistic_style" in fibo_json:
            parts.append(f"Style: {fibo_json['artistic_style']}")
        
        # Build comprehensive prompt
        prompt = ". ".join(parts)
        
        # Add professional quality descriptors
        prompt += ". Professional photography, high quality, sharp focus, expert lighting, studio quality, magazine editorial standard, photorealistic, detailed, commercial grade."
        
        return prompt
    
    def _apply_refinement(
        self,
        existing_json: Dict[str, Any],
        instruction: str,
        locked_fields: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Apply refinement instruction to FIBO JSON"""
        locked = set(locked_fields or [])
        refined = existing_json.copy()
        
        instruction_lower = instruction.lower()
        
        # Lighting refinements
        if "lighting" not in locked and "lighting" in refined:
            lighting = refined["lighting"]
            
            # Backlit
            if "backlit" in instruction_lower or "back light" in instruction_lower:
                if "rim_light" not in lighting:
                    lighting["rim_light"] = {
                        "type": "area",
                        "direction": "behind",
                        "intensity": 0.8,
                        "color_temperature": 5600,
                        "softness": 0.3,
                        "enabled": True
                    }
                else:
                    lighting["rim_light"]["intensity"] = 0.8
                    lighting["rim_light"]["enabled"] = True
            
            # Increase contrast
            if "contrast" in instruction_lower and "increase" in instruction_lower:
                if "key_light" in lighting:
                    lighting["key_light"]["intensity"] = min(
                        lighting["key_light"].get("intensity", 0.8) * 1.3, 1.0
                    )
                if "fill_light" in lighting:
                    lighting["fill_light"]["intensity"] = max(
                        lighting["fill_light"].get("intensity", 0.3) * 0.7, 0.1
                    )
            
            # Warmer/cooler
            if "warmer" in instruction_lower:
                for light_name, light_data in lighting.items():
                    if isinstance(light_data, dict) and "color_temperature" in light_data:
                        light_data["color_temperature"] = max(
                            light_data["color_temperature"] - 500, 2000
                        )
            elif "cooler" in instruction_lower:
                for light_name, light_data in lighting.items():
                    if isinstance(light_data, dict) and "color_temperature" in light_data:
                        light_data["color_temperature"] = min(
                            light_data["color_temperature"] + 500, 10000
                        )
        
        return refined
    
    def create_refine_workflow(
        self,
        reference_image: str,
        existing_fibo_json: Dict[str, Any],
        refinement_instruction: str,
        locked_fields: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Create refine mode workflow"""
        return self.convert_fibo_to_workflow(
            existing_fibo_json,
            workflow_template="fibo-refine",
            reference_image=reference_image,
            refinement_instruction=refinement_instruction,
            locked_fields=locked_fields or []
        )
    
    def create_lbm_workflow(
        self,
        background_image: str,
        foreground_subject: str,
        lighting_override: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create LBM relighting workflow"""
        fibo_json = {}
        if lighting_override:
            fibo_json["lighting"] = lighting_override
        
        return self.convert_fibo_to_workflow(
            fibo_json,
            workflow_template="lbm-relighting",
            background_image=background_image,
            foreground_subject=foreground_subject
        )


# Example usage
if __name__ == "__main__":
    converter = FIBOToComfyUI()
    
    # Example FIBO JSON
    fibo_json = {
        "subject": {
            "main_entity": "silver wristwatch",
            "attributes": ["polished", "luxury", "professional"],
            "action": "displayed on velvet cushion"
        },
        "lighting": {
            "key_light": {
                "type": "area",
                "direction": "top-left",
                "intensity": 0.9,
                "color_temperature": 5600,
                "softness": 0.7,
                "enabled": True
            },
            "fill_light": {
                "type": "area",
                "direction": "bottom-right",
                "intensity": 0.3,
                "color_temperature": 5000,
                "softness": 0.8,
                "enabled": True
            }
        },
        "camera": {
            "shot_type": "close-up",
            "fov": 55,
            "aperture": "f/2.8",
            "seed": 12345
        },
        "render": {
            "resolution": [2048, 2048],
            "samples": 40
        }
    }
    
    # Convert to workflow
    workflow = converter.convert_fibo_to_workflow(fibo_json)
    
    # Save workflow
    output_path = "generated_workflow.json"
    with open(output_path, 'w') as f:
        json.dump(workflow, f, indent=2)
    
    print(f"Workflow saved to {output_path}")
