from __future__ import annotations

import itertools
import os

import pytest

_counter = itertools.count()


def _unique_username(prefix: str = "user") -> str:
    return f"{prefix}_{next(_counter)}"


@pytest.fixture(scope="session", autouse=True)
def _set_env(tmp_path_factory) -> None:
    db_path = tmp_path_factory.mktemp("officecloset_outfits") / "test.db"
    os.environ["DATABASE_URL"] = "sqlite:///" + str(db_path).replace("\\", "/")
    os.environ["JWT_SECRET"] = "test-secret-not-for-production"


@pytest.fixture(scope="session")
def client(_set_env):
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


def _auth_header(username: str) -> dict[str, str]:
    from app.security import create_access_token

    token = create_access_token({"sub": username})
    return {"Authorization": f"Bearer {token}"}


def _create_user(username: str):
    from app.db import SessionLocal
    from app.models import User
    from app.security import hash_password

    db = SessionLocal()
    try:
        user = User(username=username, password_hash=hash_password("pw"))
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


def _create_item(owner_id: int, name: str, category: str):
    from app.db import SessionLocal
    from app.models import ClothingItem

    db = SessionLocal()
    try:
        item = ClothingItem(name=name, category=category, owner_id=owner_id)
        db.add(item)
        db.commit()
        db.refresh(item)
        return item
    finally:
        db.close()


def test_create_and_get_outfit(client) -> None:
    user = _create_user(_unique_username())
    item1 = _create_item(user.id, "Shirt", "oberteile")
    item2 = _create_item(user.id, "Hose", "unterteile")

    resp = client.post(
        "/api/outfits",
        json={"name": "Business", "item_ids": [item1.id, item2.id]},
        headers=_auth_header(user.username),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Business"
    assert data["item_ids"] == [item1.id, item2.id]
    assert [item["id"] for item in data["items"]] == [item1.id, item2.id]
    assert data["id"] > 0

    fetched = client.get(f"/api/outfits/{data['id']}", headers=_auth_header(user.username))
    assert fetched.status_code == 200
    assert fetched.json()["name"] == "Business"
    assert fetched.json()["item_ids"] == [item1.id, item2.id]


def test_create_outfit_rejects_foreign_item(client) -> None:
    owner = _create_user(_unique_username())
    other = _create_user(_unique_username())
    foreign_item = _create_item(other.id, "Fremd", "schuhe")

    resp = client.post(
        "/api/outfits",
        json={"name": "X", "item_ids": [foreign_item.id]},
        headers=_auth_header(owner.username),
    )
    assert resp.status_code == 422


def test_create_outfit_rejects_unknown_item(client) -> None:
    owner = _create_user(_unique_username())
    resp = client.post(
        "/api/outfits",
        json={"name": "X", "item_ids": [999999]},
        headers=_auth_header(owner.username),
    )
    assert resp.status_code == 422


def test_create_outfit_rejects_empty_name(client) -> None:
    owner = _create_user(_unique_username())
    item = _create_item(owner.id, "Shirt", "oberteile")
    resp = client.post(
        "/api/outfits",
        json={"name": "   ", "item_ids": [item.id]},
        headers=_auth_header(owner.username),
    )
    assert resp.status_code == 422


def test_list_outfits_returns_only_own(client) -> None:
    user_a = _create_user(_unique_username())
    user_b = _create_user(_unique_username())
    item_a = _create_item(user_a.id, "A shirt", "oberteile")
    item_b = _create_item(user_b.id, "B shirt", "oberteile")

    client.post(
        "/api/outfits",
        json={"name": "A outfit", "item_ids": [item_a.id]},
        headers=_auth_header(user_a.username),
    )
    client.post(
        "/api/outfits",
        json={"name": "B outfit", "item_ids": [item_b.id]},
        headers=_auth_header(user_b.username),
    )

    resp = client.get("/api/outfits", headers=_auth_header(user_a.username))
    assert resp.status_code == 200
    names = [outfit["name"] for outfit in resp.json()]
    assert "A outfit" in names
    assert "B outfit" not in names


def test_get_foreign_outfit_returns_404(client) -> None:
    user_a = _create_user(_unique_username())
    user_b = _create_user(_unique_username())
    item_a = _create_item(user_a.id, "shirt", "oberteile")

    created = client.post(
        "/api/outfits",
        json={"name": "secret", "item_ids": [item_a.id]},
        headers=_auth_header(user_a.username),
    ).json()

    resp = client.get(f"/api/outfits/{created['id']}", headers=_auth_header(user_b.username))
    assert resp.status_code == 404


def test_get_unknown_outfit_returns_404(client) -> None:
    user = _create_user(_unique_username())
    resp = client.get("/api/outfits/999999", headers=_auth_header(user.username))
    assert resp.status_code == 404


def test_delete_outfit(client) -> None:
    user = _create_user(_unique_username())
    item = _create_item(user.id, "shirt", "oberteile")
    created = client.post(
        "/api/outfits",
        json={"name": "tmp", "item_ids": [item.id]},
        headers=_auth_header(user.username),
    ).json()

    resp = client.delete(f"/api/outfits/{created['id']}", headers=_auth_header(user.username))
    assert resp.status_code == 204
    assert (
        client.get(f"/api/outfits/{created['id']}", headers=_auth_header(user.username)).status_code
        == 404
    )


def test_delete_foreign_outfit_returns_404(client) -> None:
    user_a = _create_user(_unique_username())
    user_b = _create_user(_unique_username())
    item_a = _create_item(user_a.id, "shirt", "oberteile")

    created = client.post(
        "/api/outfits",
        json={"name": "keep", "item_ids": [item_a.id]},
        headers=_auth_header(user_a.username),
    ).json()

    resp = client.delete(f"/api/outfits/{created['id']}", headers=_auth_header(user_b.username))
    assert resp.status_code == 404
    assert (
        client.get(
            f"/api/outfits/{created['id']}", headers=_auth_header(user_a.username)
        ).status_code
        == 200
    )


def test_outfits_require_auth(client) -> None:
    assert client.get("/api/outfits").status_code == 401
    assert client.post("/api/outfits", json={"name": "x", "item_ids": []}).status_code == 401
    assert client.get("/api/outfits/1").status_code == 401
    assert client.delete("/api/outfits/1").status_code == 401
