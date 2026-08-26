from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import schemas
from ..db import get_db

router = APIRouter(tags=["wardrobe"])


@router.get("/api/wardrobe/categories", response_model=schemas.CategoriesOut)
def list_categories() -> schemas.CategoriesOut:
    raise HTTPException(status_code=501, detail="wardrobe ticket implements this")


@router.get("/api/wardrobe/items", response_model=list[schemas.ItemOut])
def list_items(category: str | None = None, db: Session = Depends(get_db)) -> list[schemas.ItemOut]:
    raise HTTPException(status_code=501, detail="wardrobe ticket implements this")


@router.post("/api/wardrobe/items", status_code=201, response_model=schemas.ItemOut)
def create_item(
    name: str = Form(...),
    category: str = Form(...),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
) -> schemas.ItemOut:
    raise HTTPException(status_code=501, detail="wardrobe ticket implements this")


@router.put("/api/wardrobe/items/{item_id}", response_model=schemas.ItemOut)
def update_item(
    item_id: int,
    name: str | None = Form(None),
    category: str | None = Form(None),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
) -> schemas.ItemOut:
    raise HTTPException(status_code=501, detail="wardrobe ticket implements this")


@router.delete("/api/wardrobe/items/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db)) -> None:
    raise HTTPException(status_code=501, detail="wardrobe ticket implements this")


@router.get("/api/wardrobe/items/{item_id}/image")
def get_item_image(item_id: int, db: Session = Depends(get_db)) -> None:
    raise HTTPException(status_code=501, detail="wardrobe ticket implements this")
