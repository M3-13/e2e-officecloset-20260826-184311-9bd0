from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas
from ..db import get_db

router = APIRouter(tags=["auth"])


@router.post("/api/auth/register", status_code=201, response_model=schemas.UserOut)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)) -> schemas.UserOut:
    raise HTTPException(status_code=501, detail="registration ticket implements this")


@router.post("/api/auth/login", response_model=schemas.Token)
def login(payload: schemas.UserCreate, db: Session = Depends(get_db)) -> schemas.Token:
    raise HTTPException(status_code=501, detail="login ticket implements this")


@router.delete("/api/users/me", status_code=204)
def delete_account(db: Session = Depends(get_db)) -> None:
    raise HTTPException(status_code=501, detail="account deletion ticket implements this")
