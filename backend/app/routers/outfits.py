from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import schemas
from ..db import get_db
from ..models import ClothingItem, Outfit, OutfitItem, User
from ..security import get_current_user

router = APIRouter(tags=["outfits"])


def _to_outfit(outfit: Outfit) -> schemas.OutfitOut:
    items = [oi.clothing_item for oi in outfit.items]
    return schemas.OutfitOut(
        id=outfit.id,
        name=outfit.name,
        item_ids=[item.id for item in items],
        items=[
            schemas.ItemOut(
                id=item.id,
                name=item.name,
                category=item.category,
                image_url=item.image_url,
                created_at=item.created_at,
            )
            for item in items
        ],
        created_at=outfit.created_at,
    )


@router.post("/api/outfits", status_code=201, response_model=schemas.OutfitOut)
def create_outfit(
    payload: schemas.OutfitCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> schemas.OutfitOut:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="name must not be empty")

    unique_ids = list(dict.fromkeys(payload.item_ids))
    if not unique_ids:
        raise HTTPException(status_code=422, detail="item_ids must not be empty")

    items = (
        db.execute(
            select(ClothingItem).where(
                ClothingItem.id.in_(unique_ids),
                ClothingItem.owner_id == current_user.id,
            )
        )
        .scalars()
        .all()
    )

    if len(items) != len(unique_ids):
        raise HTTPException(
            status_code=422,
            detail="one or more item_ids are invalid or do not belong to you",
        )

    by_id = {item.id: item for item in items}
    ordered_items = [by_id[item_id] for item_id in unique_ids]

    outfit = Outfit(name=name, owner_id=current_user.id)
    outfit.items = [OutfitItem(clothing_item=item) for item in ordered_items]
    db.add(outfit)
    db.commit()
    db.refresh(outfit)
    return _to_outfit(outfit)


@router.get("/api/outfits", response_model=list[schemas.OutfitOut])
def list_outfits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[schemas.OutfitOut]:
    outfits = (
        db.execute(select(Outfit).where(Outfit.owner_id == current_user.id).order_by(Outfit.id))
        .scalars()
        .all()
    )
    return [_to_outfit(outfit) for outfit in outfits]


@router.get("/api/outfits/{outfit_id}", response_model=schemas.OutfitOut)
def get_outfit(
    outfit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> schemas.OutfitOut:
    outfit = db.execute(
        select(Outfit).where(Outfit.id == outfit_id, Outfit.owner_id == current_user.id)
    ).scalar_one_or_none()
    if outfit is None:
        raise HTTPException(status_code=404, detail="outfit not found")
    return _to_outfit(outfit)


@router.delete("/api/outfits/{outfit_id}", status_code=204)
def delete_outfit(
    outfit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    outfit = db.execute(
        select(Outfit).where(Outfit.id == outfit_id, Outfit.owner_id == current_user.id)
    ).scalar_one_or_none()
    if outfit is None:
        raise HTTPException(status_code=404, detail="outfit not found")
    db.delete(outfit)
    db.commit()
