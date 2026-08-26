from __future__ import annotations

from contextlib import suppress
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import schemas
from ..config import settings
from ..db import get_db
from ..models import ClothingItem, User
from ..security import get_current_user
from ..upload import check_content_length, image_media_type, save_image

router = APIRouter(tags=["wardrobe"])

CATEGORIES = ["oberteile", "unterteile", "schuhe", "accessoires"]


def _enforce_request_size(request: Request) -> None:
    check_content_length(request.headers.get("content-length"))


def _get_owned_item(item_id: int, user: User, db: Session) -> ClothingItem:
    item = db.get(ClothingItem, item_id)
    if item is None or item.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


def _image_url(item: ClothingItem) -> str | None:
    if not item.image_url:
        return None
    return f"/api/wardrobe/items/{item.id}/image"


def _item_out(item: ClothingItem) -> schemas.ItemOut:
    return schemas.ItemOut(
        id=item.id,
        name=item.name,
        category=item.category,
        image_url=_image_url(item),
        created_at=item.created_at,
    )


def _image_path(filename: str | None) -> Path | None:
    if not filename:
        return None
    return Path(settings.upload_dir) / Path(filename).name


def _delete_image_file(filename: str | None) -> None:
    path = _image_path(filename)
    if path is not None:
        with suppress(OSError):
            path.unlink(missing_ok=True)


@router.get("/api/wardrobe/categories", response_model=schemas.CategoriesOut)
def list_categories() -> schemas.CategoriesOut:
    return schemas.CategoriesOut(categories=CATEGORIES)


@router.get("/api/wardrobe/items", response_model=list[schemas.ItemOut])
def list_items(
    category: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[schemas.ItemOut]:
    stmt = select(ClothingItem).where(ClothingItem.owner_id == current_user.id)
    if category is not None:
        stmt = stmt.where(ClothingItem.category == category)
    items = db.execute(stmt.order_by(ClothingItem.id)).scalars().all()
    return [_item_out(item) for item in items]


@router.post("/api/wardrobe/items", status_code=201, response_model=schemas.ItemOut)
def create_item(
    name: str = Form(...),
    category: str = Form(...),
    image: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _: None = Depends(_enforce_request_size),
) -> schemas.ItemOut:
    name = name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="name must not be empty")
    if category not in CATEGORIES:
        raise HTTPException(status_code=422, detail=f"Unknown category: {category}")

    filename = save_image(image)
    item = ClothingItem(
        name=name,
        category=category,
        image_url=filename,
        owner_id=current_user.id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _item_out(item)


@router.put("/api/wardrobe/items/{item_id}", response_model=schemas.ItemOut)
def update_item(
    item_id: int,
    name: str | None = Form(None),
    category: str | None = Form(None),
    image: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _: None = Depends(_enforce_request_size),
) -> schemas.ItemOut:
    item = _get_owned_item(item_id, current_user, db)

    if name is not None:
        name = name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="name must not be empty")
        item.name = name
    if category is not None:
        if category not in CATEGORIES:
            raise HTTPException(status_code=422, detail=f"Unknown category: {category}")
        item.category = category
    if image is not None:
        new_filename = save_image(image)
        _delete_image_file(item.image_url)
        item.image_url = new_filename

    db.commit()
    db.refresh(item)
    return _item_out(item)


@router.delete("/api/wardrobe/items/{item_id}", status_code=204)
def delete_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    item = _get_owned_item(item_id, current_user, db)
    _delete_image_file(item.image_url)
    db.delete(item)
    db.commit()


@router.get("/api/wardrobe/items/{item_id}/image")
def get_item_image(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    item = _get_owned_item(item_id, current_user, db)
    path = _image_path(item.image_url)
    if path is None or not path.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path, media_type=image_media_type(item.image_url))
