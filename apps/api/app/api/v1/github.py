from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import get_github_token
from app.services.github_api import list_user_repos

router = APIRouter(prefix="/github", tags=["github"])


@router.get("/repos")
async def list_repos(token: Annotated[str, Depends(get_github_token)]):
    """List the current user's GitHub repos, for the repo-connect picker."""
    repos = await list_user_repos(token)
    return [
        {
            "name": r["full_name"],
            "url": r["html_url"],
            "private": r["private"],
            "default_branch": r["default_branch"],
            "description": r.get("description"),
        }
        for r in repos
    ]
