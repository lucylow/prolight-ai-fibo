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
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "prolight"
    POSTGRES_PASSWORD: str = "prolight"
    POSTGRES_DB: str = "prolight"
    REDIS_URL: str = "redis://localhost:6379/0"
    
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
    STRIPE_CONNECT_SECRET: Optional[str] = None  # For marketplace creator payouts
    STRIPE_PLATFORM_FEE_PERCENT: float = 0.20  # 20% platform fee
    FRONTEND_URL: str = "http://localhost:5173"
    USE_MOCK_STRIPE: bool = True  # Use mock data when Stripe keys not configured
    
    # Billing Plans
    FREE_PLAN_CREDITS: int = 10
    PRO_PLAN_PRICE: int = 2900  # $29 in cents
    PRO_PLAN_CREDITS: int = 500
    ENTERPRISE_PLAN_PRICE: int = 9900  # $99 in cents
    ENTERPRISE_PLAN_CREDITS: int = -1  # -1 means unlimited
    
    # JWT Configuration
    JWT_SECRET: str = "dev-secret-change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    
    # MCP (Model Context Protocol) Configuration
    ANTHROPIC_API_KEY: Optional[str] = None
    BRIA_MCP_URL: str = "https://mcp.prod.bria-api.com/mcp/sse"
    BRIA_AUTH_TOKEN: Optional[str] = None  # OAuth-based bearer token for MCP
    PROLIGHT_MAX_COST_USD: float = 1.00  # Maximum cost per agent run
    
    # Marketplace Configuration
    MARKETPLACE_ENABLED: bool = True
    MARKETPLACE_MIN_PRICE: float = 2.00
    MARKETPLACE_MAX_PRICE: float = 1000.00
    MARKETPLACE_REVIEW_REQUIRED: bool = True  # Admin must approve listings
    
    # Admin Configuration
    ADMIN_EMAILS: list = []  # List of admin emails (loaded from env)
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
