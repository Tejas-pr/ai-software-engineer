---
trigger: always_on
---

# Knowledge base rules

`kb/` is the project's knowledge base: it must let a new agent understand
and safely change this codebase without reading the code first.

- **Read before acting:** `kb/README.md` → `overview.md` →
  `architecture.md`, then `backend.md` / `frontend.md` for the area you're
  touching, `conventions.md` before writing code, `known-issues.md` before
  planning.
- **Update in the same change.** New or changed endpoint → `backend.md`.
  Route, page, component pattern, token → `frontend.md`. Table, column,
  Redis key, status, run lifecycle → `architecture.md`. A new rule or
  workflow → `conventions.md`. A gap found or fixed → `known-issues.md`.
- Write what the code does now, verified against the code — not what it
  was meant to do. Name files and functions so a reader can find them.
- Don't create new top-level docs elsewhere; extend `kb/` and link the new
  file from `kb/README.md`.
