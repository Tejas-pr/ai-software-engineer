# apps/api/app/agents/tech_stack.py
"""
Deterministic tech-stack detection — parses manifest files directly instead
of asking the LLM to discover and faithfully report the stack itself.

Why this exists: a small local model (the free, no-quota option) will
sometimes either skip actually reading package.json or hallucinate its
contents while summarizing — confidently reporting "Vue/Nuxt" for a repo
that's plainly React in its own package.json. A stronger model does this
less, but not never. Rather than hope every model gets grounding right,
compute the fact with code that can't hallucinate and hand it to the
researcher/planner as given context, not something they need to discover.
"""

import json
from pathlib import Path

# framework dependency name -> human label, checked in order (first match wins
# among mutually-exclusive full frameworks; libraries beneath them still get
# listed separately).
JS_FRAMEWORK_MARKERS = [
    ("next", "Next.js"),
    ("nuxt", "Nuxt.js"),
    ("@sveltejs/kit", "SvelteKit"),
    ("svelte", "Svelte"),
    ("vue", "Vue"),
    ("react", "React"),
    ("@angular/core", "Angular"),
    ("express", "Express"),
    ("fastify", "Fastify"),
]
JS_BUILD_TOOL_MARKERS = [("vite", "Vite"), ("webpack", "Webpack"), ("parcel", "Parcel")]


def _detect_js(workspace_root: Path) -> str | None:
    package_json = workspace_root / "package.json"
    if not package_json.exists():
        return None
    try:
        data = json.loads(package_json.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return "Node.js project (package.json present but unparseable)."

    deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
    frameworks = [label for key, label in JS_FRAMEWORK_MARKERS if key in deps]
    build_tools = [label for key, label in JS_BUILD_TOOL_MARKERS if key in deps]
    uses_typescript = "typescript" in deps

    parts = [" + ".join(frameworks) if frameworks else "Node.js"]
    if uses_typescript:
        parts.append("TypeScript")
    stack = " + ".join(parts)
    if build_tools:
        stack += f" (via {' + '.join(build_tools)})"
    return f"{stack}. package.json dependencies: {', '.join(sorted(deps)) or '(none)'}."


def _detect_python(workspace_root: Path) -> str | None:
    pyproject = workspace_root / "pyproject.toml"
    requirements = workspace_root / "requirements.txt"
    if pyproject.exists():
        text = pyproject.read_text(encoding="utf-8", errors="ignore")
        framework = next(
            (name for name in ("fastapi", "django", "flask") if name in text.lower()),
            None,
        )
        return "Python project (pyproject.toml)." + (
            f" Framework: {framework}." if framework else ""
        )
    if requirements.exists():
        text = requirements.read_text(encoding="utf-8", errors="ignore").lower()
        framework = next(
            (name for name in ("fastapi", "django", "flask") if name in text), None
        )
        return "Python project (requirements.txt)." + (
            f" Framework: {framework}." if framework else ""
        )
    return None


def _detect_other(workspace_root: Path) -> str | None:
    if (workspace_root / "Cargo.toml").exists():
        return "Rust project (Cargo.toml)."
    if (workspace_root / "go.mod").exists():
        return "Go project (go.mod)."
    if (workspace_root / "Gemfile").exists():
        return "Ruby project (Gemfile)."
    if (workspace_root / "composer.json").exists():
        return "PHP project (composer.json)."
    return None


def detect_tech_stack(workspace_root: Path) -> str:
    """Best-effort, deterministic — never guesses, only reports what a
    manifest file actually says. Falls back to an honest "couldn't detect"
    rather than a plausible-sounding wrong answer."""
    for detector in (_detect_js, _detect_python, _detect_other):
        result = detector(workspace_root)
        if result:
            return result
    return (
        "No standard manifest file found (package.json/pyproject.toml/"
        "requirements.txt/Cargo.toml/go.mod/Gemfile/composer.json) — "
        "inspect the file structure directly to determine the stack."
    )
