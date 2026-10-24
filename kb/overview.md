# Overview

## What the product is

A web app where a user signs in with GitHub, sets up an organization and a
model (their own Gemini / Claude / OpenAI key, or local Ollama), connects
repositories, and hands a task (typed, or picked from the repo's open
issues) to a team of LLM agents. The agents research the codebase, propose a
plan, **pause for the user's approval**, then write code, run the project's
tests (fixing failures up to 3 times), review the result and open a pull
request on a new branch. The user watches every step live in the browser and
can request plan changes, reject, retry a failed run from where it stopped,
or cancel.

Models: Google Gemini (the platform default, via a server key), Anthropic
Claude and OpenAI GPT (via the user's own key, or a server key if one is
configured), or any local Ollama model (no key).

## Stack

| Layer | Tech |
|-------|------|
| Monorepo | Bun workspaces + Turborepo (`apps/*`, `packages/*`) |
| Frontend | React 19, Vite 8, TypeScript 6, React Router 7 (data router), Tailwind CSS 4, Base UI primitives (shadcn "base" style), `motion` for animation |
| Shared UI | `packages/ui` (`@workspace/ui`) — primitives + `globals.css` theme |
| API | Python 3.13, FastAPI, SQLModel/SQLAlchemy, Alembic, managed with `uv` |
| Agents | LangChain 1.x + LangGraph (StateGraph, `interrupt`, Postgres checkpointer) |
| Data | Postgres 17 + pgvector (Docker, port **5433**), Redis 7 (port 6379) |
| Auth | GitHub OAuth → JWT in httpOnly cookies |

## Repo layout

```
.
├── apps/
│   ├── api/                 FastAPI backend (see backend.md)
│   │   ├── app/
│   │   │   ├── agents/      LangGraph graph, nodes, tools, LLM factory, checkpointer
│   │   │   ├── api/v1/      HTTP routers (auth, projects, agent, settings, github, chat, system)
│   │   │   ├── models/      SQLModel tables
│   │   │   ├── rag/         chunk → embed → pgvector retrieval
│   │   │   ├── services/    workspace git ops, GitHub REST, Ollama, BYOK lookup, raw LLM (chat console)
│   │   │   ├── tools/       sandboxed filesystem + shell primitives
│   │   │   └── utils/       Fernet crypto, JWT helpers
│   │   ├── migrations/      Alembic versions
│   │   ├── tests/           pytest (several hit real Postgres / a real LLM)
│   │   └── workspaces/      cloned user repos at runtime (gitignored)
│   └── web/                 React frontend (see frontend.md)
│       └── src/             atomic-design folders, layouts, pages, providers
├── packages/ui/             shared primitives + theme (globals.css)
├── kb/                      this knowledge base
├── implementation/          the owner's working plan — what's done, what's next
├── .agents/                 agent rules and installed skills
├── AGENTS.md / CLAUDE.md    entry point for coding agents
├── BUILDER.md               original product spec (history/intent)
├── Caddyfile                reverse proxy for single origin (HTTPS :443, HTTP :80)
├── docker-compose.yml       full stack: Postgres (pgvector), Redis, API, Web, Caddy
└── TO_LEARN/                the owner's personal study notes — not project source
```

## Running it locally

### Option A: All-in-one with Docker & Caddy (recommended)

One command brings up Postgres, Redis, API (runs migrations on start), Web, and Caddy:

```bash
cp .env.example .env                         # provide GITHUB_CLIENT_ID/SECRET and keys
docker compose up --build                    # whole stack served on http://localhost
```

Caddy sits in front on port 80 and 443 with automatic local HTTPS, routing `/api/*` to the FastAPI backend and everything else to the frontend SPA — eliminating CORS and cookie path mismatches.

### Option B: Local development processes

Prerequisites: Bun ≥ 1.3, Node ≥ 20, Python 3.13 + `uv`, Docker, Git.
Optional: Ollama (local models, see `ollama.md`). The same steps, written
for end users, are the app's public `/setup` page.

```bash
bun install                                  # JS deps for every workspace
docker compose up -d db redis                # Postgres :5433, Redis :6379
cp apps/api/.env.example apps/api/.env       # then fill it in (below)
(cd apps/api && uv sync)                     # Python deps
bun db:migrate                               # alembic upgrade head
bun dev                                      # turbo: web on :5173, api on :8000
```

`apps/api/.env` — the values that matter:

| Var | Notes |
|-----|-------|
| `DATABASE_URL` | `postgresql+psycopg://ai_swe_user:ai_swe_password@localhost:5433/ai_swe_db` for the compose DB |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | A GitHub OAuth app whose callback is `GITHUB_REDIRECT_URI` |
| `GITHUB_REDIRECT_URI` | `http://localhost:8000/api/v1/accounts/auth/github/callback` |
| `FRONTEND_URL` | Defaults to `http://localhost:5173`. The **only** CORS origin, and where the OAuth callback redirects. Serving the web app on another port breaks every API call with CORS errors. |
| `TOKEN_ENCRYPTION_KEY` | Fernet key: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`. Required — GitHub tokens and BYOK keys can't be stored without it. |
| `JWT_SECRET` | Anything long and random; must change in production (validated). |
| `GEMINI_API_KEY` | Platform default model + the embeddings model. Without it, embeddings fall back to Ollama `nomic-embed-text`. |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` | Optional platform keys. Users can bring their own instead. |
| `OLLAMA_BASE_URL` | `http://localhost:11434` |

The web app reads `VITE_API_URL` (default `http://localhost:8000`).

## Everyday commands

| Command (repo root) | Does |
|---------------------|------|
| `bun dev` | Web + API dev servers |
| `bun lint` / `bun typecheck` / `bun run build` | Turbo across workspaces (web: eslint, tsc, vite build; api: ruff, mypy) |
| `bun --filter web test` / `bun run test` | Frontend Vitest unit and component tests |
| `bun run format` | Prettier (web/ui) and `ruff format` (api) |
| `bun db:generate` | `alembic revision --autogenerate` — read `conventions.md` first |
| `bun db:migrate` / `bun db:rollback` / `bun db:status` | Alembic upgrade / downgrade one / current |
| `cd apps/api && uv run pytest` | API tests (some need live Postgres, Redis, a model key) |

The Husky pre-commit hook runs `bun run format`, **`git add .`**, lint,
typecheck and build — see `conventions.md` before committing.
