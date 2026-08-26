from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str
    image_url: str | None
    created_at: datetime


class OutfitCreate(BaseModel):
    name: str
    item_ids: list[int]


class OutfitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    item_ids: list[int]
    items: list[ItemOut]
    created_at: datetime


class CategoriesOut(BaseModel):
    categories: list[str]
