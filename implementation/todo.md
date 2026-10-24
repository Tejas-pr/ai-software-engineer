# Remaining Tasks (TODO)

Consolidated backlog of remaining tasks. All completed items have been removed.

---

## 1. Natural Language Chat Bot (Autonomous Repo Assistant)
- [ ] Conversational interface where the user can issue freeform commands (e.g. *"check my dummy repo and fix the issues from it"*).
- [ ] Repository inspection and context grounding:
  - Agent queries connected repositories, active issues, and recent commit history.
  - Generates recommended plans / actions from the prompt.
- [ ] Agent run trigger:
  - Directly kicks off researcher → planner → approval → coder pipeline from the chat session.

## 2. Cloudflare Turnstile CAPTCHA
- [ ] Add Cloudflare Turnstile widget to sign-in and sign-up pages to protect against bot abuse.
- [ ] Backend verification endpoint / middleware to validate Turnstile tokens against Cloudflare's `siteverify` API.
- [ ] Support graceful bypass in local development and testing environments.

## 3. Live Coder View & Per-File Tool Streaming
- [ ] Stream real-time file edit events, tool executions, and diffs from the coder agent.
- [ ] Full-page live execution feed at `/projects/:id/runs/:runId/live`.

## 4. Token & Cost Tracking
- [ ] Record prompt and completion token counts per agent node and run.
- [ ] Calculate and display estimated cost breakdowns on the 30-day Usage panel in the dashboard.

## 5. Organization Enhancements
- [ ] **Email Invitations**: Invite organization collaborators via email (currently adds by existing GitHub username).
- [ ] **Organization URL Slugs**: Route by slug (e.g. `/:org/...`) instead of per-browser client storage.
- [ ] **Shared Organization API Keys**: Option to configure provider keys at the organization level in addition to per-user keys.

## 6. Execution Sandboxing & Reliability
- [ ] **Immediate Node Cancellation**: Interrupt long-running tools/processes (e.g. running test suites or shell commands) via SIGINT/SIGTERM rather than only between LangGraph node boundaries.
- [ ] **Containerized Execution Sandbox**: Isolate workspace code execution inside disposable Docker / microVM containers instead of host process shell execution.
- [ ] **Deterministic Approval Test**: Refactor `test_m4_approval` to avoid reliance on small Ollama model tool-calling loops.
