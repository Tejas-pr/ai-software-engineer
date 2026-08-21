# apps/api/app/tools/filesystem.py
from pathlib import Path

# Restrict file access to this workspace directory for safety
WORKSPACE_ROOT = Path.cwd()


def read_file(file_path: str) -> str:
    """Reads the contents of a file inside the project workspace."""
    try:
        # Resolve target path and ensure it's strictly inside WORKSPACE_ROOT
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
