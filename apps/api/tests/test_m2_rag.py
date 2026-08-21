"""
M2 smoke test: chunk a throwaway repo, embed + store it for real (hits the
configured embedding provider and the real Postgres/pgvector instance), then
confirm semantic search actually finds the right chunk. Skips if no
embedding provider is configured — this is an integration check, not a unit
test, on purpose (BUILDER.md: "don't just say the agent works, measure it").
"""

from pathlib import Path

import pytest
from sqlmodel import Session, col, delete

from app.config import settings
from app.db import engine
from app.models.document_chunk import DocumentChunk
from app.models.project import Project
from app.models.user import User
from app.rag.chunking import chunk_workspace
from app.rag.ingestion import ingest_project
from app.rag.retrieval import search_chunks

pytestmark = pytest.mark.skipif(
    not settings.GEMINI_API_KEY, reason="no embedding provider configured"
)


def test_chunking_produces_language_tagged_chunks(tmp_path: Path):
    (tmp_path / "main.py").write_text("def hello():\n    return 'hi'\n")
    (tmp_path / "readme.md").write_text("# docs\n")
    (tmp_path / "image.png").write_bytes(b"\x89PNG")  # unsupported ext, must be skipped

    chunks = chunk_workspace(tmp_path)
    by_file = {c.file_path for c in chunks}
    assert "main.py" in by_file
    assert "readme.md" in by_file
    assert not any(f.endswith(".png") for f in by_file)
    assert all(c.language for c in chunks)


def test_ingest_then_semantic_search_roundtrip(tmp_path: Path):
    (tmp_path / "auth.py").write_text(
        "def refresh_access_token(refresh_token):\n"
        "    '''Exchanges a refresh token for a new short-lived access token.'''\n"
        "    return issue_new_jwt(refresh_token)\n"
    )
    (tmp_path / "unrelated.py").write_text("def add_numbers(a, b):\n    return a + b\n")

    with Session(engine) as session:
        user = User(username="m2-test-user", email="m2-test@example.com")
        session.add(user)
        session.commit()
        session.refresh(user)

        project = Project(
            user_id=user.id,
            name="m2-test-project",
            github_url="https://github.com/example/m2-test",
            status="ready",
        )
        session.add(project)
        session.commit()
        session.refresh(project)
        assert project.id is not None  # committed rows always have one

        try:
            stored = ingest_project(session, project.id, tmp_path)
            assert stored == 2

            results = search_chunks(
                session, project.id, "how does token refresh work?", top_k=1
            )
            assert len(results) == 1
            assert results[0].file_path == "auth.py"
        finally:
            session.exec(
                delete(DocumentChunk).where(col(DocumentChunk.project_id) == project.id)
            )
            session.delete(project)
            session.delete(user)
            session.commit()
