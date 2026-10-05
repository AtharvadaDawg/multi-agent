import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field, ConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Multi-Agent DevOps Incident Management System"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # LLM Settings
    LLM_PROVIDER: str = Field(default="auto", description="LLM provider: 'gemini', 'openai', 'mock' or 'auto'")
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API key if available")
    OPENAI_API_KEY: str = Field(default="", description="OpenAI API key if available")
    MODEL_NAME: str = Field(default="gemini-1.5-flash", description="Default model name")
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./incidents.db"
    SYNC_DATABASE_URL: str = "sqlite:///./incidents.db"
    
    # Event Bus / Telemetry
    TELEMETRY_INTERVAL_SECONDS: float = 2.0
    ANOMALY_THRESHOLD_SIGMA: float = 2.5
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    
    model_config = ConfigDict(extra="ignore", env_file=".env")

settings = Settings()
