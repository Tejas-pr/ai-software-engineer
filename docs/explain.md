# AI Software Engineer — Project Explanation

What this project is, what's actually built, and how to explain it to
someone else (interview, resume, demo) without re-reading the code.

## One-sentence version

An autonomous AI software engineering platform: connect a GitHub repo, give
it a task, and a LangGraph-orchestrated team of specialized agents
(researcher, planner, coder, tester, reviewer) reads the codebase, plans the
change, edits files, runs tests, self-corrects on failure, and opens a pull
request — all on real repos, real LLMs, real Postgres, no mocks.

## Architecture

```
React (Vite/TS) ──HTTP/SSE──> FastAPI ──> LangGraph StateGraph
                                              │
                              ┌───────────────┼───────────────┐
                          researcher       planner          coder
                        (read-only,      (structured      (read+write
                         RAG tool)         output)          tools)
                                              │               │
                                              ▼               ▼
                                          tester ──fail──> (loop back
                                              │              to coder,
                                            pass             max 3x)
                                              ▼
                                          reviewer
                                              │
                                              ▼
                                        GitHub PR (M5)

Postgres (+ pgvector)  <──  DocumentChunk embeddings, users, projects, runs
Redis                  <──  API rate limiting
```

## Why FastAPI + LangChain/LangGraph, not a hand-rolled loop

The project deliberately built the *manual* version first
(`app/services/llm.py`): raw `httpx` calls to Gemini/Ollama, hand-parsed
tool-call JSON, a hand-written "call model → run tool → call model again"
loop. That's still in the codebase, powering the basic chat console —
kept specifically so the difference is visible side-by-side.

`app/agents/llm.py`'s `get_chat_model()` is the LangChain version: every
provider (Gemini, Claude, GPT, local Ollama) behind one `BaseChatModel`
interface — same `.invoke()`, same `.bind_tools()`, regardless of which
LLM is actually answering. That uniformity is what lets
`langchain.agents.create_agent()` run the tool-calling loop *for* you
instead of you writing it per-provider. Concretely: adding Claude/GPT
support was ~15 lines because the adapter already existed — no new loop
logic, just a new branch choosing which SDK class to instantiate.

## The provider adapter pattern

```python
def get_chat_model(model: str) -> BaseChatModel:
    # model name -> provider by prefix ("gemini-*", "claude-*", "gpt-*")
    # falls through to local Ollama as the catch-all default
```

This is the actual Adapter design pattern, not a custom abstraction layer —
LangChain's `BaseChatModel` *is* the interface; the factory just decides
which concrete implementation to hand back. Every graph node depends only
on `BaseChatModel`, never on `google.genai` or `anthropic` directly, so the
model a user picks is just a string that flows through unchanged.

## Sandboxing — the security-relevant design decision

The original filesystem/terminal tools defaulted to `Path.cwd()` — i.e. an
agent could read/write/execute anywhere in the *host* repo, not just the
project it was supposed to be working on. Fixed by threading an explicit
`workspace_root: Path` through every tool function, with a
`resolved_path.is_relative_to(workspace_root)` check rejecting any path
that escapes it (blocks `../../etc/passwd`-style traversal). Each agent run
gets tools bound to *that project's* clone directory
(`apps/api/workspaces/{project_id}/`) via a closure factory
(`app/agents/tools.py`), so one run can never touch another project's code
or the platform's own source.

## RAG: from raw vectors to an agent-controlled tool

1. **Chunking** (`app/rag/chunking.py`) — fixed 60-line windows with 10-line
   overlap, filtered to BUILDER's supported languages, walking the repo
   while skipping `node_modules`/`.git`/`dist`/etc. Deliberately not
   AST-aware (tree-sitter) yet — the simplest thing that produces
   retrievable chunks, upgradeable later behind the same function signature.
2. **Embeddings** (`app/rag/embeddings.py`) — `gemini-embedding-001`
   (truncated from its native 3072 dims to 768 via `output_dimensionality`,
   a Matryoshka-style embedding property) or local `nomic-embed-text`,
   picked automatically by whichever provider has a key configured.
3. **Storage** — `DocumentChunk` rows in Postgres with a `pgvector`
   `VECTOR(768)` column.
4. **Retrieval** (`app/rag/retrieval.py`) — `embedding <=> query_vector`
   (pgvector's cosine-distance operator) computed *in the database*,
   `ORDER BY ... LIMIT k` — Postgres does the nearest-neighbor search, no
   vectors pulled into Python to compare by hand.
5. **Agentic RAG** — retrieval isn't a fixed "always retrieve before
   answering" pipeline. It's exposed as a `search_codebase` LangChain
   `@tool`; the researcher agent decides *whether* and *what* to search,
   the same way it decides whether to call `read_file`. That's the actual
   distinction between "RAG" and "agentic RAG": who's driving the
   retrieval — a fixed pipeline, or the model reasoning about what it needs.

Verified for real: ingested a two-file mini-repo, asked "how does token
refresh work?" (a question that never says the word "refresh" the same
way), and the vector search correctly ranked the auth file over an
unrelated one — proof the embeddings capture *meaning*, not keyword overlap.

## The multi-agent graph — the centerpiece

`app/agents/graph.py`, a single `langgraph.graph.StateGraph`:

- **State** (`app/agents/state.py`) — a `TypedDict` every node reads from
  and returns partial updates to. LangGraph merges those updates; this is
  what the checkpointer serializes between steps.
- **researcher** — a `create_agent()` ReAct loop with *read-only* tools
  (`read_file`, `list_files`, `search_code`, `search_codebase`). Explores
  the repo, writes a text brief. Can't accidentally modify anything — its
  tool set physically doesn't include `write_file`.
- **planner** — no tool loop; a single `.with_structured_output(Plan)`
  call. `Plan` is a Pydantic model (summary, list of steps, a
  `test_command`), so the LLM is *constrained* to return that exact JSON
  shape — no regex-parsing free text out of a chat response.
- **coder** — `create_agent()` with the full tool set (`read_file`,
  `list_files`, `search_code`, `write_file`, `run_command`). Implements the
  plan by actually writing files.
- **tester** — runs `plan.test_command` via the sandboxed `run_command`,
  checks the exit code.
- **conditional edge** — a plain Python function
  (`_route_after_tester`) returning `"coder"` or `"reviewer"` as a string.
  This *is* the self-correction loop: on failure, route back to `coder`
  with the failure output appended to its prompt, up to
  `MAX_REPAIR_ATTEMPTS = 3`; then give up gracefully and let the reviewer
  report it honestly rather than looping forever.
- **reviewer** — summarizes the outcome (files changed, attempts taken,
  pass/fail) into `review_notes`.
- **Live status** — every node calls `get_stream_writer()({"agent": ...,
  "status": "running", "detail": ...})` on entry. Combined with
  `stream_mode=["custom", "updates"]`, a consumer gets *both* "agent X just
  started" and "agent X just finished with this result" events — the data
  feed the (planned) six-box live dashboard is built on.
- **Checkpointer** — `MemorySaver` for now. LangGraph checkpoints state
  after every node so a run can be paused/inspected/resumed; a Postgres
  checkpointer (`langgraph-checkpoint-postgres`, already installed) upgrades
  this to survive across separate HTTP requests, which only matters once
  there's a human-approval pause to resume from.

**Proven, not asserted**: an end-to-end test hands the graph a real
one-line bug (`add()` returning `a - b`) and a failing test, on a real LLM
(`gemini-3.6-flash`), with zero mocking. The graph found the bug, planned
the fix, wrote it to disk, ran the tests, and finished with the tests
actually green — the full researcher→planner→coder→tester→reviewer chain,
observed working (`apps/api/tests/test_m3_graph.py`).

## API layer

- `POST /api/v1/projects` — clones a connected GitHub repo into
  `workspaces/{project_id}` in the background (`BackgroundTasks`), tracked
  via a `status` field (`pending → ready|failed`).
- `POST /api/v1/agent/runs` — creates a run record; the graph doesn't start
  until...
- `GET /api/v1/agent/runs/{id}/stream` — opens an SSE connection *and*
  starts the graph on a background thread at that moment. Because the
  graph's LLM/tool calls are synchronous (blocking) but FastAPI's event
  loop is async, the run happens on a `threading.Thread`, and results cross
  back into the event loop via `asyncio.Queue` +
  `asyncio.run_coroutine_threadsafe` — the standard bridge pattern for
  "sync work, async delivery" instead of blocking every other request for
  the run's whole duration.

## Auth & security decisions worth naming explicitly

- GitHub OAuth token is requested with `repo` scope, encrypted at rest with
  `cryptography.Fernet` (`app/utils/crypto.py`), never logged or returned
  to the client — needed later to clone private repos and open PRs on the
  user's behalf.
- Every login re-stores a fresh token (handles scope changes / revocation)
  rather than only capturing it once at signup.
- JWT access token in an `httponly` cookie (short-lived), refresh token
  scoped to just the auth routes' path — an XSS payload that steals cookies
  still can't read them via JS, and even a leaked refresh token is useless
  outside `/api/v1/accounts/auth/*`.

## What to say if asked "walk me through it" in an interview

1. "It's a LangGraph multi-agent system — five specialized agents behind a
   StateGraph, not one agent trying to do everything."
2. "The self-correction is a conditional edge, not a special mechanism —
   `tester` routes back to `coder` on failure with the error appended,
   capped at 3 attempts."
3. "RAG is agentic, not fixed — retrieval is a tool the researcher decides
   to call, not a pipeline that always runs first."
4. "The provider layer is a real adapter — swapping Gemini for Claude is a
   config value, because every node depends on LangChain's `BaseChatModel`,
   never a provider SDK directly."
5. "Sandboxing is enforced at the tool layer with explicit path-escape
   checks, not just 'the agent probably won't wander off' — each run's
   tools are bound to that project's own clone directory."
6. "It's tested against real infrastructure — real Postgres/pgvector, real
   Gemini calls, an actual bug getting actually fixed — not mocked
   end-to-end tests that just prove the code compiles."
