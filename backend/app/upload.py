"""Image upload helpers for the Office Closet backend.

Only ``image/jpeg`` and ``image/png`` are accepted. The declared upload size is
checked against ``UPLOAD_MAX_MB`` *before* the body is buffered, and files are
written to disk under randomly generated names so no user-controlled path
component ever reaches the filesystem.
"""

from __future__ import annotations

import secrets
from pathlib import Path

from fastapi import HTTPException, UploadFile

from .config import settings

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png"}

_EXTENSIONS = {"image/jpeg": ".jpg", "image/png": ".png"}


def max_upload_bytes() -> int:
    """The upload size limit in bytes, derived from ``UPLOAD_MAX_MB``."""
    return settings.upload_max_mb * 1024 * 1024


def check_content_length(content_length: str | None) -> None:
    """Reject a request whose declared ``Content-Length`` exceeds the limit.

    This runs before the request body is buffered, so oversized uploads are
    rejected with 413 without reading their payload into memory.
    """
    if content_length is None:
        return
    try:
        size = int(content_length)
    except ValueError:
        return
    if size > max_upload_bytes():
        raise HTTPException(
            status_code=413,
            detail=f"Upload exceeds the maximum size of {settings.upload_max_mb} MB",
        )


def save_image(upload: UploadFile | None) -> str | None:
    """Validate an uploaded image and persist it, returning the stored filename.

    Returns ``None`` when no image was supplied. Raises 415 for a disallowed
    MIME type and 413 when the declared or actual size exceeds the limit.
    """
    if upload is None:
        return None

    content_type = (upload.content_type or "").split(";")[0].strip().lower()
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Only image/jpeg and image/png uploads are allowed",
        )

    limit = max_upload_bytes()
    if upload.size is not None and upload.size > limit:
        raise HTTPException(
            status_code=413,
            detail=f"Upload exceeds the maximum size of {settings.upload_max_mb} MB",
        )

    data = upload.file.read()
    if len(data) > limit:
        raise HTTPException(
            status_code=413,
            detail=f"Upload exceeds the maximum size of {settings.upload_max_mb} MB",
        )

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    filename = secrets.token_hex(16) + _EXTENSIONS[content_type]
    (upload_dir / filename).write_bytes(data)
    return filename


def image_media_type(filename: str) -> str:
    """Return the media type for a stored image based on its extension."""
    return "image/jpeg" if Path(filename).suffix.lower() == ".jpg" else "image/png"
