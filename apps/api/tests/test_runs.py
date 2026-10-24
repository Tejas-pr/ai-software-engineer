"""Agent runs routes tests: catalog, create, list, get, approve, retry, cancel."""

from collections.abc import Iterator
from unittest.mock import patch

import pytest
from fastapi.responses import StreamingResponse
from fastapi.testclient import TestClient
from sqlmodel import Session, col, delete, select

from app.api.deps import get_current_user
from app.db import engine
from app.main import app
from app.models.agent_run import AgentRun
from app.models.organization import Organization, OrganizationMember
from app.models.project import Project
from app.models.user import User
from app.services.organizations import create_organization

PREFIX = "runstest-"


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
def test_setup() -> Iterator[dict[str, User | Organization | Project]]:
    _cleanup()
    with Session(engine, expire_on_commit=False) as session:
        alice = _make_user(session, "alice")
        bob = _make_user(session, "bob")
        carol = _make_user(session, "carol")  # outsider

        org = create_organization(session, alice, "Runstest Org")
        member = OrganizationMember(
            organization_id=org.id, user_id=bob.id, role="member"
        )
        session.add(member)

        project = Project(
            organization_id=org.id,
            user_id=alice.id,
            name="runstest-org/repo",
            github_url="https://github.com/runstest-org/repo",
            status="ready",
        )
        session.add(project)
        session.commit()
        session.refresh(org)
        session.refresh(project)

    yield {"alice": alice, "bob": bob, "carol": carol, "org": org, "project": project}
    _cleanup()


@pytest.fixture
def api() -> Iterator[TestClient]:
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def as_user(user: User) -> None:
    app.dependency_overrides[get_current_user] = lambda: user


def test_agent_catalog_is_public(api):
    res = api.get("/api/v1/agent/catalog")
    assert res.status_code == 200
    data = res.json()
    assert "agents" in data
    assert "approval_step" in data
    assert len(data["agents"]) >= 5


def test_create_run_preconditions_and_access(api, test_setup):
    bob = test_setup["bob"]
    carol = test_setup["carol"]
    project = test_setup["project"]

    # Carol (outsider) cannot start run on alice/bob's project
    as_user(carol)
    res = api.post(
        "/api/v1/agent/runs",
        json={"project_id": project.id, "task": "Add tests"},
    )
    assert res.status_code == 404

    # If project is not ready, cannot start run
    with Session(engine) as session:
        p = session.get(Project, project.id)
        p.status = "pending"
        session.add(p)
        session.commit()

    as_user(bob)
    res = api.post(
        "/api/v1/agent/runs",
        json={"project_id": project.id, "task": "Add tests"},
    )
    assert res.status_code == 409
    assert "not ready" in res.json()["detail"]

    # When project is ready, member can start run
    with Session(engine) as session:
        p = session.get(Project, project.id)
        p.status = "ready"
        session.add(p)
        session.commit()

    res = api.post(
        "/api/v1/agent/runs",
        json={"project_id": project.id, "task": "Add tests"},
    )
    assert res.status_code == 200
    run_data = res.json()
    assert run_data["status"] == "pending"
    assert run_data["task"] == "Add tests"
    assert run_data["project_id"] == project.id


def test_list_and_get_runs(api, test_setup):
    alice = test_setup["alice"]
    bob = test_setup["bob"]
    carol = test_setup["carol"]
    org = test_setup["org"]
    project = test_setup["project"]

    with Session(engine) as session:
        run = AgentRun(
            project_id=project.id,
            user_id=alice.id,
            task="Task 1",
            model="gemini-3.6-flash",
            status="pending",
        )
        session.add(run)
        session.commit()
        session.refresh(run)
        run_id = run.id

    as_user(bob)
    # Member can list runs
    res = api.get(f"/api/v1/agent/runs?organization_id={org.id}")
    assert res.status_code == 200
    runs = res.json()
    assert len(runs) == 1
    assert runs[0]["id"] == run_id
    assert runs[0]["project_name"] == project.name

    # Member can view run detail
    res = api.get(f"/api/v1/agent/runs/{run_id}")
    assert res.status_code == 200
    assert res.json()["id"] == run_id

    # Outsider cannot view or list
    as_user(carol)
    res = api.get(f"/api/v1/agent/runs?organization_id={org.id}")
    assert res.status_code == 404
    res = api.get(f"/api/v1/agent/runs/{run_id}")
    assert res.status_code == 404


def test_approve_run_flow(api, test_setup):
    alice = test_setup["alice"]
    project = test_setup["project"]

    with Session(engine) as session:
        run = AgentRun(
            project_id=project.id,
            user_id=alice.id,
            task="Task Approve",
            model="gemini-3.6-flash",
            status="pending",
        )
        session.add(run)
        session.commit()
        session.refresh(run)
        run_id = run.id

    as_user(alice)
    # 409 if not awaiting_approval
    res = api.post(f"/api/v1/agent/runs/{run_id}/approve", json={"approved": True})
    assert res.status_code == 409

    # Change to awaiting_approval
    with Session(engine) as session:
        r = session.get(AgentRun, run_id)
        r.status = "awaiting_approval"
        session.add(r)
        session.commit()

    with patch(
        "app.api.v1.agent._start_stream",
        return_value=StreamingResponse(iter([]), media_type="text/event-stream"),
    ) as mock_stream:
        res = api.post(f"/api/v1/agent/runs/{run_id}/approve", json={"approved": True})
        assert res.status_code == 200
        assert res.headers["content-type"].startswith("text/event-stream")
        mock_stream.assert_called_once()


def test_retry_and_cancel_run(api, test_setup):
    alice = test_setup["alice"]
    project = test_setup["project"]

    with Session(engine) as session:
        run = AgentRun(
            project_id=project.id,
            user_id=alice.id,
            task="Task Retry",
            model="gemini-3.6-flash",
            status="running",
        )
        session.add(run)
        session.commit()
        session.refresh(run)
        run_id = run.id

    as_user(alice)
    # Retry requires failed status -> 409 if running
    res = api.post(f"/api/v1/agent/runs/{run_id}/retry")
    assert res.status_code == 409

    # Cancel a running run
    res = api.post(f"/api/v1/agent/runs/{run_id}/cancel")
    assert res.status_code == 200
    assert res.json()["status"] == "failed"

    # Canceling an already terminal run is a no-op
    res2 = api.post(f"/api/v1/agent/runs/{run_id}/cancel")
    assert res2.status_code == 200
    assert res2.json()["status"] == "failed"

    # When failed, retry starts stream
    with patch(
        "app.api.v1.agent._start_stream",
        return_value=StreamingResponse(iter([]), media_type="text/event-stream"),
    ) as mock_stream:
        res3 = api.post(f"/api/v1/agent/runs/{run_id}/retry")
        assert res3.status_code == 200
        assert res3.headers["content-type"].startswith("text/event-stream")
        mock_stream.assert_called_once()
