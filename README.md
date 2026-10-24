# AI Software Engineer

Point an agent at a GitHub issue. It reads your codebase, proposes a plan
and waits for your approval — then writes the code, runs your tests, reviews
its own diff and opens the pull request. Every step streams live to the
browser.

- **Frontend:** React 19 + Vite + Tailwind 4 (`apps/web`, `packages/ui`)
- **API:** FastAPI + SQLModel + LangGraph (`apps/api`)
- **Data:** Postgres + pgvector, Redis
- **Models:** Gemini, Claude, GPT (platform or your own key) or local Ollama

## Quick start

```bash
bun install
docker compose up -d                       # Postgres :5433, Redis :6379
cp apps/api/.env.example apps/api/.env     # fill in GitHub OAuth, keys
(cd apps/api && uv sync)
bun db:migrate
bun dev                                    # web :5173, api :8000
```

Full setup, environment variables and commands: [`kb/overview.md`](kb/overview.md).

## Documentation

Everything about how this works lives in the knowledge base —
start at [`kb/README.md`](kb/README.md). Coding agents: read
[`AGENTS.md`](AGENTS.md).
