"""
Configuration management for ProLight AI backend.
Loads environment variables and provides centralized configuration.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "ProLight AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # API Configuration
    API_PREFIX: str = "/api"
    API_TITLE: str = "ProLight AI API"
    API_DESCRIPTION: str = "Professional lighting simulator powered by FIBO"
    
    # FIBO Configuration
    FIBO_API_URL: str = "https://api.bria.ai/v1/models/fibo"
    FIBO_API_KEY: Optional[str] = None
    BRIA_API_TOKEN: Optional[str] = None  # For Bria Product Shot Editing APIs
    BRIA_API_KEY: Optional[str] = None  # Alternative name
    USE_MOCK_FIBO: bool = True
    
    # Gemini Configuration (for natural language processing)
    GEMINI_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None  # Alternative name for Gemini API key
    
    # fal.ai Configuration (alternative cloud API for FIBO)
    FAL_KEY: Optional[str] = None
    FAL_API_KEY: Optional[str] = None  # Alternative name
    
    # Database
    DATABASE_URL: str = "sqlite:///./prolight.db"
    
    # CORS
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000", "http://localhost:8000"]
    
    # Image Generation
    MAX_IMAGE_RESOLUTION: int = 4096
    DEFAULT_IMAGE_RESOLUTION: int = 2048
    COST_PER_GENERATION: float = 0.04
    
    # Rendering
    DEFAULT_STEPS: int = 40
    DEFAULT_GUIDANCE_SCALE: float = 7.5
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True
    
    # Stripe Configuration
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    FRONTEND_URL: str = "http://localhost:5173"
    USE_MOCK_STRIPE: bool = True  # Use mock data when Stripe keys not configured
    
    # JWT Configuration
    JWT_SECRET: str = "dev-secret-change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    
    # MCP (Model Context Protocol) Configuration
    ANTHROPIC_API_KEY: Optional[str] = None
    BRIA_MCP_URL: str = "https://mcp.prod.bria-api.com/mcp/sse"
    BRIA_AUTH_TOKEN: Optional[str] = None  # OAuth-based bearer token for MCP
    PROLIGHT_MAX_COST_USD: float = 1.00  # Maximum cost per agent run
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
