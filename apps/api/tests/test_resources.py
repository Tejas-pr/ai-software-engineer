# apps/api/tests/test_resources.py
"""Tests for hardware telemetry and resource limits settings."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, col, delete, select

from app.api.deps import get_current_user
from app.db import engine
from app.main import app
from app.models.user import User
from app.models.user_resource_limit import UserResourceLimit

PREFIX = "restest-"


def _make_user(session: Session, name: str) -> User:
    user = User(username=f"{PREFIX}{name}", email=f"{PREFIX}{name}@example.com")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _cleanup() -> None:
    with Session(engine) as session:
        ids = list(
            session.exec(
                select(User.id).where(col(User.username).startswith(PREFIX))
            ).all()
        )
        if ids:
            session.exec(
                delete(UserResourceLimit).where(col(UserResourceLimit.user_id).in_(ids))
            )
            session.exec(delete(User).where(col(User.id).in_(ids)))
            session.commit()


@pytest.fixture
def test_setup() -> Iterator[dict[str, User]]:
    _cleanup()
    with Session(engine, expire_on_commit=False) as session:
        user = _make_user(session, "alice")
    yield {"user": user}
    _cleanup()


@pytest.fixture
def api() -> Iterator[TestClient]:
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def as_user(user: User) -> None:
    app.dependency_overrides[get_current_user] = lambda: user


def test_get_resource_settings(api: TestClient, test_setup: dict[str, User]) -> None:
    user = test_setup["user"]
    as_user(user)

    res = api.get("/api/v1/settings/resources")
    assert res.status_code == 200
    data = res.json()

    assert "telemetry" in data
    assert "cpu_cores" in data["telemetry"]
    assert "disk_total_gb" in data["telemetry"]

    assert "ollama" in data
    assert "base_url" in data["ollama"]

    assert "limits" in data
    assert data["limits"]["ollama_num_gpu"] == 99
    assert data["limits"]["max_context_window"] == 32768
    assert data["limits"]["max_tokens_per_run"] == 100000


def test_update_resource_settings(api: TestClient, test_setup: dict[str, User]) -> None:
    user = test_setup["user"]
    as_user(user)

    payload = {
        "ollama_num_gpu": 33,
        "ollama_num_thread": 4,
        "ollama_vram_budget_gb": 12.0,
        "ollama_keep_alive": "1h",
        "max_context_window": 16384,
        "max_tokens_per_run": 50000,
        "max_run_timeout_seconds": 300,
        "max_concurrent_runs": 1,
        "workspace_storage_limit_gb": 10.0,
        "auto_prune_workspaces": False,
    }

    res = api.put("/api/v1/settings/resources", json=payload)
    assert res.status_code == 200
    updated = res.json()
    assert updated["ollama_num_gpu"] == 33
    assert updated["max_context_window"] == 16384
    assert updated["auto_prune_workspaces"] is False

    with Session(engine) as session:
        db_row = session.exec(
            select(UserResourceLimit).where(UserResourceLimit.user_id == user.id)
        ).first()
        assert db_row is not None
        assert db_row.ollama_num_gpu == 33
        assert db_row.max_context_window == 16384


def test_prune_storage_cache(api: TestClient, test_setup: dict[str, User]) -> None:
    user = test_setup["user"]
    as_user(user)

    res = api.post("/api/v1/settings/resources/prune-cache")
    assert res.status_code == 200
    data = res.json()
    assert "freed_mb" in data
    assert "workspaces_size_mb" in data
