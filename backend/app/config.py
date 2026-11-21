import os
from pathlib import Path
from pydantic_settings import BaseSettings

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

if os.getenv("VERCEL"):
    import shutil
    tmp_dir = Path("/tmp")
    tmp_db = tmp_dir / "evaluation.db"
    src_db = DATA_DIR / "evaluation.db"
    if not tmp_db.exists() and src_db.exists():
        shutil.copy2(src_db, tmp_db)
    DEFAULT_DB_PATH = tmp_db
    DEFAULT_DATABASE_URL = f"sqlite:///{DEFAULT_DB_PATH}"
else:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    DEFAULT_DB_PATH = DATA_DIR / "evaluation.db"
    DEFAULT_DATABASE_URL = f"sqlite:///{DEFAULT_DB_PATH}"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Comparative LLM Evaluation & Analytics Platform"
    PROJECT_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)
    DB_PATH: Path = DEFAULT_DB_PATH
    CORS_ORIGINS: list[str] = ["*"]
    
    class Config:
        case_sensitive = True

settings = Settings()
