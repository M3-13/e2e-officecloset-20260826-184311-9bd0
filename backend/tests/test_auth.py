from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session", autouse=True)
def _set_env(tmp_path_factory) -> None:
    db_path = tmp_path_factory.mktemp("officecloset_auth") / "test.db"
    os.environ["DATABASE_URL"] = "sqlite:///" + str(db_path).replace("\\", "/")
    os.environ["JWT_SECRET"] = "test-secret-not-for-production"
    os.environ["UPLOAD_DIR"] = str(tmp_path_factory.mktemp("uploads"))


@pytest.fixture()
def client(_set_env):
    from app.ratelimit import reset_rate_limit

    reset_rate_limit()
    from app.main import app

    with TestClient(app) as c:
        yield c


def _register(client: TestClient, username: str, password: str = "s3cret-pw"):
    return client.post("/api/auth/register", json={"username": username, "password": password})


def _login(client: TestClient, username: str, password: str = "s3cret-pw"):
    return client.post("/api/auth/login", json={"username": username, "password": password})


def test_register_creates_user(client) -> None:
    resp = _register(client, "reg_user_1")
    assert resp.status_code == 201
    body = resp.json()
    assert body["username"] == "reg_user_1"
    assert "id" in body
    assert "password" not in body


def test_register_duplicate_returns_409(client) -> None:
    assert _register(client, "dup_user").status_code == 201
    assert _register(client, "dup_user").status_code == 409


def test_register_invalid_returns_422(client) -> None:
    assert client.post("/api/auth/register", json={"username": "onlyname"}).status_code == 422


def test_login_returns_token(client) -> None:
    _register(client, "login_user")
    resp = _login(client, "login_user")
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_wrong_password_returns_401(client) -> None:
    _register(client, "wp_user")
    assert _login(client, "wp_user", "wrong").status_code == 401


def test_login_unknown_user_returns_401(client) -> None:
    assert _login(client, "ghost").status_code == 401


def test_rate_limit_returns_429(client) -> None:
    for i in range(10):
        assert _register(client, f"rl_user_{i}").status_code == 201
    assert _register(client, "rl_user_overflow").status_code == 429
    assert _login(client, "anyone").status_code == 429


def test_delete_account_removes_data(client) -> None:
    from sqlalchemy import select

    from app.db import SessionLocal
    from app.models import ClothingItem, Outfit, OutfitItem, User

    resp = _register(client, "del_user")
    assert resp.status_code == 201
    user_id = resp.json()["id"]
    token = _login(client, "del_user").json()["access_token"]
    upload_dir = os.environ["UPLOAD_DIR"]
    image_filename = "a1b2c3d4e5f6.jpg"

    db = SessionLocal()
    try:
        item = ClothingItem(
            name="Shirt",
            category="oberteile",
            image_url=f"/api/wardrobe/items/{user_id}/image",
            image_filename=image_filename,
            owner_id=user_id,
        )
        db.add(item)
        db.commit()
        db.refresh(item)

        image_path = os.path.join(upload_dir, image_filename)
        with open(image_path, "wb") as f:
            f.write(b"fake-image")

        outfit = Outfit(name="Look", owner_id=user_id)
        db.add(outfit)
        db.commit()
        db.refresh(outfit)
        outfit_id = outfit.id
        db.add(OutfitItem(outfit_id=outfit_id, clothing_item_id=item.id))
        db.commit()
    finally:
        db.close()

    assert os.path.exists(image_path)

    headers = {"Authorization": f"Bearer {token}"}
    assert client.delete("/api/users/me", headers=headers).status_code == 204
    assert not os.path.exists(image_path)

    db = SessionLocal()
    try:
        assert db.execute(select(User).where(User.id == user_id)).scalar_one_or_none() is None
        assert (
            db.execute(
                select(ClothingItem).where(ClothingItem.owner_id == user_id)
            ).scalar_one_or_none()
            is None
        )
        assert (
            db.execute(select(Outfit).where(Outfit.owner_id == user_id)).scalar_one_or_none()
            is None
        )
        assert (
            db.execute(
                select(OutfitItem).where(OutfitItem.outfit_id == outfit_id)
            ).scalar_one_or_none()
            is None
        )
    finally:
        db.close()

    assert client.delete("/api/users/me", headers=headers).status_code == 401


def test_delete_account_requires_auth(client) -> None:
    assert client.delete("/api/users/me").status_code == 401
