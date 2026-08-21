# apps/api/app/rag/retrieval.py
"""Semantic search over one project's indexed chunks."""

from sqlmodel import Session, select

from app.models.document_chunk import DocumentChunk
from app.rag.embeddings import get_embeddings_model

DEFAULT_TOP_K = 8


def search_chunks(
    session: Session, project_id: int, query: str, top_k: int = DEFAULT_TOP_K
) -> list[DocumentChunk]:
    """Embed `query` and return the top-k most similar chunks for this project.

    pgvector's `<=>` operator computes cosine *distance* (0 = identical,
    2 = opposite) directly in the database — `ORDER BY distance LIMIT k` lets
    Postgres do the nearest-neighbor search instead of pulling every chunk's
    vector into Python and comparing there.
    """
    query_vector = get_embeddings_model().embed_query(query)
    statement = (
        select(DocumentChunk)
        .where(DocumentChunk.project_id == project_id)
        .order_by(DocumentChunk.embedding.cosine_distance(query_vector))
        .limit(top_k)
    )
    return list(session.exec(statement).all())
