# apps/api/app/services/github_api.py
"""
Thin async wrappers around the GitHub REST API, shared by:
- app/api/v1/github.py   (list repos, for the repo picker)
- app/api/v1/projects.py (list issues, for the issue picker)
- app/agents/github_tools.py (branch/commit/PR — added in M5)

Same request pattern `auth.py` already uses for the OAuth profile/email
calls (httpx + `Authorization: token ...`) — centralized here instead of
copy-pasted per call site.
"""

import httpx

GITHUB_API = "https://api.github.com"


def github_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"token {token}", "Accept": "application/vnd.github+json"}


def parse_github_url(github_url: str) -> tuple[str, str]:
    """Extract (owner, repo) from a GitHub URL, with or without .git/trailing slash."""
    cleaned = github_url.strip().rstrip("/")
    cleaned = cleaned.removesuffix(".git")
    parts = cleaned.split("/")
    if len(parts) < 2:
        raise ValueError(f"Not a valid GitHub repo URL: {github_url}")
    return parts[-2], parts[-1]


async def list_user_repos(token: str) -> list[dict]:
    """List repos the authenticated user owns or collaborates on, most recently updated first."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{GITHUB_API}/user/repos",
            headers=github_headers(token),
            params={"sort": "updated", "per_page": 50},
        )
        response.raise_for_status()
        return response.json()


async def list_repo_issues(token: str, owner: str, repo: str) -> list[dict]:
    """List open issues for a repo (pull requests excluded)."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/issues",
            headers=github_headers(token),
            params={"state": "open", "per_page": 50},
        )
        response.raise_for_status()
        # The issues endpoint also returns PRs; they carry a "pull_request" key.
        return [issue for issue in response.json() if "pull_request" not in issue]
