from __future__ import annotations

import os
from contextlib import suppress

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .. import schemas
from ..config import settings
from ..db import get_db
from ..models import ClothingItem, Outfit, OutfitItem, User
from ..ratelimit import rate_limit
from ..security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter(tags=["auth"])


@router.post(
    "/api/auth/register",
    status_code=201,
    response_model=schemas.UserOut,
    dependencies=[Depends(rate_limit)],
)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)) -> schemas.UserOut:
    existing = db.execute(
        select(User).where(User.username == payload.username)
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Username already registered")
    user = User(username=payload.username, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post(
    "/api/auth/login",
    response_model=schemas.Token,
    dependencies=[Depends(rate_limit)],
)
def login(payload: schemas.UserCreate, db: Session = Depends(get_db)) -> schemas.Token:
    user = db.execute(select(User).where(User.username == payload.username)).scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    return schemas.Token(access_token=create_access_token({"sub": user.username}))


@router.delete("/api/users/me", status_code=204)
def delete_account(request: Request, db: Session = Depends(get_db)) -> None:
    user = get_current_user(request, db)
    user_id = user.id
    items = db.execute(select(ClothingItem).where(ClothingItem.owner_id == user_id)).scalars().all()
    _delete_image_files(items)
    db.execute(
        delete(OutfitItem).where(
            OutfitItem.outfit_id.in_(select(Outfit.id).where(Outfit.owner_id == user_id))
        )
    )
    db.execute(delete(Outfit).where(Outfit.owner_id == user_id))
    db.execute(delete(ClothingItem).where(ClothingItem.owner_id == user_id))
    db.execute(delete(User).where(User.id == user_id))
    db.commit()


def _delete_image_files(items: list[ClothingItem]) -> None:
    upload_dir = settings.upload_dir
    for item in items:
        filename = item.image_filename
        if not filename:
            continue
        path = os.path.join(upload_dir, os.path.basename(filename))
        with suppress(FileNotFoundError):
            os.remove(path)
