"""
Small internal endpoint to help detect which backend version is running.
Useful when debugging stale frontend deployments or cache issues.
"""

import os
from fastapi import APIRouter

router = APIRouter()


@router.get("/deploy-hash")
def get_deploy_hash():
    """
    Report a simple deploy hash / environment identifier.

    This is intentionally minimal and safe: it only exposes a short identifier
    derived from environment variables (if present).
    """
    return {
        "deploy_hash": os.environ.get("DEPLOY_HASH", "dev-local"),
        "env": os.environ.get("ENV", "local"),
    }


