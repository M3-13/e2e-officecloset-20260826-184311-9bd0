from __future__ import annotations

import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session", autouse=True)
def _set_env(tmp_path_factory) -> None:
    db_path = tmp_path_factory.mktemp("officecloset_wardrobe") / "test.db"
    os.environ["DATABASE_URL"] = "sqlite:///" + str(db_path).replace("\\", "/")
    os.environ["JWT_SECRET"] = "test-secret-not-for-production"
    os.environ["UPLOAD_DIR"] = str(tmp_path_factory.mktemp("uploads"))
    os.environ["UPLOAD_MAX_MB"] = "5"


@pytest.fixture(scope="session")
def client(_set_env) -> Iterator[TestClient]:
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


def _create_user(username: str):
    from app.db import SessionLocal
    from app.models import User
    from app.security import hash_password

    db = SessionLocal()
    try:
        user = User(username=username, password_hash=hash_password("s3cret"))
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    finally:
        db.close()


def _auth(user) -> dict[str, str]:
    from app.security import create_access_token

    token = create_access_token({"sub": user.username})
    return {"Authorization": f"Bearer {token}"}


def _create_item(client: TestClient, user, **kw) -> dict:
    data = {"name": kw.get("name", "Hemd"), "category": kw.get("category", "oberteile")}
    files = {}
    if "image" in kw:
        files["image"] = kw["image"]
    resp = client.post("/api/wardrobe/items", data=data, files=files, headers=_auth(user))
    assert resp.status_code == 201, resp.text
    return resp.json()


JPEG = b"\xff\xd8\xff\xe0test"


def test_categories_are_public_and_fixed(client: TestClient) -> None:
    resp = client.get("/api/wardrobe/categories")
    assert resp.status_code == 200
    assert resp.json() == {"categories": ["oberteile", "unterteile", "schuhe", "accessoires"]}


def test_items_require_auth(client: TestClient) -> None:
    assert client.get("/api/wardrobe/items").status_code == 401


def test_create_and_list_item_without_image(client: TestClient) -> None:
    user = _create_user("alice_noimg")
    item = _create_item(client, user, name="Hemd", category="oberteile")
    assert item["name"] == "Hemd"
    assert item["category"] == "oberteile"
    assert item["image_url"] is None

    resp = client.get("/api/wardrobe/items", headers=_auth(user))
    assert resp.status_code == 200
    assert [i["name"] for i in resp.json()] == ["Hemd"]


def test_create_item_with_image(client: TestClient) -> None:
    user = _create_user("alice_img")
    item = _create_item(
        client,
        user,
        name="Schuhe",
        category="schuhe",
        image=("shoes.jpg", JPEG, "image/jpeg"),
    )
    assert item["image_url"] == f"/api/wardrobe/items/{item['id']}/image"

    resp = client.get(item["image_url"], headers=_auth(user))
    assert resp.status_code == 200
    assert resp.content == JPEG
    assert resp.headers["content-type"].startswith("image/jpeg")


def test_filter_by_category(client: TestClient) -> None:
    user = _create_user("alice_filter")
    _create_item(client, user, name="Hemd", category="oberteile")
    _create_item(client, user, name="Schuhe", category="schuhe")

    resp = client.get("/api/wardrobe/items?category=schuhe", headers=_auth(user))
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 1
    assert items[0]["name"] == "Schuhe"

    resp = client.get("/api/wardrobe/items?category=accessoires", headers=_auth(user))
    assert resp.json() == []


def test_ownership_isolation(client: TestClient) -> None:
    alice = _create_user("alice_owner")
    bob = _create_user("bob_owner")
    item = _create_item(client, alice, name="Geheim", category="oberteile")

    resp = client.get("/api/wardrobe/items", headers=_auth(bob))
    assert resp.json() == []

    assert (
        client.get(f"/api/wardrobe/items/{item['id']}/image", headers=_auth(bob)).status_code == 404
    )
    assert (
        client.put(f"/api/wardrobe/items/{item['id']}", data={"name": "X"}, headers=_auth(bob))
    ).status_code == 404
    assert client.delete(f"/api/wardrobe/items/{item['id']}", headers=_auth(bob)).status_code == 404

    assert client.get("/api/wardrobe/items/999999/image", headers=_auth(alice)).status_code == 404
    assert client.delete("/api/wardrobe/items/999999", headers=_auth(alice)).status_code == 404


def test_update_item_fields(client: TestClient) -> None:
    user = _create_user("alice_upd")
    item = _create_item(client, user, name="Hemd", category="oberteile")

    resp = client.put(
        f"/api/wardrobe/items/{item['id']}",
        data={"name": "Bluse", "category": "unterteile"},
        headers=_auth(user),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Bluse"
    assert body["category"] == "unterteile"

    resp = client.put(
        f"/api/wardrobe/items/{item['id']}",
        files={"image": ("p.png", JPEG, "image/png")},
        headers=_auth(user),
    )
    assert resp.status_code == 200
    assert resp.json()["image_url"] == f"/api/wardrobe/items/{item['id']}/image"


def test_delete_item(client: TestClient) -> None:
    user = _create_user("alice_del")
    item = _create_item(client, user, name="Hemd", category="oberteile")

    resp = client.delete(f"/api/wardrobe/items/{item['id']}", headers=_auth(user))
    assert resp.status_code == 204

    assert client.get("/api/wardrobe/items", headers=_auth(user)).json() == []


def test_invalid_category_rejected(client: TestClient) -> None:
    user = _create_user("alice_badcat")
    resp = client.post(
        "/api/wardrobe/items",
        data={"name": "Hemd", "category": "hosen"},
        headers=_auth(user),
    )
    assert resp.status_code == 422


def test_wrong_mime_rejected(client: TestClient) -> None:
    user = _create_user("alice_mime")
    resp = client.post(
        "/api/wardrobe/items",
        data={"name": "Hemd", "category": "oberteile"},
        files={"image": ("x.gif", b"GIF89a", "image/gif")},
        headers=_auth(user),
    )
    assert resp.status_code == 415


def test_oversized_upload_rejected(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    user = _create_user("alice_big")
    monkeypatch.setenv("UPLOAD_MAX_MB", "1")
    big = b"x" * (2 * 1024 * 1024)
    resp = client.post(
        "/api/wardrobe/items",
        data={"name": "Hemd", "category": "oberteile"},
        files={"image": ("big.jpg", big, "image/jpeg")},
        headers=_auth(user),
    )
    assert resp.status_code == 413


def test_save_image_streams_and_aborts_without_declared_size(
    monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    from io import BytesIO

    from fastapi import HTTPException
    from starlette.datastructures import Headers, UploadFile

    from app.upload import save_image

    monkeypatch.setenv("UPLOAD_MAX_MB", "1")
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path))

    limit = 1 * 1024 * 1024
    payload = BytesIO(b"x" * (limit + 1024))
    upload = UploadFile(
        file=payload,
        size=None,
        filename="big.jpg",
        headers=Headers({"content-type": "image/jpeg"}),
    )

    with pytest.raises(HTTPException) as exc:
        save_image(upload)
    assert exc.value.status_code == 413
    assert list(tmp_path.iterdir()) == []
