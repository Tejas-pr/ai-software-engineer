"""Unit test for deterministic tech-stack detection — the fix for the LLM
hallucinating a project's framework (e.g. reporting "Vue/Nuxt" for a repo
whose package.json plainly lists react/react-dom and nothing Vue-related)."""

from pathlib import Path

from app.agents.tech_stack import detect_tech_stack


def test_detects_react_vite_project(tmp_path: Path):
    (tmp_path / "package.json").write_text(
        '{"dependencies": {"react": "^19.0.0", "react-dom": "^19.0.0"}, '
        '"devDependencies": {"vite": "^8.0.0", "typescript": "~6.0.0"}}'
    )
    stack = detect_tech_stack(tmp_path)
    assert "React" in stack
    assert "Vite" in stack
    assert "TypeScript" in stack
    assert "Vue" not in stack
    assert "Nuxt" not in stack


def test_detects_python_fastapi_project(tmp_path: Path):
    (tmp_path / "pyproject.toml").write_text(
        '[project]\ndependencies = ["fastapi>=0.100", "uvicorn"]\n'
    )
    stack = detect_tech_stack(tmp_path)
    assert "Python" in stack
    assert "fastapi" in stack.lower()


def test_no_manifest_gives_an_honest_unknown(tmp_path: Path):
    stack = detect_tech_stack(tmp_path)
    assert "No standard manifest file found" in stack
