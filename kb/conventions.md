# Conventions

How to change this codebase the way it's already written.

## General

- Match the surrounding code: naming, comment density, idiom. Comments
  explain *why* (a constraint, a bug found, a trade-off), not what.
- No dead code, no speculative abstractions, no commented-out blocks.
- Every change that alters behavior updates the knowledge base in the same
  change (see `README.md` → Keeping it true).
- Don't put secrets in code, logs, errors or responses.

## Backend

**A new endpoint**

1. Put it in the router for its area (`app/api/v1/<area>.py`); a new area
   gets a new router file, included in `app/main.py`'s `api_v1_router`.
2. Auth: `current_user: Annotated[User, Depends(get_current_user)]`. Need
   GitHub? Add `token: Annotated[str, Depends(get_github_token)]`.
3. Access: anything organization-owned goes through
   `app/services/organizations.py` — `require_membership(session, org_id,
   user, owner=…)` for org routes, `get_accessible_project(session,
   project_id, user)` for anything under a project. Both 404 (not 403) when
   the user isn't a member, so other organizations' ids don't leak; 403 is
   only "member, but not an owner". List endpoints take `organization_id`.
4. Request bodies are Pydantic `BaseModel`s; errors are `HTTPException`
   with a sentence a user can act on.
5. Slow work: `BackgroundTasks`, and the task opens its own
   `Session(engine)` — the request's session is closed by then.
6. Code on a worker thread can't use `get_redis` (needs a `Request`): use
   `_sync_redis()`.
7. Document it in `backend.md` → Endpoints, and add the path to
   `apps/web/src/api/endpoints.ts` plus a typed function in the matching
   `*.api.ts`.

**A new table or column**

1. Model in `app/models/<name>.py` extending `TimestampModel`
   (`table=True`, explicit `__tablename__`); export it from
   `app/models/__init__.py` so Alembic sees it.
2. `cd apps/api && uv run alembic revision --autogenerate -m "add x"`.
3. **Edit the generated migration**: autogenerate always proposes dropping
   LangGraph's `checkpoint*` tables (they're outside `SQLModel.metadata`).
   Delete those operations every time. For a NOT NULL column on existing
   rows, give it a `server_default`.
4. `bun db:migrate`, then update `architecture.md` → Data model.

**Agent graph changes**

- Nodes are plain functions `(state) -> partial dict`; report progress with
  `_emit(agent, "running" | "done" | "error", detail)` — the web app's
  node boxes are keyed by the node name, so a new node also needs an entry
  in `AGENT_NODES` in `project-detail-page.tsx`.
- New state fields go in `AgentState` (`state.py`).
- Facts code can compute (like the tech stack) are computed and handed to
  the LLM as ground truth, not left for the model to discover.
- Anything that shells out goes through `run_command` with the workspace
  as `workspace_root`; check its returned string, it never raises.
- Never interpolate user/issue text into a shell string without
  `shlex.quote`.

**Python style**: ruff (lint + format), mypy, type hints everywhere,
`Annotated[...]` dependencies, `X | None` not `Optional`.

## Frontend

**A new page**

1. Add the path to `lib/common/paths.ts`.
2. Create `pages/<area>/<name>-page.tsx` exporting `<Name>Page`.
3. Register it in `router.ts` under the right layout (`AppLayout` = signed
   in and onboarded, `OnboardingLayout`, `PublicLayout`, `AuthLayout`) with
   `lazy`, `ErrorBoundary: RouteErrorBoundary`, and for app pages
   `handle: { title }` (the top bar's breadcrumb).
4. App pages: `<div className="mx-auto flex w-full max-w-6xl flex-col gap-8
   px-4 py-8 sm:px-6">` (or `max-w-3xl` for forms) starting with
   `<PageHeader eyebrow title description actions />`. A new sidebar
   section goes in `lib/common/app-nav.ts` (+ a panel in `app-sidebar.tsx`).
5. Data that belongs to the organization: `useOrganization().current.id`,
   `useOrgProjects` / `useOrgRuns`; after a mutation call
   `notifyOrgDataChanged()` so the sidebar and other lists refresh. Show API
   errors with `describeError(err, fallback)` (`lib/common/api-error.ts`),
   in the form or as a `toast.add({ …, type: "error" })`.
6. Document it in `frontend.md` → Routes.

**Components**: place by size — `atoms` (one element), `molecules`
(a small composed control), `organisms` (a page section), and by feature
folder (`common`, `auth`, `landing`, `application`, …). Use the
`application/*` components and `packages/ui` primitives before building new
ones. Add `data-slot` to the root.

**Styling** (also enforced by `.agents/rules/styling.md`):
- Semantic tokens only (`bg-card`, `text-muted-foreground`, `text-link`,
  run tones…). No raw hex or `bg-zinc-*`. New colors become tokens in
  `globals.css` with light and dark values.
- Fonts: JetBrains Mono inherited everywhere; `font-serif` only on display
  headings. Nothing else.
- Every animation respects `useReducedMotion()`.
- Layouts must work at 390 px wide with no horizontal scroll; in CSS grids
  use `grid-cols-[minmax(0,1fr)]` style tracks so long unbreakable content
  can't widen the column.
- Tailwind only sees literal class names — never build them with template
  strings; use a lookup object of full strings.

**State and data**: no global store; pages fetch through the `api/*`
modules. Auth state only via `useAuth()`, theme via `useTheme()`, storage
via `lib/common/local-storage.ts`.

## Verifying a change

```bash
bun lint && bun typecheck && bun run build    # all workspaces
bun --filter web test                         # frontend unit/component tests
cd apps/api && uv run pytest                  # backend
```

UI changes: run `bun dev` and look at the page in a real browser, light and
dark, desktop and phone width. The web app must be served from
`FRONTEND_URL` (`:5173`) or every API call fails CORS. To screenshot
signed-in pages without a GitHub round trip, mint a short-lived cookie in
the API's environment — `create_access_token({"sub": <user email>})` from
`app/utils/security.py` — and set it as `access_token` on `localhost`
(cookies aren't port-scoped). Never print or commit such a token.

## Commits

- One commit per feature or concern, message `type(scope): summary`
  (`feat(web): …`, `fix(api): …`, `docs(kb): …`, `chore: …`).
- The Husky pre-commit hook runs `bun run format`, then **`git add .`**,
  then lint, typecheck and build. The `git add .` stages *everything* in
  the working tree, so a commit made with the hook always includes every
  pending change. To make focused commits: run `bun run format && bun lint
  && bun typecheck && bun run build` yourself, then commit each group with
  `git commit --no-verify`.
- Don't commit `.env`, `apps/api/workspaces/`, or build output (all
  gitignored).
