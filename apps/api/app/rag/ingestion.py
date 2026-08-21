# apps/api/app/rag/ingestion.py
"""Chunk a project's workspace, embed the chunks, store them in pgvector."""

from pathlib import Path

from sqlmodel import Session, col, delete

from app.models.document_chunk import DocumentChunk
from app.rag.chunking import chunk_workspace
from app.rag.embeddings import get_embeddings_model

EMBED_BATCH_SIZE = 100


def ingest_project(session: Session, project_id: int, workspace_root: Path) -> int:
    """(Re)index one project: replaces any chunks from a previous run.

    Returns the number of chunks stored.
    """
    chunks = chunk_workspace(workspace_root)

    # Re-indexing should reflect the workspace's current state, not append
    # to stale chunks from before the last code change.
    session.exec(
        delete(DocumentChunk).where(col(DocumentChunk.project_id) == project_id)
    )

    if not chunks:
        session.commit()
        return 0

    embeddings_model = get_embeddings_model()
    stored = 0
    for i in range(0, len(chunks), EMBED_BATCH_SIZE):
        batch = chunks[i : i + EMBED_BATCH_SIZE]
        vectors = embeddings_model.embed_documents([c.content for c in batch])
        for chunk, vector in zip(batch, vectors, strict=True):
            session.add(
                DocumentChunk(
                    project_id=project_id,
                    file_path=chunk.file_path,
                    language=chunk.language,
                    chunk_index=chunk.chunk_index,
                    start_line=chunk.start_line,
                    end_line=chunk.end_line,
                    content=chunk.content,
                    embedding=vector,
                )
            )
            stored += 1
        session.commit()

    return stored
