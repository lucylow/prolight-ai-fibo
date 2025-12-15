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
    
    # FIBO/Bria Configuration
    FIBO_API_URL: str = "https://engine.prod.bria-api.com/v2"
    FIBO_API_KEY: Optional[str] = None
    BRIA_API_TOKEN: Optional[str] = None  # Preferred over FIBO_API_KEY
    BRIA_API_URL: str = "https://engine.prod.bria-api.com/v2"
    USE_MOCK_FIBO: bool = True
    
    # Gemini Configuration (for natural language processing)
    GEMINI_API_KEY: Optional[str] = None
    
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
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
