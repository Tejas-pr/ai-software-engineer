# Agent guide

You're working on **AI Software Engineer**, built by Tejas-pr
(https://github.com/Tejas-pr): a web app where a user signs in with
GitHub, sets up an organization and a model (their own API key or local
Ollama), connects repos, and a LangGraph team of agents researches, plans
(pausing for the user's approval), codes, tests and opens a pull request —
streamed live to the browser. Keep the "Built by" attribution intact.

## Before you change anything

1. Read `kb/README.md`, then `kb/overview.md` and `kb/architecture.md`.
2. Read `kb/backend.md` before touching `apps/api`, `kb/frontend.md` before
   touching `apps/web` or `packages/ui`, `kb/conventions.md` before writing
   code, `kb/known-issues.md` before planning work.
3. The kb is written to be enough on its own. If you find it wrong or
   missing something you needed, fix it as part of your change.
4. `implementation/todo.md` is the working plan: remaining tasks.
   Tick items off (and add new ones) as you go.

## Ground rules

- **Keep `kb/` true.** Any change to behavior, an endpoint, a table, a
  route, a component pattern or a known issue updates the matching kb file
  in the same change. This is not optional.
- Match the existing code: structure, naming, comment style (comments say
  *why*). No dead code, no unused files, no speculative abstractions.
- Frontend styling: semantic tokens only; **JetBrains Mono** everywhere and
  **Instrument Serif** (`font-serif`) only for display headings; respect
  reduced motion; must work at 390 px. Details: `.agents/rules/styling.md`,
  `kb/frontend.md`.
- Backend: ownership checks on every row access (404 for other users'),
  secrets never logged/returned, shell input `shlex.quote`d, migrations
  hand-checked (autogenerate wants to drop LangGraph's tables).
- Never commit `.env`, `apps/api/workspaces/` or build output.

## Verify before you say it's done

```bash
bun lint && bun typecheck && bun run build
cd apps/api && uv run pytest        # needs docker compose services
```

For UI work, run `bun dev` and check the page in a browser (light + dark,
desktop + phone width) — the web app must be on `:5173` or the API rejects
it via CORS.

## Commits

One commit per feature, `type(scope): summary`. The pre-commit hook runs
`git add .`, which stages everything — for focused commits, run the checks
above yourself and use `git commit --no-verify` per group. Only commit when
asked, as the repository owner's configured git identity.

## Where things are

| You need | Look in |
|----------|---------|
| An endpoint | `apps/api/app/api/v1/<area>.py` · `kb/backend.md` |
| Access rules (orgs, members) | `apps/api/app/services/organizations.py` · `kb/architecture.md` |
| The agent pipeline | `apps/api/app/agents/graph.py` · `kb/backend.md` → agent graph |
| Tables | `apps/api/app/models/` · `kb/architecture.md` → data model |
| A page / route | `apps/web/src/router.ts`, `src/pages/` · `kb/frontend.md` → routes |
| The dashboard shell | `apps/web/src/layouts/app-layout.tsx`, `components/organisms/common/app-sidebar.tsx` |
| Design-system components | `apps/web/src/components/molecules/application/` |
| Theme tokens, fonts | `packages/ui/src/styles/globals.css` |
| Auth / session | `apps/web/src/providers/auth/`, `apps/api/app/api/v1/auth.py` |
