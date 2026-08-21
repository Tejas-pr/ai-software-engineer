# apps/api/app/services/workspace.py
"""Clones a connected repo into its per-project workspace directory."""

import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlparse

from app.config import settings


def workspace_path(project_id: int) -> Path:
    return Path(settings.WORKSPACES_ROOT).resolve() / str(project_id)


def clone_repository(github_url: str, branch: str, token: str, project_id: int) -> None:
    """Clone `github_url` at `branch` into that project's workspace dir.

    The token is embedded in the clone URL (standard way to authenticate a
    non-interactive `git clone` over HTTPS) so this works for private repos
    too. Raises on failure — caller marks the project 'failed'.
    """
    dest = workspace_path(project_id)
    if dest.exists():
        shutil.rmtree(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)

    parsed = urlparse(github_url)
    auth_url = parsed._replace(
        netloc=f"x-access-token:{token}@{parsed.netloc}"
    ).geturl()

    result = subprocess.run(
        ["git", "clone", "--branch", branch, "--depth", "1", auth_url, str(dest)],
        capture_output=True,
        text=True,
        timeout=120.0,
        check=False,
    )
    if result.returncode != 0:
        # git echoes the auth_url (with token) into stderr on failure — strip it.
        raise RuntimeError(f"git clone failed: {result.stderr.replace(token, '***')}")
