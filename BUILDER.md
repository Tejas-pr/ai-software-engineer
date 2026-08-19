Absolutely. Below is a **`BUILDER.md`** you can paste directly into your repo.

I've structured it as a **learning + building contract** for you and your AI coding agent: what we're building, architecture, stack, phases, milestones, rules, and what the AI agent should/shouldn't do for you.

````markdown
# AI Software Engineer — Builder Guide

> **Project:** AI Software Engineer  
> **Repository:** `ai-software-engineer`  
> **Purpose:** Learn modern Generative AI, Agentic AI, RAG, LangChain, LangGraph, tool calling, multi-agent systems, memory, human-in-the-loop, evaluation, and production AI engineering by building one serious project.

---

# 1. Project Vision

Build an autonomous AI software engineering platform.

The user connects a GitHub repository and gives the AI a software engineering task.

Example:

> "Add Google OAuth authentication to this application."

The AI should be able to:

1. Understand the task.
2. Inspect the repository.
3. Search the codebase.
4. Retrieve relevant documentation/code using RAG.
5. Research external information when necessary.
6. Create an implementation plan.
7. Ask for human approval.
8. Modify the code.
9. Run tests.
10. Analyze test failures.
11. Fix problems.
12. Review its own changes.
13. Create a Git branch.
14. Commit changes.
15. Create a GitHub Pull Request.
16. Explain what it changed.

The final system should behave like a small AI software engineering team.

---

# 2. Main Learning Goal

This project is NOT simply an "AI chatbot".

The goal is to learn how modern AI systems are actually designed and built.

The project should teach:

- LLM APIs
- Prompt engineering
- Structured outputs
- Function/tool calling
- Embeddings
- Vector search
- RAG
- Agentic RAG
- LangChain
- LangGraph
- Stateful agents
- Agent memory
- Multi-agent systems
- Human-in-the-loop
- Autonomous workflows
- GitHub API integration
- Code execution
- Automated testing
- Self-correction
- Evaluation
- Observability
- AI cost tracking
- Production deployment

The project should prioritize understanding over simply using libraries.

---

# 3. Core Principle

## Learn by building.

Do NOT spend months learning every AI concept before writing code.

Instead:

1. Build the smallest working version.
2. Encounter a problem.
3. Learn the concept needed to solve it.
4. Implement it.
5. Test it.
6. Document what was learned.
7. Move to the next stage.

The project should evolve incrementally.

---

# 4. Important Learning Rule

Do not hide complexity behind frameworks too early.

For example:

Before using LangChain's RAG abstraction:

1. Understand what an embedding is.
2. Generate an embedding.
3. Store it.
4. Perform similarity search.
5. Retrieve chunks.
6. Pass them to an LLM.
7. Understand the complete flow.

Then implement the same concept using LangChain.

The goal is to understand:

> What the framework is doing for us.

Not simply:

> How to import the framework.

---

# 5. Final Architecture

The final architecture should look approximately like this:

```text
                         ┌───────────────────┐
                         │       User        │
                         │                   │
                         │ "Add Google OAuth"│
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │   React Frontend  │
                         │    Vite + TS      │
                         └─────────┬─────────┘
                                   │
                              HTTP / SSE
                                   │
                                   ▼
                         ┌───────────────────┐
                         │      FastAPI      │
                         │      Backend      │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │    LangGraph      │
                         │    Supervisor     │
                         └─────────┬─────────┘
                                   │
                 ┌─────────────────┼─────────────────┐
                 │                 │                 │
                 ▼                 ▼                 ▼
        ┌────────────────┐ ┌───────────────┐ ┌───────────────┐
        │ Research Agent │ │  Code Agent   │ │ Planning Agent│
        └────────────────┘ └───────────────┘ └───────────────┘
                 │                 │                 │
                 └─────────────────┼─────────────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │   Human Approval  │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │   Coding Agent    │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │   Testing Agent   │
                         └─────────┬─────────┘
                                   │
                         ┌─────────┴─────────┐
                         │                   │
                       PASS                FAIL
                         │                   │
                         ▼                   ▼
                    Code Review       Debug / Fix Agent
                         │                   │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │    GitHub PR      │
                         └───────────────────┘
````

---

# 6. Repository Structure

The project is a monorepo.

Use Turborepo for the JavaScript/TypeScript side.

Python/FastAPI is an independent application inside `apps/api`.

Recommended structure:

```text
ai-software-engineer/
│
├── apps/
│   │
│   ├── web/
│   │   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── package.json
│   │   └── ...
│   │
│   └── api/
│       ├── app/
│       │   ├── main.py
│       │   │
│       │   ├── agents/
│       │   │   ├── supervisor.py
│       │   │   ├── researcher.py
│       │   │   ├── planner.py
│       │   │   ├── coder.py
│       │   │   ├── tester.py
│       │   │   └── reviewer.py
│       │   │
│       │   ├── graphs/
│       │   │   └── software_engineer.py
│       │   │
│       │   ├── rag/
│       │   │   ├── ingestion.py
│       │   │   ├── chunking.py
│       │   │   ├── embeddings.py
│       │   │   ├── retrieval.py
│       │   │   └── reranking.py
│       │   │
│       │   ├── tools/
│       │   │   ├── filesystem.py
│       │   │   ├── terminal.py
│       │   │   ├── github.py
│       │   │   ├── search.py
│       │   │   └── testing.py
│       │   │
│       │   ├── models/
│       │   ├── services/
│       │   ├── api/
│       │   ├── config.py
│       │   └── dependencies.py
│       │
│       ├── tests/
│       ├── pyproject.toml
│       ├── uv.lock
│       └── ...
│
├── packages/
│   └── ui/
│
├── docs/
│
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
├── README.md
└── BUILDER.md
```

---

# 7. Why This Architecture?

## Frontend

React + Vite is already familiar.

Use it to build:

* Dashboard
* Repository connection
* Task creation
* Agent activity
* Approval UI
* Code changes
* Test results
* Pull request information
* Agent metrics

## Backend

Use Python + FastAPI because the AI ecosystem is heavily Python-oriented.

FastAPI will expose the application API.

LangGraph will orchestrate the agent workflow.

LangChain will provide AI building blocks.

---

# 8. Tech Stack

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui
* TanStack Query

## Backend

* Python
* FastAPI
* Pydantic
* Uvicorn
* uv

## AI

* LangChain
* LangGraph
* LLM provider API
* Ollama for local experimentation

## Database

* PostgreSQL
* pgvector

## Agent State / Caching

Optional later:

* Redis

Do not add Redis until there is a real reason.

## GitHub

* GitHub API
* GitHub OAuth
* GitHub Webhooks

## Observability

* LangSmith

## Deployment

Frontend:

* Cloudflare Pages

Backend:

* Oracle Cloud VM

Database:

* PostgreSQL

---

# 9. Free Development Strategy

The project should be designed to run mostly for free.

Potential free components:

* React
* Vite
* FastAPI
* Python
* LangChain
* LangGraph
* PostgreSQL
* pgvector
* Ollama
* Git
* GitHub
* Cloudflare Pages
* Oracle Cloud Always Free resources

LLM APIs may incur costs.

During development, prefer:

```text
Local development
        ↓
Ollama
```

or use free/low-cost API tiers where available.

Do not assume LLM APIs are permanently free.

---

# 10. Oracle Deployment Strategy

An Oracle Cloud VM is available for backend deployment.

The Oracle VM should run:

```text
Nginx
FastAPI
LangGraph
PostgreSQL
```

Potentially later:

```text
Redis
Worker processes
```

Do NOT run a large local LLM on a small Oracle VM.

Use Ollama locally on the developer machine for experimentation.

Use hosted LLM APIs for production if necessary.

---

# 11. Frontend Deployment

Deploy frontend using Cloudflare Pages.

Architecture:

```text
GitHub
   │
   ▼
Cloudflare Pages
   │
   ▼
React + Vite
```

Backend:

```text
GitHub
   │
   ▼
Oracle VM
   │
   ▼
Nginx
   │
   ▼
FastAPI
```

---

# 12. Development Environment

During development:

Terminal 1:

```bash
cd apps/web
pnpm dev
```

Frontend:

```text
http://localhost:5173
```

Terminal 2:

```bash
cd apps/api
uv run fastapi dev app/main.py
```

Backend:

```text
http://localhost:8000
```

The frontend communicates with FastAPI over HTTP.

Later, Turborepo may be configured to start both applications from one command.

Do not optimize this too early.

---

# 13. Phase 0 — Project Setup

## Goal

Create the repository and verify the basic development environment.

### Tasks

* [ ] Create `ai-software-engineer` repository.
* [ ] Initialize Turborepo.
* [ ] Create Vite + React + TypeScript frontend.
* [ ] Install/configure shadcn/ui.
* [ ] Create `apps/api`.
* [ ] Initialize Python project.
* [ ] Install FastAPI.
* [ ] Configure `uv`.
* [ ] Create `/health` endpoint.
* [ ] Run frontend.
* [ ] Run backend.
* [ ] Verify frontend can call backend.
* [ ] Add `.env.example`.
* [ ] Add `.gitignore`.
* [ ] Write initial README.

### Learning

Understand:

* Monorepo
* Turborepo
* pnpm
* Python virtual environments
* uv
* FastAPI
* HTTP APIs
* CORS

---

# 14. Phase 1 — Python + FastAPI

## Goal

Become comfortable enough with Python to build AI services.

Learn:

* Python syntax
* Functions
* Classes
* Type hints
* Async/await
* Exceptions
* Dataclasses
* Pydantic
* Environment variables
* Dependency management
* FastAPI routes
* Request validation
* Response models
* Dependency injection

Build:

```text
GET /health
POST /api/chat
POST /api/projects
POST /api/tasks
```

Do not spend weeks learning Python.

The goal is practical proficiency.

---

# 15. Phase 2 — LLM Fundamentals

## Goal

Connect FastAPI to an LLM.

Architecture:

```text
React
 ↓
FastAPI
 ↓
LLM
 ↓
FastAPI
 ↓
React
```

Learn:

* LLM
* Prompt
* System message
* User message
* Tokens
* Context window
* Temperature
* Model parameters
* Structured output
* JSON output
* Streaming

Build:

* Basic chat
* Streaming response
* Structured task response

Example:

```json
{
  "task": "Add OAuth",
  "complexity": "medium",
  "needs_repository_analysis": true
}
```

---

# 16. Phase 3 — Tool Calling

## Goal

Allow the model to interact with the real world.

Create tools:

```text
read_file()
list_files()
search_code()
run_command()
run_tests()
```

Initial flow:

```text
User
 ↓
LLM
 ↓
Decides tool
 ↓
Tool execution
 ↓
Tool result
 ↓
LLM
 ↓
Final response
```

Learn:

* Function calling
* Tool schemas
* Tool arguments
* Tool results
* Tool loops
* Tool errors
* Tool validation

Do NOT allow arbitrary destructive commands initially.

Use a sandboxed project directory.

---

# 17. Phase 4 — Basic RAG

## Goal

Build RAG manually before relying heavily on frameworks.

Pipeline:

```text
Documents
 ↓
Parse
 ↓
Chunk
 ↓
Embedding
 ↓
PostgreSQL + pgvector
 ↓
Similarity search
 ↓
Retrieved context
 ↓
LLM
```

Learn:

* Embeddings
* Vectors
* Dimensions
* Similarity
* Cosine similarity
* Chunk size
* Chunk overlap
* Metadata
* Top-k retrieval
* Context injection

Build:

```text
POST /api/rag/index
POST /api/rag/search
POST /api/rag/ask
```

---

# 18. Phase 5 — Codebase RAG

## Goal

Make the AI understand a GitHub repository.

Input:

```text
GitHub repository
```

Process:

```text
Clone repository
 ↓
Filter irrelevant files
 ↓
Parse files
 ↓
Chunk source code
 ↓
Generate embeddings
 ↓
Store in pgvector
```

Support:

* TypeScript
* JavaScript
* Python
* JSON
* Markdown
* YAML
* SQL

Ignore:

```text
node_modules/
.git/
dist/
build/
coverage/
venv/
__pycache__/
.env
```

Metadata should include:

```text
repository_id
file_path
language
chunk_index
start_line
end_line
content
```

---

# 19. Phase 6 — Agentic RAG

## Goal

Move from fixed RAG to agent-controlled retrieval.

Traditional RAG:

```text
Question
 ↓
Retrieve
 ↓
Answer
```

Agentic RAG:

```text
Question
 ↓
Agent
 ├── Search code
 ├── Read file
 ├── Search documentation
 ├── Search web
 ├── Retrieve more context
 └── Answer
```

The agent should decide when retrieval is needed.

Learn:

* Query planning
* Retrieval decisions
* Query refinement
* Multiple retrieval calls
* Tool-based retrieval
* Grounded responses

---

# 20. Phase 7 — LangChain

## Goal

Learn LangChain after understanding the underlying concepts.

Learn:

* Models
* Prompt templates
* Structured output
* Tools
* Retrievers
* Embeddings
* Vector stores
* Agents
* Message history

Refactor some manually implemented components to LangChain.

The objective is to understand what LangChain abstracts.

---

# 21. Phase 8 — LangGraph

## Goal

Build the actual AI workflow using LangGraph.

Initial graph:

```text
START
 ↓
Understand Task
 ↓
Research
 ↓
Plan
 ↓
Human Approval
 ↓
Implement
 ↓
Test
 ↓
Review
 ↓
END
```

Learn:

* Graph
* Node
* Edge
* State
* Conditional edge
* Loops
* Persistence
* Checkpoints
* Interrupts
* Human-in-the-loop
* Streaming

Example state:

```python
{
    "task": "...",
    "repository": "...",
    "plan": "...",
    "files_changed": [],
    "test_results": [],
    "approval": False,
    "errors": []
}
```

---

# 22. Phase 9 — Multi-Agent Architecture

## Goal

Build a small AI software engineering team.

Agents:

```text
Supervisor Agent
│
├── Research Agent
├── Codebase Agent
├── Planning Agent
├── Coding Agent
├── Testing Agent
└── Review Agent
```

Responsibilities:

### Supervisor

Coordinates the workflow.

### Research Agent

Finds external documentation and technical information.

### Codebase Agent

Understands repository structure and relevant files.

### Planning Agent

Creates implementation plan.

### Coding Agent

Modifies source code.

### Testing Agent

Runs tests and analyzes failures.

### Review Agent

Reviews generated changes.

Learn:

* Agent delegation
* Agent specialization
* Supervisor pattern
* Agent communication
* State sharing
* Multi-agent tradeoffs

Do not create agents just for the sake of having many agents.

Use agents only when specialization provides value.

---

# 23. Phase 10 — GitHub Integration

## Goal

Connect the AI to real GitHub repositories.

Implement:

```text
Connect GitHub
 ↓
Select repository
 ↓
Read issues
 ↓
Analyze repository
 ↓
Create branch
 ↓
Modify files
 ↓
Commit
 ↓
Push
 ↓
Create PR
```

Tools:

```text
get_repository()
get_issue()
list_files()
read_file()
search_code()
create_branch()
commit_changes()
push_changes()
create_pull_request()
get_pull_request()
```

Use GitHub authentication securely.

Never hard-code credentials.

---

# 24. Phase 11 — Human-in-the-Loop

## Goal

Never allow autonomous code changes without appropriate approval.

Before implementation:

```text
AI PLAN

1. Modify auth middleware
2. Add OAuth callback
3. Add database schema
4. Add tests

[Approve]
[Reject]
```

The graph should pause.

After approval:

```text
Human Approval
 ↓
Resume Graph
 ↓
Coding Agent
```

Learn:

* Interrupts
* Persistent state
* Approval workflows
* Safe AI automation

---

# 25. Phase 12 — Code Execution

## Goal

Allow the AI to safely execute project commands.

Examples:

```bash
npm test
npm run build
pytest
npm run lint
```

But execution must be sandboxed.

Never allow the agent unrestricted access to the host system.

Implement:

* Allowed command list
* Working directory restriction
* Timeout
* Output limits
* Process termination
* Environment isolation
* Error handling

---

# 26. Phase 13 — Self-Correction

## Goal

Allow the agent to fix its own mistakes.

Workflow:

```text
Implement
 ↓
Run tests
 ↓
Tests failed?
 ├── NO → Review
 │
 └── YES
      ↓
   Analyze error
      ↓
   Modify code
      ↓
   Run tests again
```

Add a retry limit.

Example:

```text
MAX_REPAIR_ATTEMPTS = 3
```

Never allow infinite agent loops.

---

# 27. Phase 14 — Memory

Implement two levels.

## Short-term memory

Current workflow state:

```text
task
plan
files
tool results
test results
errors
```

## Long-term project memory

Store:

```text
Repository architecture
Technology stack
Coding conventions
Previous decisions
Important project information
```

Understand the difference between:

```text
Memory
vs
RAG
vs
Conversation history
```

---

# 28. Phase 15 — Evaluation

This phase is extremely important.

Do not simply say:

> "The agent works."

Create measurable evaluation.

Track:

```text
Task completion rate
RAG retrieval accuracy
Tool success rate
Test pass rate
PR success rate
Hallucination rate
Average latency
Token usage
Cost per task
Repair attempts
```

Create a test dataset.

Example:

```text
Task 001
Task 002
Task 003
...
Task 100
```

Run the agent against the dataset.

Create an evaluation dashboard.

---

# 29. Phase 16 — Observability

Integrate LangSmith or another tracing system.

Every agent run should expose:

```text
Run
 ├── LLM call
 ├── Retrieval
 ├── Tool call
 ├── LLM call
 ├── Tool call
 ├── Test
 ├── Repair
 └── Final response
```

Track:

* Latency
* Tokens
* Cost
* Errors
* Tool calls
* Retrieval results
* Agent transitions

This should help debug failures.

---

# 30. Phase 17 — Production UI

Build a professional dashboard.

Main pages:

```text
Dashboard
Repositories
Repository Details
Tasks
Agent Run
Approvals
Pull Requests
Evaluations
Settings
```

Agent Run screen:

```text
┌─────────────────────────────────────────────┐
│ AI Software Engineer                       │
├─────────────────────────────────────────────┤
│ Repository: my-project                      │
│ Task: Add Google OAuth                      │
├─────────────────────────────────────────────┤
│                                             │
│ ✓ Repository analyzed                      │
│ ✓ Relevant files retrieved                 │
│ ✓ Documentation researched                 │
│ ✓ Implementation plan created              │
│                                             │
│ ⚠ Waiting for approval                     │
│                                             │
│ [ Approve ] [ Reject ]                     │
│                                             │
└─────────────────────────────────────────────┘
```

---

# 31. Phase 18 — Production Deployment

## Frontend

Deploy:

```text
Cloudflare Pages
```

Architecture:

```text
GitHub
 ↓
Cloudflare Pages
 ↓
React + Vite
```

## Backend

Deploy:

```text
Oracle Cloud VM
```

Architecture:

```text
Internet
 ↓
Cloudflare
 ↓
Nginx
 ↓
FastAPI
 ↓
LangGraph
```

## Database

Use:

```text
PostgreSQL
+
pgvector
```

---

# 32. Production Requirements

Before calling the project production-ready, implement:

* [ ] HTTPS
* [ ] Environment variables
* [ ] Secrets management
* [ ] Authentication
* [ ] Authorization
* [ ] Rate limiting
* [ ] CORS configuration
* [ ] Input validation
* [ ] Error handling
* [ ] Logging
* [ ] Database backups
* [ ] Agent timeout
* [ ] Agent retry limits
* [ ] Tool permission system
* [ ] Command execution sandbox
* [ ] GitHub token security
* [ ] LLM cost limits
* [ ] Request limits
* [ ] Observability
* [ ] Health checks

---

# 33. Important Security Rules

This is an AI agent capable of executing code.

Security is NOT optional.

Never:

* Execute arbitrary user commands on the host.
* Expose API keys to the frontend.
* Store GitHub tokens in source code.
* Allow unlimited shell execution.
* Allow unlimited agent loops.
* Trust LLM-generated paths.
* Allow the agent to access `.env`.
* Allow unrestricted filesystem access.

Implement:

```text
Allowed directory
Allowed commands
Command timeout
Process timeout
Maximum output
Maximum agent iterations
Maximum token budget
Maximum cost
```

---

# 34. Project Milestones

## Milestone 1

```text
React ↔ FastAPI
```

Success:

* Frontend works.
* Backend works.
* API communication works.

---

## Milestone 2

```text
FastAPI → LLM
```

Success:

* User can chat with LLM.
* Streaming works.
* Structured output works.

---

## Milestone 3

```text
LLM → Tools
```

Success:

* Agent can inspect files.
* Agent can search code.
* Agent can run safe tests.

---

## Milestone 4

```text
RAG
```

Success:

* Repository can be indexed.
* Embeddings stored.
* Relevant code retrieved.
* Answers grounded in repository.

---

## Milestone 5

```text
LangChain
```

Success:

* Models, tools and retrievers are implemented with LangChain.

---

## Milestone 6

```text
LangGraph
```

Success:

* Agent workflow is stateful.
* Graph can pause/resume.
* Conditional transitions work.

---

## Milestone 7

```text
Multi-Agent
```

Success:

* Supervisor delegates tasks.
* Specialized agents work together.

---

## Milestone 8

```text
GitHub
```

Success:

* Agent can create branch.
* Agent can modify code.
* Agent can create PR.

---

## Milestone 9

```text
Self-Correction
```

Success:

* Agent detects failed tests.
* Agent analyzes failure.
* Agent attempts fixes.
* Agent eventually produces working changes or reports failure.

---

## Milestone 10

```text
Evaluation
```

Success:

* Agent performance is measurable.

---

## Milestone 11

```text
Production
```

Success:

* Frontend deployed.
* Backend deployed.
* Database deployed.
* HTTPS works.
* Authentication works.
* Monitoring works.

---

# 35. Suggested Learning Timeline

This is a flexible guideline, not a strict deadline.

## Week 1

Python + FastAPI

```text
Python
FastAPI
Pydantic
Async
API architecture
```

## Week 2

LLM fundamentals

```text
LLM
Prompting
Structured output
Streaming
```

## Week 3

Tool calling

```text
Tools
Function calling
Tool loops
Safe execution
```

## Week 4

RAG

```text
Embeddings
Chunking
pgvector
Retrieval
```

## Week 5

Codebase RAG

```text
Repository indexing
Code retrieval
Metadata
Agentic retrieval
```

## Week 6

LangChain

```text
Models
Tools
Retrievers
Agents
```

## Week 7

LangGraph

```text
State
Nodes
Edges
Loops
Persistence
Interrupts
```

## Week 8

Multi-agent

```text
Supervisor
Research
Planning
Coding
Testing
Review
```

## Week 9

GitHub + Human-in-the-loop

```text
GitHub API
Branches
Commits
PRs
Approval
```

## Week 10

Self-correction + Memory

```text
Test failures
Repair loops
Short-term state
Long-term memory
```

## Week 11

Evaluation + Observability

```text
LangSmith
Tracing
Evaluation
Metrics
Cost
Latency
```

## Week 12

Production

```text
Cloudflare
Oracle
Nginx
HTTPS
CI/CD
Security
```

This timeline is flexible. Understanding is more important than finishing on a specific date.

---

# 36. How AI Coding Agents Should Be Used

AI coding agents are allowed and encouraged.

However, the purpose of this project is learning.

Therefore:

## Do NOT ask the coding agent:

> "Build the entire AI agent system."

That defeats the purpose.

Instead ask:

> "Explain how tool calling works and help me implement a minimal version."

Then:

> "Review my implementation."

Then:

> "Help me debug this."

Then:

> "Show me why this architecture is better."

---

# 37. AI Agent Learning Rules

When using an AI coding agent:

### Rule 1

Ask for explanation before implementation when learning a new concept.

### Rule 2

Ask the AI to create the smallest working example.

### Rule 3

Understand the code before accepting it.

### Rule 4

Ask for alternatives.

### Rule 5

Ask the AI to review your code.

### Rule 6

Ask what can go wrong.

### Rule 7

Write documentation for important concepts.

### Rule 8

Never blindly copy AI-generated architecture.

---

# 38. Recommended Prompt Pattern for AI Coding Agents

Use this pattern:

```text
I am learning [CONCEPT].

I am currently building the AI Software Engineer project.

Explain:
1. What this concept is.
2. Why we need it.
3. How it works internally.
4. How it fits into our architecture.
5. What alternatives exist.
6. What tradeoffs exist.

Then help me implement the smallest working version.

Do not implement unrelated features.

After implementation:
- Explain the code.
- Explain important design decisions.
- Explain failure cases.
- Give me a small exercise to verify that I understand it.
```

---

# 39. AI Agent Code Review Prompt

Use:

```text
Review this implementation as a senior AI engineer.

Check:

- Architecture
- Correctness
- Async behavior
- Error handling
- Security
- Agent loops
- Token usage
- LLM calls
- Tool design
- RAG quality
- State management
- LangGraph design
- Performance
- Maintainability

Do not rewrite everything.

First explain the problems and why they matter.

Then suggest the smallest appropriate changes.
```

---

# 40. AI Agent Debugging Prompt

Use:

```text
I am learning this system.

Do not immediately give me the final solution.

First:
1. Identify what is failing.
2. Explain why it is failing.
3. Give me clues.
4. Let me reason about the fix.
5. Only provide the complete solution if necessary.

Keep the solution aligned with the architecture documented in BUILDER.md.
```

---

# 41. Architecture Decision Rules

Before introducing a new technology, ask:

1. Why do we need it?
2. What problem does it solve?
3. Can PostgreSQL already solve this?
4. Can existing libraries solve this?
5. Does it increase operational complexity?
6. Does it help me learn an important concept?
7. Is it necessary for production?

Do not add technology simply because it is popular.

---

# 42. Initial Technology Restrictions

Initially avoid:

* Kubernetes
* Kafka
* Multiple vector databases
* Multiple LLM providers
* Complex microservices
* Complex event buses
* Multiple caching systems
* Fine-tuning
* LoRA
* Custom model training

These may be explored later if there is a legitimate reason.

Focus on:

```text
LLM
Tools
RAG
Agents
LangChain
LangGraph
Memory
GitHub
Evaluation
Production
```

---

# 43. Important Concepts to Understand Before Interviews

By the end of this project, be able to explain:

### LLM

What it is and how inference works at a high level.

### Token

How tokens affect context and cost.

### Embeddings

How text/code becomes vectors.

### Vector Search

How semantic similarity works.

### RAG

Why retrieval can reduce hallucination and provide external knowledge.

### Agent

How an LLM can reason/select tools and iterate.

### Tool Calling

How models interact with external systems.

### Agentic RAG

How agents dynamically decide what to retrieve.

### LangChain

What abstractions it provides.

### LangGraph

Why graph/state-based orchestration is useful.

### Memory

Difference between conversation state, persistent memory and RAG.

### Multi-Agent

When multiple specialized agents are useful and when they are unnecessary.

### Human-in-the-loop

Why autonomous systems need approval boundaries.

### Evaluation

How to measure whether an AI system actually works.

### Observability

How to inspect and debug AI workflows.

---

# 44. Final Resume Goal

The project should eventually be describable as:

## AI Software Engineer

An autonomous AI software engineering platform built with:

```text
React
TypeScript
Vite
Python
FastAPI
LangChain
LangGraph
PostgreSQL
pgvector
GitHub API
Ollama
LangSmith
Cloudflare
Oracle Cloud
```

Potential resume bullets:

* Built a stateful AI software engineering agent using LangGraph to analyze GitHub repositories, plan implementation tasks, modify source code, execute tests, self-correct failures, and generate pull requests.
* Implemented agentic RAG over source code using embeddings, pgvector, semantic retrieval, metadata filtering, and query refinement.
* Designed a multi-agent architecture with specialized research, planning, coding, testing, and review agents coordinated through a LangGraph supervisor.
* Implemented human-in-the-loop approval, persistent agent state, tool calling, retry limits, and safe code execution.
* Added LLM observability and evaluation to measure task completion, retrieval quality, tool success, latency, token usage, and cost.

Do not claim these features on the resume until they are actually implemented and tested.

---

# 45. Definition of Done

The project is considered complete when a user can:

```text
1. Sign in
        ↓
2. Connect GitHub
        ↓
3. Select repository
        ↓
4. Create task
        ↓
5. AI analyzes repository
        ↓
6. AI retrieves relevant code
        ↓
7. AI researches documentation
        ↓
8. AI creates implementation plan
        ↓
9. User approves
        ↓
10. AI modifies code
        ↓
11. AI runs tests
        ↓
12. AI fixes failures if necessary
        ↓
13. AI reviews changes
        ↓
14. AI creates Git branch
        ↓
15. AI commits changes
        ↓
16. AI creates GitHub PR
        ↓
17. User reviews result
```

The system should also provide:

* Agent execution history
* Tool execution history
* RAG retrieval information
* Test results
* Approval history
* Token usage
* Cost estimates
* Latency
* Evaluation metrics
* Error logs

---

# 46. The Ultimate Learning Objective

At the end of this project, I should NOT merely be able to say:

> "I know LangChain."

I should be able to explain and demonstrate:

```text
How LLM applications work
        ↓
How tool calling works
        ↓
How RAG works
        ↓
How agentic RAG works
        ↓
How agents work
        ↓
How stateful agents work
        ↓
How LangGraph orchestrates agents
        ↓
How multi-agent systems work
        ↓
How memory works
        ↓
How humans can remain in control
        ↓
How agents execute code safely
        ↓
How AI systems are evaluated
        ↓
How AI systems are observed
        ↓
How AI systems are deployed
        ↓
How AI systems are secured
```

The final goal is to become capable of designing and building **production-oriented AI agent systems**, not simply using AI libraries.

---

# 47. Golden Rule

> **Build first. Learn what you need. Understand what you build. Measure what you build. Then improve it.**

Do not chase AI buzzwords.

If a technology solves a real problem in this project, learn it and use it.

If it does not solve a real problem, don't add it just to put it on the resume.

The project should demonstrate genuine engineering ability.

```
```
