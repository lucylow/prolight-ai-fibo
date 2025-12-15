"""
Executor Agent - Executes plan steps using Bria tools.
Only agent that calls side-effecting APIs.
"""

import logging
import uuid
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime
from app.mcp.bria_tools import BriaToolsAsync

logger = logging.getLogger(__name__)


class ExecutorAsync:
    """
    Executor agent that executes plan steps.
    Calls Bria tools and tracks progress.
    """
    
    def __init__(self, bria_tools: BriaToolsAsync, event_hook: Optional[Callable] = None):
        """
        Initialize executor.
        
        Args:
            bria_tools: Bria tools client
            event_hook: Optional callback for publishing events
        """
        self.bria_tools = bria_tools
        self.event_hook = event_hook
    
    async def execute_step(
        self,
        step: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute a single plan step.
        
        Args:
            step: Step to execute
            context: Execution context (previous step results, etc.)
            
        Returns:
            Dict with execution result
        """
        step_id = step.get("step_id", "unknown")
        op = step.get("op")
        params = step.get("params", {})
        
        logger.info(f"Executing step {step_id}: {op}")
        
        # Publish start event
        if self.event_hook:
            await self.event_hook({
                "type": "job_progress",
                "step": "executor",
                "step_id": step_id,
                "message": f"Starting {op}",
                "progress": 0
            })
        
        try:
            # Execute based on operation type
            result = None
            
            if op == "image_onboard":
                result = await self._execute_image_onboard(params, context)
            
            elif op == "image_edit":
                result = await self._execute_image_edit(params, context)
            
            elif op == "image_generate":
                result = await self._execute_image_generate(params, context)
            
            elif op == "video_edit":
                result = await self._execute_video_edit(params, context)
            
            elif op == "tailored_generate":
                result = await self._execute_tailored_generate(params, context)
            
            elif op == "ads_generate":
                result = await self._execute_ads_generate(params, context)
            
            elif op == "product_shot_edit":
                result = await self._execute_product_shot_edit(params, context)
            
            elif op == "status_poll":
                result = await self._execute_status_poll(params, context)
            
            else:
                raise ValueError(f"Unknown operation: {op}")
            
            # Publish completion event
            if self.event_hook:
                await self.event_hook({
                    "type": "job_progress",
                    "step": "executor",
                    "step_id": step_id,
                    "message": f"Completed {op}",
                    "progress": 100,
                    "result": result
                })
            
            return {
                "success": True,
                "step_id": step_id,
                "op": op,
                "result": result,
                "completed_at": datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            logger.error(f"Step {step_id} failed: {e}", exc_info=True)
            
            # Publish error event
            if self.event_hook:
                await self.event_hook({
                    "type": "error",
                    "step": "executor",
                    "step_id": step_id,
                    "message": f"Failed {op}: {str(e)}",
                    "error": str(e)
                })
            
            return {
                "success": False,
                "step_id": step_id,
                "op": op,
                "error": str(e),
                "completed_at": datetime.utcnow().isoformat()
            }
    
    async def _execute_image_onboard(
        self,
        params: Dict[str, Any],
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Execute image onboarding."""
        return await self.bria_tools.image_onboard(
            image_url=params["image_url"],
            metadata=params.get("metadata")
        )
    
    async def _execute_image_edit(
        self,
        params: Dict[str, Any],
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Execute image edit."""
        return await self.bria_tools.image_edit(
            image_url=params["image_url"],
            operation=params["operation"],
            params=params.get("edit_params"),
            sync=params.get("sync", False)
        )
    
    async def _execute_image_generate(
        self,
        params: Dict[str, Any],
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Execute image generation."""
        return await self.bria_tools.image_generate(
            prompt=params.get("prompt"),
            structured_prompt=params.get("structured_prompt"),
            num_results=params.get("num_results", 1),
            sync=params.get("sync", False)
        )
    
    async def _execute_video_edit(
        self,
        params: Dict[str, Any],
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Execute video edit."""
        return await self.bria_tools.video_edit(
            video_url=params["video_url"],
            operation=params["operation"],
            params=params.get("edit_params"),
            sync=params.get("sync", False)
        )
    
    async def _execute_tailored_generate(
        self,
        params: Dict[str, Any],
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Execute tailored generation."""
        return await self.bria_tools.tailored_generate(
            model_id=params["model_id"],
            prompt=params.get("prompt"),
            structured_prompt=params.get("structured_prompt"),
            num_results=params.get("num_results", 1),
            sync=params.get("sync", False)
        )
    
    async def _execute_ads_generate(
        self,
        params: Dict[str, Any],
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Execute ads generation."""
        return await self.bria_tools.ads_generate(
            template_id=params.get("template_id"),
            brand_id=params.get("brand_id"),
            product_name=params.get("product_name", ""),
            campaign_type=params.get("campaign_type", "social"),
            formats=params.get("formats", ["facebook"]),
            num_variants=params.get("num_variants", 1),
            sync=params.get("sync", False)
        )
    
    async def _execute_product_shot_edit(
        self,
        params: Dict[str, Any],
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Execute product shot edit."""
        return await self.bria_tools.product_shot_edit(
            image_url=params["image_url"],
            lighting_setup=params.get("lighting_setup"),
            background=params.get("background"),
            generate_aovs=params.get("generate_aovs", False),
            sync=params.get("sync", False)
        )
    
    async def _execute_status_poll(
        self,
        params: Dict[str, Any],
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Execute status poll."""
        return await self.bria_tools.poll_status(
            request_id=params["request_id"]
        )

