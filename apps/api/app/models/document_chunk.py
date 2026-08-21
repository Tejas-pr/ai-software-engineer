# apps/api/app/models/document_chunk.py
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column
from sqlmodel import Field, Relationship

from app.models.base import TimestampModel
from app.models.project import Project


class DocumentChunk(TimestampModel, table=True):
    __tablename__ = "document_chunks"

    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="projects.id", index=True)
    file_path: str = Field(index=True)
    language: str
    chunk_index: int
    start_line: int
    end_line: int
    content: str

    # 768 dimensions fits standard Google and Ollama embeddings
    embedding: Any = Field(sa_column=Column(Vector(768)))

    project: Project = Relationship()
