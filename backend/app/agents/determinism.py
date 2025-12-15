"""
Determinism locking utility for reproducible agent runs
"""
import hashlib
import json
from typing import Dict, Any


def compute_prompt_hash(obj: Dict[str, Any]) -> str:
    """Compute stable hash of prompt/context for determinism tracking"""
    stable = json.dumps(obj, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(stable.encode("utf-8")).hexdigest()


def lock_run_seed(plan: Dict[str, Any], seed: int, model_version: str) -> Dict[str, Any]:
    """Lock a plan with determinism metadata (seed, prompt_hash, model_version)"""
    plan.setdefault("determinism", {})
    plan["determinism"].update({
        "seed": seed,
        "prompt_hash": compute_prompt_hash(plan),
        "model_version": model_version,
        "locked": True
    })
    return plan

