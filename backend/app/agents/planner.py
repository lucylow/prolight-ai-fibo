"""
Planner Agent - Creates structured plans from user intents.
Uses LLM to generate step-by-step execution plans.
"""

import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)


class PlannerAsync:
    """
    Planner agent that creates execution plans from user intents.
    Never calls side-effecting APIs - only generates plans.
    """
    
    def __init__(self, llm_client=None):
        """
        Initialize planner.
        
        Args:
            llm_client: Optional LLM client for plan generation (if None, uses rule-based)
        """
        self.llm_client = llm_client
    
    async def plan(
        self,
        intent: str,
        input_asset_urls: Optional[List[str]] = None,
        constraints: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create execution plan from intent.
        
        Args:
            intent: User intent (e.g., "edit_product_shot", "generate_ads")
            input_asset_urls: Input asset URLs
            constraints: User constraints (cost limits, formats, etc.)
            
        Returns:
            Dict with plan structure:
            {
                "steps": [
                    {
                        "step_id": "step_1",
                        "op": "image_onboard",
                        "params": {...},
                        "depends_on": []
                    },
                    ...
                ],
                "estimated_cost_usd": 0.50,
                "estimated_duration_seconds": 120
            }
        """
        logger.info(f"Planning for intent: {intent}")
        
        # Rule-based planning (can be enhanced with LLM)
        plan = self._create_plan_from_intent(intent, input_asset_urls, constraints)
        
        return plan
    
    def _create_plan_from_intent(
        self,
        intent: str,
        input_asset_urls: Optional[List[str]],
        constraints: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Create plan from intent using rule-based logic.
        Can be replaced with LLM-based planning.
        """
        steps = []
        estimated_cost = 0.0
        estimated_duration = 0
        
        if intent == "image_onboard":
            # Simple onboarding
            if input_asset_urls:
                steps.append({
                    "step_id": "step_1",
                    "op": "image_onboard",
                    "params": {
                        "image_url": input_asset_urls[0],
                        "metadata": constraints.get("metadata", {}) if constraints else {}
                    },
                    "depends_on": []
                })
                estimated_cost = 0.01
                estimated_duration = 5
        
        elif intent == "edit_product_shot":
            # Product shot editing workflow
            if input_asset_urls:
                # Step 1: Onboard if needed
                steps.append({
                    "step_id": "step_1",
                    "op": "image_onboard",
                    "params": {
                        "image_url": input_asset_urls[0],
                        "metadata": {"type": "product_shot"}
                    },
                    "depends_on": []
                })
                estimated_cost += 0.01
                estimated_duration += 5
                
                # Step 2: Remove background
                steps.append({
                    "step_id": "step_2",
                    "op": "image_edit",
                    "params": {
                        "operation": "remove_background",
                        "image_url": input_asset_urls[0]
                    },
                    "depends_on": ["step_1"]
                })
                estimated_cost += 0.05
                estimated_duration += 10
                
                # Step 3: Generate AOVs if requested
                if constraints and constraints.get("generate_aovs", False):
                    steps.append({
                        "step_id": "step_3",
                        "op": "product_shot_edit",
                        "params": {
                            "image_url": input_asset_urls[0],
                            "generate_aovs": True,
                            "lighting_setup": constraints.get("lighting_setup"),
                            "background": constraints.get("background")
                        },
                        "depends_on": ["step_2"]
                    })
                    estimated_cost += 0.20
                    estimated_duration += 30
        
        elif intent == "generate_ads":
            # Ads generation workflow
            num_variants = constraints.get("num_variants", 1) if constraints else 1
            template_id = constraints.get("template_id") if constraints else None
            brand_id = constraints.get("brand_id") if constraints else None
            
            steps.append({
                "step_id": "step_1",
                "op": "ads_generate",
                "params": {
                    "template_id": template_id,
                    "brand_id": brand_id,
                    "product_name": constraints.get("product_name", "") if constraints else "",
                    "campaign_type": constraints.get("campaign_type", "social") if constraints else "social",
                    "formats": constraints.get("formats", ["facebook"]) if constraints else ["facebook"],
                    "num_variants": num_variants
                },
                "depends_on": []
            })
            estimated_cost = 0.10 * num_variants
            estimated_duration = 20 * num_variants
        
        elif intent == "video_edit":
            # Video editing workflow
            if input_asset_urls:
                operation = constraints.get("operation", "upscale") if constraints else "upscale"
                steps.append({
                    "step_id": "step_1",
                    "op": "video_edit",
                    "params": {
                        "video_url": input_asset_urls[0],
                        "operation": operation,
                        **(constraints.get("params", {}) if constraints else {})
                    },
                    "depends_on": []
                })
                estimated_cost = 0.50  # Video operations are more expensive
                estimated_duration = 60
        
        elif intent == "tailored_generation":
            # Tailored generation workflow
            model_id = constraints.get("model_id") if constraints else None
            if not model_id:
                raise ValueError("model_id required for tailored_generation")
            
            steps.append({
                "step_id": "step_1",
                "op": "tailored_generate",
                "params": {
                    "model_id": model_id,
                    "prompt": constraints.get("prompt", "") if constraints else "",
                    "structured_prompt": constraints.get("structured_prompt") if constraints else None,
                    "num_results": constraints.get("num_results", 1) if constraints else 1
                },
                "depends_on": []
            })
            estimated_cost = 0.15
            estimated_duration = 30
        
        else:
            # Generic image generation
            steps.append({
                "step_id": "step_1",
                "op": "image_generate",
                "params": {
                    "prompt": constraints.get("prompt", "") if constraints else "",
                    "structured_prompt": constraints.get("structured_prompt") if constraints else None,
                    "num_results": constraints.get("num_results", 1) if constraints else 1
                },
                "depends_on": []
            })
            estimated_cost = 0.10
            estimated_duration = 20
        
        return {
            "steps": steps,
            "estimated_cost_usd": estimated_cost,
            "estimated_duration_seconds": estimated_duration,
            "created_at": datetime.utcnow().isoformat()
        }

