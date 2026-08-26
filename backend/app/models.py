from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)

    clothing_items: Mapped[list[ClothingItem]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
    outfits: Mapped[list[Outfit]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )


class ClothingItem(Base):
    __tablename__ = "clothing_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    owner: Mapped[User] = relationship(back_populates="clothing_items")


class Outfit(Base):
    __tablename__ = "outfits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, nullable=False)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    owner: Mapped[User] = relationship(back_populates="outfits")
    items: Mapped[list[OutfitItem]] = relationship(
        back_populates="outfit", cascade="all, delete-orphan"
    )


class OutfitItem(Base):
    __tablename__ = "outfit_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    outfit_id: Mapped[int] = mapped_column(ForeignKey("outfits.id"), nullable=False)
    clothing_item_id: Mapped[int] = mapped_column(ForeignKey("clothing_items.id"), nullable=False)

    outfit: Mapped[Outfit] = relationship(back_populates="items")
    clothing_item: Mapped[ClothingItem] = relationship()
