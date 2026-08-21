# AI Buzzword Glossary

Every AI term used in this codebase, defined precisely, with exactly where
it shows up here — no generic textbook definitions divorced from the code.

## Core LLM concepts

**LLM (Large Language Model)** — a model trained to predict the next token
given prior tokens; "generating a response" is just repeated next-token
prediction. Used here via API calls to Gemini/Claude/GPT, or run locally via
Ollama. `app/agents/llm.py`.

**Token** — the unit an LLM actually reads/writes (roughly ¾ of a word in
English, but code and other languages vary). Context window, pricing, and
speed are all measured in tokens, not characters or words.

**Context window** — the maximum number of tokens (input + output combined)
a model can attend to in one call. Why the researcher agent summarizes the
repo into a short brief instead of dumping every file into the planner's
prompt — the plan is built from a condensed context, not raw everything.

**Temperature** — a sampling parameter controlling randomness: 0 = always
pick the most likely next token (deterministic-ish, good for planning/code),
higher = more varied/creative output. `get_chat_model()` defaults to `0.0`.

**System prompt** — an instruction given to the model before the
conversation starts, setting its role/constraints ("you only have read-only
tools"). Each graph node sets one via `create_agent(..., system_prompt=...)`.

**Structured output** — forcing a model's response into a specific schema
(here, a Pydantic model) instead of free text you'd have to parse yourself.
`planner_node` uses `.with_structured_output(Plan)` — the model *must*
return `{summary, steps, test_command}`, not prose.

## Tools & agents

**Tool calling / function calling** — giving a model a list of callable
functions (name, description, JSON schema for arguments) and letting it
decide to invoke one instead of just replying with text. The model doesn't
execute anything itself — it emits "call `read_file` with `{file_path:
'x.py'}`"; your code runs it and feeds the result back in.
`app/agents/tools.py`.

**Agent** — an LLM given tools and allowed to loop: decide → call a tool →
see the result → decide again → ... until it has enough to answer. Not a
single call; a call *loop*.

**ReAct loop** (Reason + Act) — the specific agent pattern used here: the
model reasons about what to do, acts (calls a tool), observes the result,
and repeats. `create_agent()` implements this loop for you.

**Agentic RAG** — retrieval where the *agent* decides whether/what to
search, as opposed to a fixed "always retrieve top-k before answering"
pipeline. `search_codebase` is a tool the researcher chooses to call, not a
step that automatically runs first.

**Tool loop / recursion limit** — the number of think→act cycles an agent
is allowed before it's forced to stop, even mid-task — a safety bound
against a model that keeps calling tools without converging.
`AGENT_LOOP_STEP_LIMIT = 25` here.

## Embeddings & retrieval (RAG)

**Embedding** — a fixed-length vector of floats representing a piece of
text's *meaning* — texts with similar meaning end up as vectors that are
numerically close together, even with zero words in common.

**Vector / dimensionality** — the embedding *is* the vector; its
dimensionality is how many numbers make it up (768 here, chosen to match
the `pgvector` column and both providers' output). `gemini-embedding-001`
natively outputs 3072 dims but supports **Matryoshka
representation learning** — truncating to a shorter prefix (768 here via
`output_dimensionality`) while staying meaningfully accurate, because the
model was trained so the most important information sits in the vector's
first dimensions.

**Cosine similarity / distance** — how "close" two vectors point in
direction, ignoring magnitude; the standard measure of embedding
similarity. `pgvector`'s `<=>` operator computes *distance* (0 = identical
direction), so retrieval sorts by ascending distance.

**Chunking** — splitting a document into smaller pieces before embedding,
because (a) a whole file may exceed sensible embedding input size and (b) a
9000-line file embedded as one vector loses fine-grained relevance. This
project uses fixed 60-line windows with 10-line overlap
(`app/rag/chunking.py`) — simple, not AST-aware.

**Top-k retrieval** — returning only the `k` most similar chunks to a
query instead of everything, so the LLM's context stays small and focused.
`DEFAULT_TOP_K = 8` here.

**RAG (Retrieval-Augmented Generation)** — grounding an LLM's answer in
retrieved real content instead of relying purely on what it memorized during
training, which reduces hallucination and lets it answer about content it's
never seen (your specific codebase).

## Orchestration (LangChain / LangGraph)

**LangChain** — a library providing common interfaces across LLM providers
(`BaseChatModel`), tool definitions, and embedding models, so app code
depends on one abstraction instead of provider-specific SDKs.

**LangGraph** — a library for orchestrating *stateful, multi-step* LLM
workflows as an explicit graph, built on top of LangChain — the layer that
answers "and then what happens next" once you have more than one LLM call
in sequence with branching/looping logic.

**StateGraph** — LangGraph's core object: a directed graph of named nodes,
each a function that reads the shared state and returns updates to it.
`app/agents/graph.py`'s whole graph is one `StateGraph`.

**Node** — one step in the graph — here, one agent (`researcher`,
`planner`, `coder`, `tester`, `reviewer`), each a plain Python function.

**Edge** — a fixed transition from one node to the next
(`researcher → planner`, always).

**Conditional edge** — a transition chosen at runtime by a function
inspecting the current state and returning the next node's name. The
self-correction loop *is* a conditional edge: `_route_after_tester` returns
`"coder"` (retry) or `"reviewer"` (done) depending on whether tests passed.

**State** — the shared data structure (here, a `TypedDict`,
`AgentState`) every node reads from and writes partial updates to.
LangGraph merges each node's returned dict into the running state.

**Checkpointer / checkpointing** — LangGraph persisting the graph's state
after each node runs, so execution can be paused, inspected, or resumed
later — not lost if the process restarts. `MemorySaver` keeps checkpoints
in-process (gone if the process dies); `PostgresSaver` persists them to
Postgres so a run survives across separate HTTP requests (needed once a
human-approval pause has to outlive one request/response cycle).

**Interrupt / human-in-the-loop** — a node that deliberately pauses graph
execution and waits for external input (a human clicking Approve/Reject)
before continuing — LangGraph's built-in mechanism for "don't let the AI
act on its plan without a human saying so." Planned but not yet wired in
this codebase (see the plan's M4).

**Streaming (`stream_mode`)** — instead of waiting for the whole graph to
finish and returning one final answer, emitting events as execution
progresses. `stream_mode=["custom", "updates"]` here emits both custom
events a node explicitly writes (`get_stream_writer()`, "I just started")
and automatic ones (a node just finished, here's its state delta).

**Multi-agent system** — multiple specialized agents (as opposed to one
agent with every capability) coordinating on a task, each with its own
tools, prompt, and responsibility — used here because a single agent
juggling "explore code," "plan," "write code," and "judge its own tests"
in one prompt would blur all four jobs together; splitting them keeps each
one's prompt and tool set focused.

## Supporting infrastructure

**SSE (Server-Sent Events)** — a one-way HTTP streaming protocol (server →
client only, unlike WebSockets' two-way) — simpler when the client never
needs to send anything back mid-stream. Used for `/agent/runs/{id}/stream`.

**Adapter pattern** — wrapping several different concrete implementations
(Gemini SDK, Anthropic SDK, OpenAI SDK, Ollama client) behind one common
interface, so calling code depends only on the interface. `get_chat_model()`
picks the concrete implementation; every graph node only ever sees
`BaseChatModel`.

**Sandboxing** — restricting what a program (here, an LLM-driven agent) can
touch on the filesystem/shell, enforced by code, not by asking nicely. Every
tool call resolves its target path and rejects anything that escapes the
project's own workspace directory.

**OAuth** — a protocol for a user to grant an app limited access to another
service (GitHub) without handing over their password — the app receives a
scoped, revocable access token instead.

**JWT (JSON Web Token)** — a signed, self-contained token (here, holding
"this is user X, expires at time Y") the server can verify without a
database lookup, by checking its signature.

**Symmetric encryption (Fernet)** — encrypting data with one secret key
that both encrypts and decrypts, appropriate for "the server encrypts a
secret at rest and later decrypts it with the same key it already holds" —
as opposed to asymmetric encryption, which needs a public/private keypair.
Used to store the GitHub access token encrypted in Postgres.
