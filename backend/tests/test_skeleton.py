from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient
from starlette.requests import Request


@pytest.fixture(scope="session", autouse=True)
def _set_env(tmp_path_factory) -> None:
    db_path = tmp_path_factory.mktemp("officecloset") / "test.db"
    os.environ["DATABASE_URL"] = "sqlite:///" + str(db_path).replace("\\", "/")
    os.environ["JWT_SECRET"] = "test-secret-not-for-production"


@pytest.fixture(scope="session")
def client(_set_env):
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


def test_health_returns_ok(client) -> None:
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_auth_routes_are_wired(client) -> None:
    assert (
        client.post("/api/auth/register", json={"username": "u", "password": "p"}).status_code
        != 404
    )
    assert (
        client.post("/api/auth/login", json={"username": "u", "password": "p"}).status_code != 404
    )
    assert client.delete("/api/users/me").status_code != 404


def test_wardrobe_routes_are_wired(client) -> None:
    assert client.get("/api/wardrobe/categories").status_code != 404
    assert client.get("/api/wardrobe/items").status_code != 404


def test_outfits_routes_are_wired(client) -> None:
    assert client.get("/api/outfits").status_code != 404
    assert client.post("/api/outfits", json={"name": "o", "item_ids": []}).status_code != 404


def test_password_hash_and_verify() -> None:
    from app.security import hash_password, verify_password

    hashed = hash_password("s3cret")
    assert hashed != "s3cret"
    assert verify_password("s3cret", hashed)
    assert not verify_password("wrong", hashed)


def test_access_token_roundtrip() -> None:
    from jose import jwt

    from app.config import ALGORITHM, settings
    from app.security import create_access_token

    token = create_access_token({"sub": "alice"})
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    assert payload["sub"] == "alice"
    assert "exp" in payload


def _request(authorization: str | None = None) -> Request:
    headers = [] if authorization is None else [(b"authorization", authorization.encode())]
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/",
            "raw_path": b"/",
            "query_string": b"",
            "headers": headers,
            "client": ("testclient", 123),
            "server": ("testserver", 80),
            "scheme": "http",
            "root_path": "",
            "http_version": "1.1",
        }
    )


def test_get_current_user_rejects_missing_token() -> None:
    from fastapi import HTTPException

    from app.db import SessionLocal
    from app.security import get_current_user

    db = SessionLocal()
    try:
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(_request(), db)
        assert exc_info.value.status_code == 401
    finally:
        db.close()


def test_get_current_user_returns_user(client) -> None:
    from app.db import SessionLocal
    from app.models import User
    from app.security import create_access_token, get_current_user, hash_password

    db = SessionLocal()
    try:
        user = User(username="alice", password_hash=hash_password("s3cret"))
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token({"sub": "alice"})
        current = get_current_user(_request(f"Bearer {token}"), db)
        assert current.id == user.id
        assert current.username == "alice"
    finally:
        db.close()
