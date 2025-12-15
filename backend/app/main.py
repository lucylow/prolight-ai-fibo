"""
ProLight AI Backend - FastAPI Application
Main entry point for the API server.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from datetime import datetime
import logging

from app.core.config import settings
from app.models.schemas import HealthResponse, ErrorResponse
from app.services.fibo_adapter import FIBOAdapter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global FIBO adapter instance
fibo_adapter: FIBOAdapter = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events."""
    global fibo_adapter
    
    # Startup
    logger.info("Starting ProLight AI Backend...")
    fibo_adapter = FIBOAdapter()
    logger.info("FIBO Adapter initialized")
    
    yield
    
    # Shutdown
    logger.info("Shutting down ProLight AI Backend...")
    if fibo_adapter:
        await fibo_adapter.close()
    logger.info("Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# Configure CORS
cors_origins = ["*"] if getattr(settings, "ALLOW_ALL_CORS", False) else settings.CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Health Check Endpoint
# ============================================================================

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION,
        timestamp=datetime.utcnow().isoformat()
    )


# ============================================================================
# Error Handlers
# ============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            status="error",
            code="HTTP_ERROR",
            message=exc.detail
        ).dict()
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            status="error",
            code="INTERNAL_ERROR",
            message="An unexpected error occurred"
        ).dict()
    )


# ============================================================================
# Root Endpoint
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
        "health": "/api/health"
    }


# ============================================================================
# Import Routes
# ============================================================================

# Import route modules
from app.api import generate, presets, history, batch, analyze, deploy_hash

# Include routers
app.include_router(generate.router, prefix=settings.API_PREFIX, tags=["Generate"])
app.include_router(presets.router, prefix=settings.API_PREFIX, tags=["Presets"])
app.include_router(history.router, prefix=settings.API_PREFIX, tags=["History"])
app.include_router(batch.router, prefix=settings.API_PREFIX, tags=["Batch"])
app.include_router(analyze.router, prefix=settings.API_PREFIX, tags=["Analysis"])
app.include_router(deploy_hash.router, prefix="/internal", tags=["Internal"])


# ============================================================================
# Startup Logging
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Log startup information."""
    logger.info(f"ProLight AI {settings.APP_VERSION} started")
    logger.info(f"FIBO API: {settings.FIBO_API_URL}")
    logger.info(f"Mock FIBO: {settings.USE_MOCK_FIBO}")
    logger.info(f"CORS Origins: {settings.CORS_ORIGINS}")


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
        log_level="info"
    )
