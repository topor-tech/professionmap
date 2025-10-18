from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings using Pydantic BaseSettings."""

    # Application settings
    app_name: str = Field(default="ProfessionMap ATS", description="Application name")
    app_version: str = Field(default="0.1.0", description="Application version")
    environment: str = Field(default="local", description="Environment (local, prod)")

    # Database settings
    database_url: str = Field(
        default="postgresql://ats:ats@localhost:5432/professionmap_ats",
        description="Database connection URL",
    )

    # Security settings
    jwt_secret_key: str = Field(
        default="your-secret-key-change-in-production",
        description="Secret key for JWT tokens and encryption",
    )
    access_token_expire_minutes: int = Field(
        default=30, description="Access token expiration time in minutes"
    )
    refresh_token_expire_days: int = Field(
        default=7, description="Refresh token expiration time in days"
    )
    algorithm: str = Field(default="HS256", description="JWT algorithm")

    # CORS settings
    cors_origins: list[str] = Field(
        default=[
            "https://ats.professionmap.ru",
            "https://professionmap.ru",
        ],
        description="Allowed CORS origins",
    )
    
    # Development CORS settings
    cors_origins_dev: list[str] = Field(
        default=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        description="Development CORS origins",
    )

    superuser_email: str = Field(
        default="admin@professionmap.ru",
        description="Superuser email",
    )
    superuser_password: str = Field(
        default="admin",
        description="Superuser password",
    )
    
    # Cookie settings
    jwt_cookie_name: str = Field(
        default="ats_access_token",
        description="Name of the JWT cookie",
    )
    
    # Development settings
    is_development: bool = Field(
        default=True,
        description="Whether running in development mode",
    )
    
    # Sentry settings
    sentry_dsn: str = Field(
        default="https://db3f49e4536196db818fe565d27b8450@sentry.topor.tech/3",
        description="Sentry DSN for error tracking",
    )
    sentry_environment: str = Field(
        default="development",
        description="Sentry environment name",
    )
    

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


# Create a global settings instance
settings = Settings()
