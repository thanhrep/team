import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.core import security


def test_secret_key_rejects_missing_or_short_values(monkeypatch):
    monkeypatch.delenv("SECRET_KEY", raising=False)
    with pytest.raises(RuntimeError):
        security._secret_key()
    monkeypatch.setenv("SECRET_KEY", "too-short")
    with pytest.raises(RuntimeError):
        security._secret_key()


def test_access_token_round_trip(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "test-only-secret-key-with-more-than-32-characters")
    token = security.create_access_token({"sub": "test-user"})
    payload = security.decode_token(token)
    assert payload is not None
    assert payload["sub"] == "test-user"


def test_invalid_token_is_rejected(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "test-only-secret-key-with-more-than-32-characters")
    assert security.decode_token("not-a-jwt") is None


def test_password_hash_verification():
    password = "Bizwork-Test-Password-2026"
    hashed = security.hash_password(password)
    assert hashed != password
    assert security.verify_password(password, hashed)
    assert not security.verify_password("wrong-password", hashed)


def test_source_contracts():
    auth = (ROOT / "backend/app/api/auth_api.py").read_text(encoding="utf-8")
    media = (ROOT / "backend/app/api/media_api.py").read_text(encoding="utf-8")
    orders = (ROOT / "backend/app/api/orders_api.py").read_text(encoding="utf-8")
    frontend = (ROOT / "backend/app/static/js/app.js").read_text(encoding="utf-8")
    assert "role = UserRoleEnum.STAFF" in auth
    assert "status_val = UserStatusEnum.PENDING" in auth
    assert "req.role in privileged_roles" in auth
    assert "display_name: str = Form" in media
    assert "media_img.code = f\"@{media_img.id}\"" in media
    assert "with_for_update()" in orders
    assert "variant.stock_quantity += item.quantity" in orders
    assert "for (let index = 0; index < sheets.length; index++)" in frontend
