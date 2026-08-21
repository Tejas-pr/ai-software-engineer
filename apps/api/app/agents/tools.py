# apps/api/app/agents/tools.py
"""
LangChain tool wrappers around the existing filesystem/terminal functions,
each bound to one project's workspace directory.

`app/tools/filesystem.py` and `app/tools/terminal.py` do the real work and
now take an explicit `workspace_root` (see M1's sandboxing fix) instead of
defaulting to the whole repo. `@tool` here just gives each function the
name/description/schema LangChain needs to hand it to an LLM as a callable —
the function bodies are reused as-is, not reimplemented.
"""

from pathlib import Path

from langchain_core.tools import BaseTool, tool
from sqlmodel import Session

from app.db import engine
from app.rag.retrieval import search_chunks
from app.tools.filesystem import list_files, read_file, search_code, write_file
from app.tools.terminal import run_command

# Real project builds/tests can run well past the chat console's 15s default.
AGENT_COMMAND_TIMEOUT = 120.0


def make_read_only_tools(workspace_root: Path) -> list[BaseTool]:
    """Read/search tools — for agents (the researcher) that must not modify files."""

    @tool
    def read_file_tool(file_path: str) -> str:
        """Read the contents of a file in the project workspace."""
        return read_file(file_path, workspace_root=workspace_root)

    @tool
    def list_files_tool(directory: str = ".") -> str:
        """List files in a directory of the project workspace."""
        return list_files(directory, workspace_root=workspace_root)

    @tool
    def search_code_tool(query: str) -> str:
        """Search the project workspace for a text pattern, function, or class name."""
        return search_code(query, workspace_root=workspace_root)

    return [read_file_tool, list_files_tool, search_code_tool]


def make_workspace_tools(workspace_root: Path) -> list[BaseTool]:
    """Full read + write + run tool set — for agents (the coder) that make changes."""

    @tool
    def write_file_tool(file_path: str, content: str) -> str:
        """Create or overwrite a file in the project workspace with the given content."""
        return write_file(file_path, content, workspace_root=workspace_root)

    @tool
    def run_command_tool(command: str) -> str:
        """Run a shell command (e.g. tests, build, git) inside the project workspace."""
        return run_command(
            command, workspace_root=workspace_root, timeout=AGENT_COMMAND_TIMEOUT
        )

    return make_read_only_tools(workspace_root) + [write_file_tool, run_command_tool]


def make_search_codebase_tool(project_id: int) -> BaseTool:
    """Semantic (embedding) search over the project's indexed chunks.

    This is the "agentic RAG" piece: unlike `search_code_tool` (exact text
    match), the agent decides *when* a question needs semantic retrieval and
    phrases its own query — e.g. "where is auth token refresh handled?"
    finds relevant code even if it never says the word "refresh".
    """

    @tool
    def search_codebase(query: str) -> str:
        """Semantically search the project's codebase for code relevant to a natural-language query."""
        with Session(engine) as session:
            results = search_chunks(session, project_id, query)
        if not results:
            return "No relevant code found."
        return "\n\n".join(
            f"{r.file_path}:{r.start_line}-{r.end_line}\n{r.content}" for r in results
        )

    return search_codebase
