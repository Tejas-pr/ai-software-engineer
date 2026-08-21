# apps/api/app/tools/filesystem.py
import os
from pathlib import Path

WORKSPACE_ROOT = Path.cwd()


def read_file(file_path: str) -> str:
    """Reads the contents of a file inside the project workspace."""
    try:
        target_path = (WORKSPACE_ROOT / file_path).resolve()
        if not target_path.is_relative_to(WORKSPACE_ROOT):
            return (
                "Error: Access denied. Cannot read files outside the project workspace."
            )
        if ".env" in target_path.name:
            return "Error: Access denied. Cannot read environment configuration files."
        if not target_path.exists() or not target_path.is_file():
            return f"Error: File '{file_path}' does not exist."

        with open(target_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:  # noqa: BLE001
        return f"Error reading file: {e!s}"


def list_files(directory: str = ".") -> str:
    """Lists files inside the project workspace (skips node_modules/venv/.git)."""
    try:
        target_path = (WORKSPACE_ROOT / directory).resolve()
        if not target_path.is_relative_to(WORKSPACE_ROOT):
            return "Error: Access denied. Cannot list directories outside workspace."
        if not target_path.exists() or not target_path.is_dir():
            return f"Error: Directory '{directory}' does not exist."

        files_list = []
        for root, dirs, files in os.walk(target_path):
            # Exclude directories we don't want the agent wandering into
            dirs[:] = [
                d
                for d in dirs
                if not d.startswith(".")
                and d not in ("node_modules", "venv", "__pycache__", "dist", "build")
            ]
            for file in files:
                if file.startswith(".") or ".env" in file:
                    continue
                full_path = Path(root) / file
                rel_path = full_path.relative_to(WORKSPACE_ROOT)
                files_list.append(str(rel_path))

        if not files_list:
            return f"No files found in '{directory}'."
        return "\n".join(files_list)
    except Exception as e:  # noqa: BLE001
        return f"Error listing files: {e!s}"


def search_code(query: str) -> str:
    """Searches for occurrences of query text in workspace code files."""
    try:
        results = []
        ignore_exts = {
            ".png",
            ".jpg",
            ".jpeg",
            ".gif",
            ".ico",
            ".pdf",
            ".pyc",
            ".db",
            ".sqlite",
            ".zip",
        }

        for root, dirs, files in os.walk(WORKSPACE_ROOT):
            dirs[:] = [
                d
                for d in dirs
                if not d.startswith(".")
                and d not in ("node_modules", "venv", "__pycache__")
            ]
            for file in files:
                if file.startswith(".") or ".env" in file:
                    continue
                file_path = Path(root) / file
                if file_path.suffix.lower() in ignore_exts:
                    continue

                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        for line_num, line in enumerate(f, 1):
                            if query in line:
                                rel_path = file_path.relative_to(WORKSPACE_ROOT)
                                results.append(f"{rel_path}:{line_num}: {line.strip()}")
                                if len(results) >= 50:  # Prevent token output blowout
                                    break
                except Exception:  # noqa: BLE001, S112
                    continue
            if len(results) >= 50:
                break

        if not results:
            return f"No matches found for '{query}'."
        suffix = "\n(Truncated after 50 matches)" if len(results) >= 50 else ""
        return "\n".join(results) + suffix
    except Exception as e:  # noqa: BLE001
        return f"Error searching code: {e!s}"
