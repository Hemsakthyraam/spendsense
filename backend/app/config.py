import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

def reload_env():
    """Reload environment variables from backend/.env or root .env dynamically."""
    backend_env = Path(__file__).resolve().parent.parent / ".env"
    root_env = Path(__file__).resolve().parent.parent.parent / ".env"
    if backend_env.exists():
        load_dotenv(dotenv_path=backend_env, override=True)
    if root_env.exists():
        load_dotenv(dotenv_path=root_env, override=True)

# Initial load
reload_env()

class Settings(BaseModel):
    # App Settings
    PROJECT_NAME: str = "SpendSense — Personal Expense Anomaly Detector"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security / JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "spendsense_cppe_super_secure_jwt_secret_key_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) # 24 hours
    
    # Database
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", str(Path(__file__).resolve().parent.parent / "spendsense.db"))
    
    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    
    # File Limits
    MAX_CSV_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB

    @property
    def AWS_ACCESS_KEY_ID(self) -> str:
        reload_env()
        return os.getenv("AWS_ACCESS_KEY_ID", "").strip()

    @property
    def AWS_SECRET_ACCESS_KEY(self) -> str:
        reload_env()
        return os.getenv("AWS_SECRET_ACCESS_KEY", "").strip()

    @property
    def AWS_REGION(self) -> str:
        reload_env()
        return os.getenv("AWS_REGION", "us-east-1").strip()

    @property
    def AWS_S3_BUCKET(self) -> str:
        reload_env()
        return os.getenv("AWS_S3_BUCKET", "").strip()

    @property
    def is_s3_configured(self) -> bool:
        return bool(self.AWS_ACCESS_KEY_ID and self.AWS_SECRET_ACCESS_KEY and self.AWS_S3_BUCKET)

settings = Settings()
