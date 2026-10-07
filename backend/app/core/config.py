import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, ConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "SLEUTHOPS MULTI-AGENT DEVOPS SRE SYSTEM"
    VERSION: str = "2.0.0"
    API_PREFIX: str = "/api"
    
    # Telemetry Source Mode: "simulator" or "aws"
    TELEMETRY_SOURCE: str = Field(default="simulator", description="Telemetry mode: 'simulator' (offline mock) or 'aws' (live CloudWatch/EC2)")
    
    # AWS Configuration
    AWS_REGION: str = Field(default="us-west-2", description="Target AWS region")
    AWS_EC2_INSTANCE_ID: str = Field(default="", description="Target AWS EC2 Instance ID to monitor and remediate")
    AWS_CLOUDWATCH_METRIC_PERIOD: int = Field(default=60, description="CloudWatch metric aggregation period in seconds")
    AWS_CPU_THRESHOLD_PERCENT: float = Field(default=80.0, description="CloudWatch CPUUtilization anomaly threshold percentage")
    AWS_CLOUDWATCH_LOG_GROUP: str = Field(default="", description="Optional CloudWatch Logs log group to stream logs from")
    AWS_SSM_DOCUMENT: str = Field(default="AWS-RunShellScript", description="AWS Systems Manager Document for remediation")
    AWS_VERIFICATION_POLL_INTERVAL: float = Field(default=5.0, description="Interval in seconds between recovery verification checks")
    AWS_VERIFICATION_MAX_ATTEMPTS: int = Field(default=12, description="Max verification poll attempts before timing out")
    
    # Optional direct credentials (if not in ~/.aws or IAM role)
    AWS_ACCESS_KEY_ID: Optional[str] = Field(default=None, description="AWS Access Key ID")
    AWS_SECRET_ACCESS_KEY: Optional[str] = Field(default=None, description="AWS Secret Access Key")
    AWS_SESSION_TOKEN: Optional[str] = Field(default=None, description="AWS Session Token")

    # LLM Settings
    LLM_PROVIDER: str = Field(default="auto", description="LLM provider: 'gemini', 'openai', 'openrouter', 'mock' or 'auto'")
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API key if available")
    OPENAI_API_KEY: str = Field(default="", description="OpenAI API key if available")
    OPENROUTER_API_KEY: str = Field(default="", description="OpenRouter API key if available")
    OPENROUTER_BASE_URL: str = Field(default="https://openrouter.ai/api/v1", description="OpenRouter API Base URL")
    MODEL_NAME: str = Field(default="google/gemma-2-9b-it", description="Default model name")
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./incidents.db"
    SYNC_DATABASE_URL: str = "sqlite:///./incidents.db"
    
    # Event Bus / Telemetry
    TELEMETRY_INTERVAL_SECONDS: float = 3.0
    ANOMALY_THRESHOLD_SIGMA: float = 2.5
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    
    model_config = ConfigDict(extra="ignore", env_file=".env")

settings = Settings()
