"""Organizations, membership-scoped access and onboarding, through the real
API against real Postgres. The signed-in user is swapped in by overriding
`get_current_user`, so no OAuth round trip is needed."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, col, delete, select

from app.api.deps import get_current_user
from app.db import engine
from app.main import app
from app.models.organization import Organization, OrganizationMember
from app.models.project import Project
from app.models.user import User
from app.models.user_api_key import UserApiKey
from app.services.organizations import create_organization, unique_slug
from app.services.provider_keys import InvalidKeyError
from app.utils.crypto import encrypt_token

PREFIX = "orgtest-"


def _make_user(session: Session, name: str) -> User:
    user = User(username=f"{PREFIX}{name}", email=f"{PREFIX}{name}@example.com")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _cleanup() -> None:
    """Removes every row these tests create (also leftovers from a run that
    crashed before its own cleanup)."""
    with Session(engine) as session:
        ids = list(
            session.exec(
                select(User.id).where(col(User.username).startswith(PREFIX))
            ).all()
        )
        if not ids:
            return
        org_ids = list(
            session.exec(
                select(Organization.id).where(col(Organization.created_by).in_(ids))
            ).all()
        )
        session.exec(
            delete(OrganizationMember).where(
                col(OrganizationMember.organization_id).in_(org_ids)
                | col(OrganizationMember.user_id).in_(ids)
            )
        )
        session.exec(delete(Project).where(col(Project.organization_id).in_(org_ids)))
        session.exec(delete(Organization).where(col(Organization.id).in_(org_ids)))
        session.exec(delete(UserApiKey).where(col(UserApiKey.user_id).in_(ids)))
        session.exec(delete(User).where(col(User.id).in_(ids)))
        session.commit()


@pytest.fixture
def people() -> Iterator[dict[str, User]]:
    _cleanup()
    # expire_on_commit=False: the users stay readable after their session
    # closes, as the stand-in "current user" for each request
    with Session(engine, expire_on_commit=False) as session:
        users = {n: _make_user(session, n) for n in ("alice", "bob", "carol")}
    yield users
    _cleanup()


@pytest.fixture
def api() -> Iterator[TestClient]:
    """A client with the app's lifespan running (the Redis pool the rate
    limiter needs); `as_user` picks who's signed in."""
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def as_user(user: User) -> None:
    app.dependency_overrides[get_current_user] = lambda: user


def test_slugs_are_unique_and_creator_owns_the_org(people):
    with Session(engine, expire_on_commit=False) as session:
        first = create_organization(session, people["alice"], "Orgtest Acme")
        second = create_organization(session, people["alice"], "Orgtest Acme")
        assert first.slug == "orgtest-acme"
        assert second.slug == "orgtest-acme-2"
        assert unique_slug(session, "Orgtest Acme") == "orgtest-acme-3"
        role = session.exec(
            select(OrganizationMember.role).where(
                OrganizationMember.organization_id == first.id,
                OrganizationMember.user_id == people["alice"].id,
            )
        ).one()
        assert role == "owner"


def test_projects_are_visible_only_to_members(people, api):
    with Session(engine, expire_on_commit=False) as session:
        org = create_organization(session, people["alice"], "Orgtest Team")
        project = Project(
            organization_id=org.id,
            user_id=people["alice"].id,
            name="orgtest/repo",
            github_url="https://github.com/orgtest/repo",
            status="ready",
        )
        session.add(project)
        session.commit()
        session.refresh(project)

    as_user(people["alice"])
    assert (
        api.get("/api/v1/projects/", params={"organization_id": org.id}).status_code
        == 200
    )

    as_user(people["bob"])
    assert (
        api.get("/api/v1/projects/", params={"organization_id": org.id}).status_code
        == 404
    )
    assert api.get(f"/api/v1/projects/{project.id}").status_code == 404

    as_user(people["alice"])
    added = api.post(
        f"/api/v1/orgs/{org.id}/members", json={"username": people["bob"].username}
    )
    assert added.status_code == 200

    as_user(people["bob"])
    listed = api.get("/api/v1/projects/", params={"organization_id": org.id})
    assert [p["id"] for p in listed.json()] == [project.id]
    # Members can't manage the organization itself
    assert api.patch(f"/api/v1/orgs/{org.id}", json={"name": "x"}).status_code == 403


def test_last_owner_cannot_leave_and_personal_orgs_stay_personal(people, api):
    with Session(engine, expire_on_commit=False) as session:
        team = create_organization(session, people["alice"], "Orgtest Solo")
        personal = create_organization(
            session, people["alice"], "Orgtest Mine", is_personal=True
        )
    as_user(people["alice"])

    left = api.delete(f"/api/v1/orgs/{team.id}/members/{people['alice'].id}")
    assert left.status_code == 400

    assert api.delete(f"/api/v1/orgs/{personal.id}").status_code == 400
    added = api.post(
        f"/api/v1/orgs/{personal.id}/members", json={"username": people["bob"].username}
    )
    assert added.status_code == 400


def test_onboarding_needs_an_org_and_a_model(people, api, monkeypatch):
    as_user(people["carol"])

    assert api.post("/api/v1/account/onboarding/complete", json={}).status_code == 400

    created = api.post(
        "/api/v1/account/onboarding/organization", json={"name": "Orgtest Carol"}
    )
    assert created.status_code == 200
    # No key, and not choosing local models -> still not done
    assert api.post("/api/v1/account/onboarding/complete", json={}).status_code == 400

    # Local models only count when Ollama really has some
    monkeypatch.setattr("app.api.v1.account.list_installed_tool_models", lambda: None)
    local = api.post(
        "/api/v1/account/onboarding/complete", json={"use_local_models": True}
    )
    assert local.status_code == 400

    with Session(engine) as session:
        session.add(
            UserApiKey(
                user_id=people["carol"].id,
                provider="gemini",
                encrypted_key=encrypt_token("orgtest-key"),
            )
        )
        session.commit()
    done = api.post("/api/v1/account/onboarding/complete", json={})
    assert done.status_code == 200
    assert done.json()["onboarded_at"] is not None


def test_a_rejected_key_is_not_stored(people, api, monkeypatch):
    def reject(provider: str, key: str) -> None:
        raise InvalidKeyError("nope")

    monkeypatch.setattr("app.api.v1.settings.verify_provider_key", reject)
    as_user(people["alice"])
    response = api.put("/api/v1/settings/api-keys/gemini", json={"api_key": "bad"})
    assert response.status_code == 400
    with Session(engine) as session:
        stored = session.exec(
            select(UserApiKey).where(UserApiKey.user_id == people["alice"].id)
        ).first()
    assert stored is None
