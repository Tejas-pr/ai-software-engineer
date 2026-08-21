from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = ""
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    FRONTEND_URL: str = "http://localhost:5173"

    # Add the Auth settings
    JWT_SECRET: str = "your_super_secret_jwt_key_here"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = (
        "http://localhost:8000/api/v1/accounts/auth/github/callback"
    )

    # Gemini LLM Settings
    GEMINI_API_KEY: str = ""
    GEMINI_MODELS: list[str] = [
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
    ]

    # Ollama Local LLM Settings
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODELS: list[str] = ["qwen2.5-coder:7b", "deepseek-r1:8b"]
    OLLAMA_CODE_MODEL: str = "qwen2.5-coder:7b"
    OLLAMA_REASONING_MODEL: str = "deepseek-r1:8b"

    # extra="ignore": .env already carries settings for later phases (Gemini,
    # Ollama, ...) that this Settings class doesn't declare yet.
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    @model_validator(mode="after")
    def validate_production_config(self) -> "Settings":
        if self.ENVIRONMENT.lower() == "production":
            if (
                "localhost" in self.GITHUB_REDIRECT_URI
                or "127.0.0.1" in self.GITHUB_REDIRECT_URI
            ):
                raise ValueError(
                    f"GITHUB_REDIRECT_URI cannot point to localhost/127.0.0.1 in production: {self.GITHUB_REDIRECT_URI}"
                )
            if "localhost" in self.FRONTEND_URL or "127.0.0.1" in self.FRONTEND_URL:
                raise ValueError(
                    f"FRONTEND_URL cannot point to localhost/127.0.0.1 in production: {self.FRONTEND_URL}"
                )
            if self.JWT_SECRET == "your_super_secret_jwt_key_here":
                raise ValueError("JWT_SECRET must be changed in production!")
        return self


settings = Settings()
