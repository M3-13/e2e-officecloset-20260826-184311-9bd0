from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas
from ..db import get_db

router = APIRouter(tags=["outfits"])


@router.post("/api/outfits", status_code=201, response_model=schemas.OutfitOut)
def create_outfit(
    payload: schemas.OutfitCreate, db: Session = Depends(get_db)
) -> schemas.OutfitOut:
    raise HTTPException(status_code=501, detail="outfits ticket implements this")


@router.get("/api/outfits", response_model=list[schemas.OutfitOut])
def list_outfits(db: Session = Depends(get_db)) -> list[schemas.OutfitOut]:
    raise HTTPException(status_code=501, detail="outfits ticket implements this")


@router.get("/api/outfits/{outfit_id}", response_model=schemas.OutfitOut)
def get_outfit(outfit_id: int, db: Session = Depends(get_db)) -> schemas.OutfitOut:
    raise HTTPException(status_code=501, detail="outfits ticket implements this")


@router.delete("/api/outfits/{outfit_id}", status_code=204)
def delete_outfit(outfit_id: int, db: Session = Depends(get_db)) -> None:
    raise HTTPException(status_code=501, detail="outfits ticket implements this")
