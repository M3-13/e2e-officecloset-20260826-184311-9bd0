"""Application configuration, read lazily from the environment.

Every value is read where it is used (never at import time), so the process can
boot with a working default where one is legitimate and fail with a message that
names the variable where none is.
"""

from __future__ import annotations

import os

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


class Settings:
    @property
    def jwt_secret(self) -> str:
        secret = os.environ.get("JWT_SECRET")
        if not secret:
            raise RuntimeError(
                'JWT_SECRET is not set. Declare it in RUN.json ("generate") '
                "or export it in the environment before starting the API."
            )
        return secret

    @property
    def cors_origin(self) -> str:
        return os.environ.get("CORS_ORIGIN") or "http://localhost:5173"

    @property
    def upload_max_mb(self) -> int:
        raw = os.environ.get("UPLOAD_MAX_MB") or "5"
        try:
            return int(raw)
        except ValueError:
            return 5

    @property
    def upload_dir(self) -> str:
        return os.environ.get("UPLOAD_DIR") or "./uploads"

    @property
    def database_url(self) -> str:
        return os.environ.get("DATABASE_URL") or "sqlite:///./wardrobe.db"


settings = Settings()
