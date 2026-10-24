# Implementation plan

The working tracker: what's built, what's next. Tick items off as they
land and add new ones under **Next**. How things work lives in `kb/` (start
at `kb/README.md`); this file is only status.

_Last updated: 2026-10-24._

## Done

### M1–M9 — the agent platform (before this round)

- [x] M1 Foundations — LangChain provider adapter (Gemini / Claude / GPT /
      Ollama), sandboxed workspace tools, GitHub OAuth with `repo` scope and
      an encrypted token, repo listing, projects (clone in background),
      issue picker
- [x] M2 Codebase RAG — chunking, 768-d embeddings, pgvector search, the
      agentic `search_codebase` tool
- [x] M3 LangGraph graph — researcher → planner → coder ⇄ tester →
      reviewer, self-correction loop (3 repairs), real end-to-end test
- [x] M4 Human in the loop — `interrupt()` approval, Postgres checkpointer,
      approve / request changes / reject
- [x] M5 GitHub — branch, commit, push (token per call, redacted), PR
- [x] M6 Frontend run view — live SSE node boxes, approval panel, history
- [x] M7 Explanation docs (now `kb/explain.md`, `kb/buzz.md`)
- [x] M8 Bring your own key — encrypted per-user provider keys
- [x] M9 Live-testing fixes — retry from checkpoint, cancel, reattachable
      streams via Redis, UUID workspaces, workspace reset/cleanup,
      deterministic tech-stack detection

### Round 2 — product shell, organizations, docs

Frontend foundation
- [x] Warm paper/ink + amber theme; JetBrains Mono everywhere, Instrument
      Serif for display headings; dark mode with the caret theme-switch
      animation (`D` toggles)
- [x] SmartGrow primitives ported into `packages/ui`; the 12 application
      components ported, de-i18n'd and restyled
- [x] Atomic folder structure, data router with lazy pages, skeletons,
      route transitions, error boundary

Auth and onboarding
- [x] GitHub sign in / sign up pages, callback that returns you to your
      page, `/logout` page; 401 → refresh → signed out (no hard redirects);
      `/me` retries non-401 failures
- [x] Required onboarding: organization → model access (API key verified
      with the provider, or local Ollama when available) → optional first
      repo → dashboard

Organizations and dashboard
- [x] Organizations with owner/member roles, personal org per user,
      backfill migration `9a7c2e41d5b3`; projects and runs scoped by
      membership
- [x] shadcn sidebar-09 shell: icon rail + section panel, org switcher,
      create organization, user menu
- [x] Overview (30-day usage from real runs, alerts, repositories
      list/grid), repositories management (connect, re-index, retry,
      disconnect), runs table, members, organization settings, API keys,
      profile
- [x] Repos are indexed automatically after clone (`index_status`)
- [x] Project page reattaches to a live run after reload; `?run=<id>`

Public pages
- [x] Landing (hero with animated run log, how it works, features, models,
      self-host, CTA)
- [x] `/agents` — the six agents from the API's live catalog (also in-app)
- [x] `/setup` — self-host guide with local Ollama models

Backend fixes
- [x] `files_changed` from the real git diff; planner told test commands
      must terminate; model client cache cleared on key change; rate limit
      raised to 300/min

Attribution, docs, cleanup
- [x] "Built by Tejas-pr" on every footer/sidebar, author meta, console
      signature, `X-Built-By` API header, package `author` fields
- [x] `docs/` → `kb/` knowledge base (overview, architecture, backend,
      frontend, conventions, known issues), `AGENTS.md` / `CLAUDE.md`,
      `.agents/rules` (styling, knowledge base)
- [x] Removed dead files (template README, unused image, stale summary,
      nonexistent auth endpoints)
- [x] Tests: `tests/test_organizations.py` (access, owner rules,
      onboarding gates, key verification)

### Round 3 — Testing, Dockerization & Caddy gateway

- [x] Frontend test suite: Vitest + React Testing Library configured in
      `apps/web`, unit tests for `status`, `dates`, `api-error`, and component
      tests for `BuiltBy` and `ApplicationBadge`.
- [x] Backend test suite: comprehensive API tests for `projects`
      (`test_projects.py`) and `agent runs` (`test_runs.py`) covering access
      rules, organization scoping, catalog, retry, cancel, and approval.
- [x] Dockerization: production-ready multi-stage Dockerfiles for `apps/api`
      (uv, python 3.13, git, automatic migrations on start) and `apps/web`
      (Bun build + Caddy static server).
- [x] Unified `docker-compose.yml`: brings up `db` (Postgres 17 pgvector),
      `redis` (Redis 7), `api`, `web`, and `caddy` with health checks,
      persisted volumes, and migrations on startup.
- [x] Caddy reverse proxy: single-origin gateway on ports 80/443 with local
      HTTPS, unbuffered SSE stream forwarding (`flush_interval -1`) for
      `/api/*` and SPA routing for frontend.

## Next

Product
- [ ] Choose a LICENSE (none yet = all rights reserved). If others may use
      it, an attribution license (e.g. Apache-2.0 + NOTICE) keeps the
      "Built by Tejas-pr" credit legally required
- [ ] Live coder view: per-file events from the coder's tools, a full-page
      feed at `/projects/:id/runs/:runId/live` (`kb/live-run-plan.md` #4)
- [ ] Email invitations to organizations (today: add by GitHub username of
      someone who has signed in once)
- [ ] Organization slug in URLs (`/:org/...`) instead of per-browser choice
- [ ] Record token usage per run → cost on the usage panel
- [ ] Per-organization shared API keys (today keys are per user)
- [ ] Restyle the project detail (run) page with the new components
      (it still uses its original layout inside the new shell)

Reliability and hardening (see `kb/known-issues.md`)
- [ ] Cancel that interrupts the running node, not just between steps
- [ ] Container per run — the shell tool isn't a real sandbox
- [ ] Revocable refresh tokens (the `refresh_tokens` table is unused)
- [ ] OAuth callback errors redirect back to `/login?error=github` instead
      of returning JSON
- [ ] Make `test_m4_approval` independent of local-model tool-calling
      reliability (it loops on small Ollama models)
