"""
Production-ready settings management for ProLight AI.
Handles environment-based configuration with fail-fast validation.
"""

import os
from typing import Optional, List
from pydantic_settings import BaseSettings
from pydantic import Field, validator


class Settings(BaseSettings):
    """
    Application settings with environment-based secret management.
    Implements fail-fast validation for production deployments.
    """
    
    # Environment
    ENV: str = Field(default="development", description="Environment: development, staging, or production")
    
    # Application
    APP_NAME: str = "ProLight AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # API Configuration
    API_PREFIX: str = "/api"
    API_TITLE: str = "ProLight AI API"
    API_DESCRIPTION: str = "Professional lighting simulator powered by FIBO"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True
    
    # Bria/FIBO Configuration
    BRIA_API_URL: str = "https://engine.prod.bria-api.com/v2"
    BRIA_API_TOKEN: Optional[str] = None
    BRIA_API_TOKEN_STAGING: Optional[str] = None
    BRIA_API_TOKEN_PROD: Optional[str] = None
    USE_MOCK_FIBO: bool = True
    
    # ComfyUI Configuration (optional)
    COMFYUI_URL: Optional[str] = None
    COMFYUI_API_KEY: Optional[str] = None
    
    # MCP Server Configuration (optional)
    MCP_SERVER_URL: Optional[str] = None
    MCP_API_KEY: Optional[str] = None
    
    # Lovable Token (optional)
    LOVABLE_TOKEN: Optional[str] = None
    
    # Gemini Configuration (for VLM processing)
    GEMINI_API_KEY: Optional[str] = None
    
    # Database
    DATABASE_URL: str = "sqlite:///./prolight.db"
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:8000"
    
    # Image Generation
    MAX_IMAGE_RESOLUTION: int = 4096
    DEFAULT_IMAGE_RESOLUTION: int = 2048
    COST_PER_GENERATION: float = 0.04
    
    # Rendering
    DEFAULT_STEPS: int = 40
    DEFAULT_GUIDANCE_SCALE: float = 7.5
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    def bria_token(self) -> str:
        """
        Get Bria API token based on environment.
        Priority: PROD > STAGING > GENERIC
        
        Returns:
            str: The appropriate API token for the current environment
            
        Raises:
            RuntimeError: If no token is available for the current environment
        """
        if self.ENV == "production":
            token = self.BRIA_API_TOKEN_PROD or self.BRIA_API_TOKEN
            if not token:
                raise RuntimeError(
                    "BRIA_API_TOKEN_PROD or BRIA_API_TOKEN must be set for production environment"
                )
            return token
        elif self.ENV == "staging":
            token = self.BRIA_API_TOKEN_STAGING or self.BRIA_API_TOKEN
            if not token:
                raise RuntimeError(
                    "BRIA_API_TOKEN_STAGING or BRIA_API_TOKEN must be set for staging environment"
                )
            return token
        else:  # development
            token = self.BRIA_API_TOKEN
            if not token and not self.USE_MOCK_FIBO:
                raise RuntimeError(
                    "BRIA_API_TOKEN must be set when USE_MOCK_FIBO=false"
                )
            return token or ""
    
    def comfyui_config(self) -> Optional[dict]:
        """
        Get ComfyUI configuration if enabled.
        
        Returns:
            Optional[dict]: ComfyUI config or None if not configured
        """
        if self.COMFYUI_URL and self.COMFYUI_API_KEY:
            return {
                "url": self.COMFYUI_URL,
                "api_key": self.COMFYUI_API_KEY
            }
        return None
    
    def mcp_config(self) -> Optional[dict]:
        """
        Get MCP server configuration if enabled.
        
        Returns:
            Optional[dict]: MCP config or None if not configured
        """
        if self.MCP_SERVER_URL and self.MCP_API_KEY:
            return {
                "url": self.MCP_SERVER_URL,
                "api_key": self.MCP_API_KEY
            }
        return None
    
    def validate_production_secrets(self):
        """
        Validate that all required secrets are present for production.
        Should be called at server startup when ENV=production.
        
        Raises:
            RuntimeError: If required production secrets are missing
        """
        if self.ENV == "production":
            # Validate Bria token
            self.bria_token()
            
            # Add other production validations as needed
            if self.DEBUG:
                raise RuntimeError("DEBUG must be false in production")


# Global settings instance
settings = Settings()
