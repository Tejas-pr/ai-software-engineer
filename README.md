# AI Software Engineer

<p align="center">
  <img src="repo-images/langing-page.png" alt="AI Software Engineer Landing Page" width="100%" />
</p>

<p align="center">
  <strong>An autonomous multi-agent engineering team that turns GitHub issues into production-ready, tested pull requests.</strong><br />
  Researches your repository, drafts an execution plan, pauses for your approval, writes code, verifies tests in an isolated sandbox, reviews diffs, and opens pull requests — streamed live to your browser.
</p>

<p align="center">
  <a href="https://github.com/Tejas-pr/ai-software-engineer"><img src="https://img.shields.io/badge/built%20by-Tejas--pr-amber?style=flat-square" alt="Built by Tejas-pr" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react" alt="React 19" /></a>
  <a href="https://fastapi.tiangolo.com"><img src="https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi" alt="FastAPI" /></a>
  <a href="https://github.com/langchain-ai/langgraph"><img src="https://img.shields.io/badge/LangGraph-Multi--Agent-orange?style=flat-square" alt="LangGraph" /></a>
  <a href="https://ollama.com"><img src="https://img.shields.io/badge/Ollama-Local%20Models-black?style=flat-square&logo=ollama" alt="Ollama" /></a>
  <a href="https://www.postgresql.org"><img src="https://img.shields.io/badge/PostgreSQL-pgvector-336791?style=flat-square&logo=postgresql" alt="PostgreSQL" /></a>
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/Bun-Monorepo-fbf0df?style=flat-square&logo=bun" alt="Bun" /></a>
</p>

---

## Table of Contents

- [Why This Repo?](#why-this-repo)
- [Visual Showcase](#visual-showcase)
- [How It Works: The 7-Step Pipeline](#how-it-works-the-7-step-pipeline)
- [Key Features](#key-features)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Quick Start](#quick-start)
- [Local Models & Hardware Tuning](#local-models--hardware-tuning)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [Attribution & License](#attribution--license)

---

## Why This Repo?

Most AI coding tools are single-prompt chatbots that spray speculative code into your editor. **AI Software Engineer** treats software development as a disciplined, multi-agent lifecycle:

1. **Deterministic Guardrails**: Agents do not write code blindly. The **Planner** writes a structured implementation specification and test harness, then **pauses and waits for human review** via a durable LangGraph interrupt.
2. **Self-Healing Test Verification**: The **Coder** implements file edits in an isolated workspace checkout. The **Tester** executes your repository's native test commands. If tests fail, error stack traces are piped into an autonomous auto-repair loop (up to 3 repair iterations).
3. **100% Offline with Local Models**: Run entirely on your own machine using local [Ollama](https://ollama.com) models (Qwen 2.5 Coder, Llama 3, DeepSeek) with dedicated hardware tuning for Apple Silicon Metal unified memory or NVIDIA CUDA.
4. **Bring Your Own Key (BYOK)**: Use platform-shared credentials or bring your own API keys for Google Gemini, Anthropic Claude, or OpenAI GPT. Keys are encrypted at rest with Fernet and never transmitted back to client browsers.
5. **Real-Time Live Observability**: Every agent decision, file read, bash execution, and test failure streams live to your browser over Server-Sent Events (SSE).

---

## Visual Showcase

<p align="center">
  <img src="repo-images/projects-page.png" alt="Mission Control & Task Launcher" width="100%" />
</p>

*Mission Control: Task launcher, quick suggestions, GitHub issue linking, model selection, live pipeline stepper, and live terminal console.*

---

## How It Works: The 7-Step Pipeline

The multi-agent graph runs sequentially through discrete stages orchestrated by **LangGraph**:

```mermaid
flowchart LR
    A[1. Researcher] --> B[2. Planner]
    B --> C{3. Human Approval}
    C -- Approved --> D[4. Coder]
    C -- Feedback --> B
    C -- Rejected --> END((End))
    D --> E[5. Tester]
    E -- Tests Fail (Max 3) --> D
    E -- Tests Pass --> F[6. Reviewer]
    F --> G[7. GitHub PR]
    G --> Done((Done))
```

| Step | Agent / Stage | Responsibility |
|:---|:---|:---|
| **01** | **Researcher** | Inspects repository tech stack manifests (`package.json`, `pyproject.toml`, etc.), reads code files, and queries semantic vector embeddings via `pgvector` to identify relevant modules. |
| **02** | **Planner** | Generates a structured implementation plan: step-by-step file modifications, architectural reasoning, and the exact test command. |
| **03** | **Human Approval** | **Interrupts graph execution.** Pauses and prompts the user in the UI to approve, provide feedback, or cancel. Feedback loops back to the Planner for revision. |
| **04** | **Coder** | Performs precision file modifications inside an isolated sandbox clone. Emits unified diffs and verifies git status. |
| **05** | **Tester** | Executes repository tests (`npm test`, `pytest`, `cargo test`, etc.). On failure, feeds logs back to the Coder for automated healing. |
| **06** | **Reviewer** | Audits final git diffs, verifies changed files against the plan, and drafts the PR description. |
| **07** | **GitHub** | Creates a dedicated branch (`ai-agent/<slug>-<hex>`), commits changes, pushes to remote, and opens the GitHub Pull Request. |

---

## Key Features

### 🚀 Autonomous Mission Control
- **Issue-to-PR Flow**: Connect GitHub repositories, select open issues with one click, or enter custom development tasks.
- **Interactive Approval Screen**: Review proposed plans and test commands before any code is generated. Leave optional revision notes.
- **Live Output Stream**: Watch real-time terminal output, agent reasoning steps, file diffs, and execution status.
- **Full History & Replays**: Review past agent runs, inspected files, test results, and direct links to opened pull requests.

### ⚡ Hardware & Resource Limits (`/settings/resources`)
- **Live Hardware Telemetry**: Real-time detection of host CPU cores, architecture, RAM usage, and accelerators (Apple Silicon Metal MPS / NVIDIA CUDA).
- **Ollama Engine Tuning**:
  - GPU Layer Offload presets (`99` full offload, `33` partial, `0` CPU only).
  - CPU inference thread tuning (`num_thread`).
  - VRAM budget control (`ollama_vram_budget_gb`).
  - Keep-alive duration in memory (`keep_alive`).
- **Execution Guardrails**:
  - Context window configuration (`8K`, `16K`, `32K`, `64K`, `128K`).
  - Per-run token consumption limits.
  - Hard timeouts and concurrent run caps.
  - Workspace disk quota management and **instant cache prune** to clean temporary git worktrees.

### 🔍 Command Palette & Design System
- **Quick Command Palette (`Cmd+K` / `Ctrl+K`)**: Instant fuzzy search across repositories, tasks, agent runs, settings, and theme toggling.
- **Consistent UI Components**: Built on reusable components (`ApplicationCard`, `ApplicationButton`, `ApplicationSelection`, `ApplicationInput`, `ApplicationBadge`, `ApplicationTable`).
- **Responsive & Accessible**: Designed mobile-first down to 390 px, respecting reduced motion preferences, with semantic dark and light themes.

---

## Architecture & Tech Stack

```
ai-software-engineer/
├── apps/
│   ├── api/                   # Python FastAPI backend & LangGraph agents
│   │   ├── app/
│   │   │   ├── agents/        # Graph workflow, nodes, tools, and prompts
│   │   │   ├── api/v1/        # REST & SSE endpoints (auth, projects, runs, settings)
│   │   │   ├── models/        # SQLModel database tables
│   │   │   └── services/      # GitHub, indexing, Ollama, and telemetry services
│   │   └── migrations/        # Alembic database migrations
│   └── web/                   # React 19 single-page frontend
│       ├── src/
│       │   ├── components/    # Molecules (ApplicationCard, Input, Selection, etc.)
│       │   ├── layouts/       # App shell, sidebar, auth, and onboarding layouts
│       │   ├── pages/         # Dashboard, projects, runs, and settings pages
│       │   └── providers/     # Auth, organization, and theme state
└── packages/
    └── ui/                    # Shared design system primitives & Tailwind tokens
```

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Motion.
- **Backend**: Python 3.13, FastAPI, SQLModel (SQLAlchemy), Alembic, Pydantic v2.
- **Orchestration**: LangGraph, LangChain, pgvector, LiteLLM.
- **Database & Storage**: PostgreSQL 16 (pgvector extension), Redis 7 (caching & SSE channels).
- **Monorepo Tooling**: Bun workspaces, Turborepo, uv (Python packaging).

---

## Quick Start

### Prerequisites
- [Bun](https://bun.sh) (v1.1+)
- [Docker & Docker Compose](https://www.docker.com)
- [Python 3.13](https://www.python.org) and [uv](https://docs.astral.sh/uv/)
- [GitHub OAuth App](https://github.com/settings/developers) (Client ID & Client Secret)
- *(Optional)* [Ollama](https://ollama.com) installed locally for free offline models

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Tejas-pr/ai-software-engineer.git
cd ai-software-engineer

# Install frontend & monorepo packages
bun install

# Install API dependencies via uv
(cd apps/api && uv sync)
```

### 2. Start Supporting Services

```bash
# Start PostgreSQL (with pgvector) on :5433 and Redis on :6379
docker compose up -d
```

### 3. Configure Environment Variables

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` with your GitHub OAuth credentials and at least one model key or Ollama URL:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/ai_engineer
REDIS_URL=redis://localhost:6379/0

# GitHub OAuth App Credentials
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
FRONTEND_URL=http://localhost:5173

# Security & Encryption (generate with: openssl rand -hex 32)
JWT_SECRET_KEY=generate_random_secret_here
ENCRYPTION_KEY=generate_fernet_key_here

# Optional: Shared Platform LLM Keys (or configure in Settings UI)
GEMINI_API_KEY=your_gemini_api_key
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
```

### 4. Run Database Migrations

```bash
bun db:migrate
```

### 5. Start Development Servers

```bash
bun dev
```

The web application will be live at `http://localhost:5173` and the API at `http://localhost:8000`.

---

## Local Models & Hardware Tuning

To run coding agents 100% locally with Ollama:

1. Install and start [Ollama](https://ollama.com):
   ```bash
   ollama serve
   ```
2. Pull recommended tool-calling coding models:
   ```bash
   ollama pull qwen2.5-coder:7b
   ollama pull nomic-embed-text
   ```
3. Open `http://localhost:5173/settings/resources` to tune:
   - **GPU Offload**: 99 layers for full Apple Silicon Metal / NVIDIA VRAM offload.
   - **Context Window**: 16K or 32K context length.
   - **Keep-Alive**: Set to `15m` to prevent model reloading pauses between agent stages.

---

## Configuration

| Environment Variable | Description | Default |
|:---|:---|:---|
| `DATABASE_URL` | PostgreSQL connection string (must have pgvector enabled) | `postgresql://postgres:postgres@localhost:5433/ai_engineer` |
| `REDIS_URL` | Redis instance for cache and live run events | `redis://localhost:6379/0` |
| `GITHUB_CLIENT_ID` | OAuth Client ID from your GitHub Developer Settings | *Required* |
| `GITHUB_CLIENT_SECRET` | OAuth Client Secret from GitHub | *Required* |
| `JWT_SECRET_KEY` | Secret used to sign session JWTs | *Required* |
| `ENCRYPTION_KEY` | Fernet key used to encrypt user API keys in DB | *Required* |
| `OLLAMA_BASE_URL` | Endpoint for local Ollama daemon | `http://localhost:11434` |
| `WORKSPACES_ROOT` | Directory for temporary cloned sandboxes | `apps/api/workspaces` |

---

## Contributing

Contributions are welcome! Please follow these standards:

1. **Verify Before Submitting**:
   ```bash
   # Run linters, type checks, and tests across all packages
   bun lint
   bun typecheck
   bun run build
   bun --filter web test
   cd apps/api && uv run pytest
   ```
2. **Design Integrity**:
   - Reuse components from `apps/web/src/components/molecules/application`.
   - Maintain semantic tokens (`bg-card`, `bg-muted`, `border-border`, `text-primary`).
   - Use **JetBrains Mono** for UI/code and **Instrument Serif** exclusively for display titles.
3. **Knowledge Base Documentation**:
   - Update matching files under `kb/` (`backend.md`, `frontend.md`, `architecture.md`) whenever routes, tables, or behaviors change.
   - Keep working tasks updated in `implementation/todo.md`.

---

## Attribution & License

- **Author**: Built by [Tejas-pr](https://github.com/Tejas-pr).
- **Attribution**: Keep the "Built by Tejas-pr" attribution intact in user-facing layouts and headers.
- **License**: © 2026 Tejas-pr. All rights reserved unless a LICENSE file specifies otherwise.
