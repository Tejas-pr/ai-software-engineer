# apps/api/app/services/workspace.py
"""Clones a connected repo into its per-project workspace directory."""

import shutil
import subprocess
import uuid
from pathlib import Path
from urllib.parse import urlparse

from app.config import settings


def workspace_path(workspace_id: uuid.UUID) -> Path:
    # Named by the project's `workspace_id` (an opaque UUID), not its
    # sequential DB `id` — see Project.workspace_id's docstring.
    return Path(settings.WORKSPACES_ROOT).resolve() / str(workspace_id)


def clone_repository(
    github_url: str, branch: str, token: str, workspace_id: uuid.UUID
) -> None:
    """Clone `github_url` at `branch` into that project's workspace dir.

    The token is embedded in the clone URL (standard way to authenticate a
    non-interactive `git clone` over HTTPS) so this works for private repos
    too. Raises on failure — caller marks the project 'failed'.
    """
    dest = workspace_path(workspace_id)
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
        stderr = result.stderr.replace(
            token, "***"
        )  # git echoes the auth URL on failure
        if "Remote branch" in stderr and "not found" in stderr:
            raise RuntimeError(
                f"Branch '{branch}' not found — this repo may be empty "
                "(push at least one commit before connecting it)."
            )
        raise RuntimeError(f"git clone failed: {stderr}")


def reset_workspace(workspace_root: Path, branch: str) -> None:
    """Resets a project's workspace to a clean checkout of `branch` before a
    new agent run starts.

    The workspace directory is reused across every run of a project (one
    clone, not one per run — see `clone_repository`'s docstring), so
    without this, an aborted or failed run's half-written files (or a stray
    local branch left over from a previous `github_node` PR attempt) would
    leak into the next run instead of it starting from a known-good state.
    `git clean -fd` also keeps disk usage bounded — it's what stops old
    runs' scratch files from accumulating forever.
    """
    if not workspace_root.exists():
        return  # nothing cloned yet — caller's clone step handles this case

    def _run(*args: str) -> subprocess.CompletedProcess:
        return subprocess.run(
            ["git", *args],
            cwd=workspace_root,
            capture_output=True,
            text=True,
            timeout=60.0,
            check=False,
        )

    # Discard any uncommitted changes and untracked files from the previous
    # run first — `checkout`/`reset` alone leave untracked files behind.
    _run("clean", "-fd")
    _run("checkout", branch)
    fetch = _run("fetch", "origin", branch)
    if fetch.returncode != 0:
        raise RuntimeError(f"git fetch failed: {fetch.stderr}")
    reset = _run("reset", "--hard", f"origin/{branch}")
    if reset.returncode != 0:
        raise RuntimeError(f"git reset failed: {reset.stderr}")
    _run("clean", "-fd")


def delete_workspace(workspace_root: Path) -> None:
    """Removes a project's workspace directory entirely — called when the
    project itself is deleted, so disconnected/removed projects don't leave
    their clone sitting on disk forever."""
    shutil.rmtree(workspace_root, ignore_errors=True)
