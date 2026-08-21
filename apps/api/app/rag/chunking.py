# apps/api/app/rag/chunking.py
"""
Turns a cloned repo into a flat list of (file, line-range, text) chunks
ready to embed.

Deliberately the simplest thing that works: fixed line windows with a
little overlap, no AST parsing. BUILDER.md's own rule is "build manual RAG
before reaching for a framework's RAG abstraction" — this is that manual
step. A tree-sitter-based chunker that splits on function/class boundaries
would retrieve more precisely, but it's a swap-in upgrade behind the same
`chunk_workspace()` signature later, not a prerequisite to get RAG working.
"""

import os
from dataclasses import dataclass
from pathlib import Path

CHUNK_LINES = 60
CHUNK_OVERLAP = 10

# BUILDER.md's ignore list.
IGNORED_DIRS = {
    "node_modules",
    ".git",
    "dist",
    "build",
    "coverage",
    "venv",
    ".venv",
    "__pycache__",
}

# BUILDER.md's supported-language list.
LANGUAGE_BY_EXT = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".py": "python",
    ".json": "json",
    ".md": "markdown",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".sql": "sql",
}


@dataclass
class Chunk:
    file_path: str
    language: str
    chunk_index: int
    start_line: int
    end_line: int
    content: str


def chunk_workspace(workspace_root: Path) -> list[Chunk]:
    """Walk `workspace_root` and chunk every supported source file."""
    chunks: list[Chunk] = []
    for root, dirs, files in os.walk(workspace_root):
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS and not d.startswith(".")]
        for filename in files:
            if ".env" in filename:
                continue
            path = Path(root) / filename
            language = LANGUAGE_BY_EXT.get(path.suffix.lower())
            if language is None:
                continue
            rel_path = str(path.relative_to(workspace_root))
            chunks.extend(_chunk_file(path, rel_path, language))
    return chunks


def _chunk_file(path: Path, rel_path: str, language: str) -> list[Chunk]:
    try:
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    except OSError:
        return []
    if not lines:
        return []

    chunks: list[Chunk] = []
    step = CHUNK_LINES - CHUNK_OVERLAP
    start = 0
    index = 0
    while start < len(lines):
        end = min(start + CHUNK_LINES, len(lines))
        content = "\n".join(lines[start:end])
        if content.strip():
            chunks.append(
                Chunk(
                    file_path=rel_path,
                    language=language,
                    chunk_index=index,
                    start_line=start + 1,
                    end_line=end,
                    content=content,
                )
            )
            index += 1
        if end == len(lines):
            break
        start += step
    return chunks
