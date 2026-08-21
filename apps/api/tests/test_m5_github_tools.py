"""M5 smoke test: branch + commit plumbing against a real local git repo
(no network — push/PR creation reuses the already-tested github_api.py
request pattern and needs a real token+repo, out of scope for a unit test)."""

from pathlib import Path

from app.agents.github_tools import create_branch
from app.tools.terminal import run_command


def test_create_branch_on_a_real_repo(tmp_path: Path):
    run_command("git init -q", workspace_root=tmp_path)
    run_command(
        'git -c user.email="t@t.com" -c user.name="t" commit --allow-empty -q -m init',
        workspace_root=tmp_path,
    )

    result = create_branch(tmp_path, "ai-agent/test-branch")
    assert "Exit Code: 0" in result or "successfully" in result.lower()

    branch_check = run_command("git branch --show-current", workspace_root=tmp_path)
    assert "ai-agent/test-branch" in branch_check
