"""Projects routes tests: connect, list, get, index, issues, and delete."""

from collections.abc import Iterator
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, col, delete, select

from app.api.deps import get_current_user, get_github_token
from app.db import engine
from app.main import app
from app.models.agent_run import AgentRun
from app.models.document_chunk import DocumentChunk
from app.models.organization import Organization, OrganizationMember
from app.models.project import Project
from app.models.user import User
from app.services.organizations import create_organization

PREFIX = "projtest-"


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
        if not ids:
            return
        org_ids = list(
            session.exec(
                select(Organization.id).where(col(Organization.created_by).in_(ids))
            ).all()
        )
        project_ids = list(
            session.exec(
                select(Project.id).where(col(Project.organization_id).in_(org_ids))
            ).all()
        )
        if project_ids:
            session.exec(
                delete(AgentRun).where(col(AgentRun.project_id).in_(project_ids))
            )
            session.exec(
                delete(DocumentChunk).where(
                    col(DocumentChunk.project_id).in_(project_ids)
                )
            )
            session.exec(delete(Project).where(col(Project.id).in_(project_ids)))

        session.exec(
            delete(OrganizationMember).where(
                col(OrganizationMember.organization_id).in_(org_ids)
                | col(OrganizationMember.user_id).in_(ids)
            )
        )
        session.exec(delete(Organization).where(col(Organization.id).in_(org_ids)))
        session.exec(delete(User).where(col(User.id).in_(ids)))
        session.commit()


@pytest.fixture
def test_setup() -> Iterator[dict[str, User | Organization]]:
    _cleanup()
    with Session(engine, expire_on_commit=False) as session:
        alice = _make_user(session, "alice")
        bob = _make_user(session, "bob")
        carol = _make_user(session, "carol")  # outsider

        org = create_organization(session, alice, "Projtest Org")
        # Add bob as a member
        member = OrganizationMember(
            organization_id=org.id, user_id=bob.id, role="member"
        )
        session.add(member)
        session.commit()
        session.refresh(org)

    yield {"alice": alice, "bob": bob, "carol": carol, "org": org}
    _cleanup()


@pytest.fixture
def api() -> Iterator[TestClient]:
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def as_user(user: User, token: str = "gho_test_token_123") -> None:
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_github_token] = lambda: token


def test_create_and_reconnect_project(api, test_setup):
    alice = test_setup["alice"]
    carol = test_setup["carol"]
    org = test_setup["org"]

    as_user(carol)
    # Non-member cannot connect project to org
    res = api.post(
        "/api/v1/projects/",
        json={
            "organization_id": org.id,
            "github_url": "https://github.com/test-owner/test-repo",
            "branch": "main",
        },
    )
    assert res.status_code == 404

    as_user(alice)
    with patch("app.api.v1.projects.clone_repository"):
        res = api.post(
            "/api/v1/projects/",
            json={
                "organization_id": org.id,
                "github_url": "https://github.com/test-owner/test-repo",
                "branch": "main",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "test-owner/test-repo"
        assert data["status"] == "pending"
        project_id = data["id"]

        # Reconnecting same repo reuses the row
        res2 = api.post(
            "/api/v1/projects/",
            json={
                "organization_id": org.id,
                "github_url": "https://github.com/test-owner/test-repo",
                "branch": "feature-x",
            },
        )
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["id"] == project_id
        assert data2["branch"] == "feature-x"


def test_list_and_get_project(api, test_setup):
    alice = test_setup["alice"]
    bob = test_setup["bob"]
    carol = test_setup["carol"]
    org = test_setup["org"]

    with Session(engine) as session:
        p = Project(
            organization_id=org.id,
            user_id=alice.id,
            name="test-org/repo-1",
            github_url="https://github.com/test-org/repo-1",
            status="ready",
        )
        session.add(p)
        session.commit()
        session.refresh(p)
        project_id = p.id

    as_user(bob)
    # Bob (member) can list and view
    res = api.get(f"/api/v1/projects/?organization_id={org.id}")
    assert res.status_code == 200
    projects = res.json()
    assert len(projects) == 1
    assert projects[0]["id"] == project_id

    res = api.get(f"/api/v1/projects/{project_id}")
    assert res.status_code == 200
    assert res.json()["name"] == "test-org/repo-1"

    as_user(carol)
    # Carol (outsider) gets 404
    res = api.get(f"/api/v1/projects/?organization_id={org.id}")
    assert res.status_code == 404
    res = api.get(f"/api/v1/projects/{project_id}")
    assert res.status_code == 404


def test_index_project_status_check(api, test_setup):
    alice = test_setup["alice"]
    org = test_setup["org"]

    with Session(engine) as session:
        p = Project(
            organization_id=org.id,
            user_id=alice.id,
            name="test-org/repo-indexing",
            github_url="https://github.com/test-org/repo-indexing",
            status="pending",
        )
        session.add(p)
        session.commit()
        session.refresh(p)
        p_id = p.id

    as_user(alice)
    # Cannot index pending project
    res = api.post(f"/api/v1/projects/{p_id}/index")
    assert res.status_code == 409

    # Once ready, index can be started
    with Session(engine) as session:
        project = session.get(Project, p_id)
        project.status = "ready"
        session.add(project)
        session.commit()

    with patch("app.api.v1.projects._index_workspace"):
        res = api.post(f"/api/v1/projects/{p_id}/index")
        assert res.status_code == 200
        assert res.json()["status"] == "indexing_started"


def test_project_issues(api, test_setup):
    alice = test_setup["alice"]
    org = test_setup["org"]

    with Session(engine) as session:
        p = Project(
            organization_id=org.id,
            user_id=alice.id,
            name="test-org/repo-issues",
            github_url="https://github.com/test-org/repo-issues",
            status="ready",
        )
        session.add(p)
        session.commit()
        session.refresh(p)
        p_id = p.id

    as_user(alice)
    mock_issues = [
        {
            "number": 42,
            "title": "Fix navbar alignment",
            "body": "It wraps unexpectedly",
            "html_url": "https://github.com/test-org/repo-issues/issues/42",
            "labels": [{"name": "bug"}],
        }
    ]
    with patch(
        "app.api.v1.projects.list_repo_issues",
        new=AsyncMock(return_value=mock_issues),
    ):
        res = api.get(f"/api/v1/projects/{p_id}/issues")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["number"] == 42
        assert data[0]["labels"] == ["bug"]


def test_delete_project_permissions(api, test_setup):
    alice = test_setup["alice"]  # owner
    bob = test_setup["bob"]  # member
    carol = test_setup["carol"]  # outsider
    org = test_setup["org"]

    with Session(engine) as session:
        # Project connected by alice (owner)
        p1 = Project(
            organization_id=org.id,
            user_id=alice.id,
            name="test-org/repo-owner",
            github_url="https://github.com/test-org/repo-owner",
            status="ready",
        )
        # Project connected by bob (member)
        p2 = Project(
            organization_id=org.id,
            user_id=bob.id,
            name="test-org/repo-member",
            github_url="https://github.com/test-org/repo-member",
            status="ready",
        )
        session.add(p1)
        session.add(p2)
        session.commit()
        session.refresh(p1)
        session.refresh(p2)
        p1_id = p1.id
        p2_id = p2.id

    # Carol (outsider) cannot delete anything
    as_user(carol)
    res = api.delete(f"/api/v1/projects/{p1_id}")
    assert res.status_code == 404

    # Bob (member) cannot delete Alice's project (not owner and didn't connect it)
    as_user(bob)
    res = api.delete(f"/api/v1/projects/{p1_id}")
    assert res.status_code == 403

    # Bob can delete his own connected project
    with patch("app.services.projects.delete_workspace"):
        res = api.delete(f"/api/v1/projects/{p2_id}")
        assert res.status_code == 204

    # Alice (owner) can delete any project in the org
    as_user(alice)
    with patch("app.services.projects.delete_workspace"):
        res = api.delete(f"/api/v1/projects/{p1_id}")
        assert res.status_code == 204
