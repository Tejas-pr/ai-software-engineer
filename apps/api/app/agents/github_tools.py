# apps/api/app/agents/github_tools.py
"""Branch/commit/push/PR — the graph's final node, run after review passes."""

from pathlib import Path

import httpx

from app.services.github_api import GITHUB_API, github_headers
from app.tools.terminal import run_command


def create_branch(workspace_root: Path, branch_name: str) -> str:
    return run_command(f"git checkout -b {branch_name}", workspace_root=workspace_root)


def commit_and_push(
    workspace_root: Path, branch_name: str, message: str, token: str
) -> str:
    """Commits all changes and pushes, injecting the token into the push URL
    for this call only (never persisted into the repo's git config)."""
    run_command("git add -A", workspace_root=workspace_root)
    commit_result = run_command(
        f'git -c user.email="agent@ai-swe.local" -c user.name="AI Software Engineer" '
        f'commit -m "{message}"',
        workspace_root=workspace_root,
    )

    remote_result = run_command(
        "git remote get-url origin", workspace_root=workspace_root
    )
    origin_url = (
        remote_result.split("Exit Code: 0")[-1].strip() or remote_result.strip()
    )
    auth_url = origin_url.replace("https://", f"https://x-access-token:{token}@")
    push_result = run_command(
        f"git push {auth_url} {branch_name}", workspace_root=workspace_root
    )
    return f"{commit_result}\n{push_result.replace(token, '***')}"


async def create_pull_request(
    token: str,
    owner: str,
    repo: str,
    head_branch: str,
    base_branch: str,
    title: str,
    body: str,
) -> str:
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            f"{GITHUB_API}/repos/{owner}/{repo}/pulls",
            headers=github_headers(token),
            json={
                "title": title,
                "head": head_branch,
                "base": base_branch,
                "body": body,
            },
        )
        response.raise_for_status()
        return response.json()["html_url"]
