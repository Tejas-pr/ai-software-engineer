# Knowledge base

Everything a new contributor — human or agent — needs to work on this repo
without reading the code first. Each file is written against the code as it
is now; where the code and these docs disagree, the code wins and the doc is
a bug to fix in the same change.

## Reading order

| # | File | Read it when |
|---|------|--------------|
| 1 | [`overview.md`](overview.md) | Always, first. What the product is, the stack, repo layout, how to run everything. |
| 2 | [`architecture.md`](architecture.md) | Before touching anything that crosses frontend ↔ API ↔ graph. The life of a run end to end, data model, Redis keys, status machines. |
| 3 | [`backend.md`](backend.md) | Before changing `apps/api`. Every module, every endpoint, the agent graph node by node, tools, LLM routing, RAG, security. |
| 4 | [`frontend.md`](frontend.md) | Before changing `apps/web` or `packages/ui`. Structure, routing, auth/session, theme and typography, motion, component library. |
| 5 | [`conventions.md`](conventions.md) | Before writing code. How to add an endpoint, model, migration, page; verification; commits. |
| 6 | [`known-issues.md`](known-issues.md) | Before planning work. Real gaps, gotchas found the hard way, and the backlog. |

Background, not required reading:

- [`explain.md`](explain.md) — the project as a narrative: design decisions
  and why, written for explaining it (demo, interview).
- [`buzz.md`](buzz.md) — glossary of every AI term used here, tied to where
  it appears in the code.
- [`live-run-plan.md`](live-run-plan.md) — design record for reattachable
  run streams (done) and the live coder view (not started).
- [`ollama.md`](ollama.md) — running local models with Ollama.

`BUILDER.md` (repo root) is the original product spec this was built
against; code comments cite it ("BUILDER's ignore list"). Treat it as
history and intent, not as a description of what exists.

## Keeping it true

Changing behavior means updating the matching file here in the same change:
a new endpoint → `backend.md`; a new route or component pattern →
`frontend.md`; a new table, Redis key or status → `architecture.md`; a gap
found or fixed → `known-issues.md`. A stale knowledge base is worse than
none, because it is trusted.
