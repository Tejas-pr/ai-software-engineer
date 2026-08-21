Good mental model, mostly right — let me walk it through precisely and fix the two or three places where the actual implementation differs from what you described, because those differences matter if you're explaining this later.

The flow, start to end
1. Connect & pick a repo
User logs in with GitHub OAuth (repo scope). Frontend calls GET /github/repos — a live GitHub API call using your stored encrypted token — and shows the repo list.

2. Pick a task
User picks a repo → GET /projects/{id}/issues pulls that repo's real open GitHub issues. User picks one (or types a free task). This is just text at this point — nothing gets embedded yet.

3. Kick off a run
Frontend calls POST /api/v1/agent/runs {project_id, task, model}. This just creates a row in Postgres (AgentRun, status pending) — the graph hasn't started. Then the frontend opens GET /agent/runs/{id}/stream (an SSE connection), and that's the moment the LangGraph StateGraph actually begins executing, on a background thread.

4. Researcher agent
First node to run. It's a ReAct tool-loop (create_agent) with read-only tools: read_file, list_files, search_code (plain text search), and search_codebase (semantic search). Here's the correction: the task doesn't get embedded as a formal step. Embedding only happens if the researcher decides to call search_codebase(some_query) — at that moment, that specific query string gets embedded on the fly and compared against the codebase's chunks, which were already embedded once, earlier, when you indexed the project (POST /projects/{id}/index). The researcher decides whether and what to search — that's what makes it "agentic RAG" instead of a fixed pipeline. It ends by writing a text brief — no files touched.

5. Planner agent
Not a tool loop — one LLM call constrained to a structured schema (Plan: summary, steps, test_command). Reads the researcher's brief, outputs a real plan, not free text.

6. Coder agent
ReAct loop again, but now with write_file and run_command added. It actually edits files inside the repo's real cloned-to-disk copy (apps/api/workspaces/{project_id}/) — a real git checkout, not an abstraction.

7. Tester agent
Runs the plan's test_command (e.g. pytest) inside that same sandboxed folder, checks the exit code.

8. The loop — here's the actual correction: if tests fail, it does not go back to the planner. It goes straight back to the coder, with the test failure output appended to its prompt ("here's what broke, fix it"). Same plan, another coding attempt. This repeats up to 3 times (MAX_REPAIR_ATTEMPTS). Only after 3 failures does it give up and move on, reporting failure honestly instead of looping forever.

9. Reviewer agent
Summarizes what happened — files changed, how many attempts it took, pass/fail.

10. GitHub agent (the final node)
Only runs if tests actually passed. Creates a branch, commits, pushes, opens a real PR via the GitHub API. If tests never passed, this step just reports "skipped" — nothing gets pushed.

Throughout all of this: every agent, the moment it starts and the moment it finishes, emits a small status event (get_stream_writer) that flows over that same SSE connection — that live feed is what will drive your six status boxes on the frontend, each one lighting up as its agent runs.

About "everything is stored in Postgres" — partial correction
Postgres genuinely holds: users, projects, the codebase's embedded chunks (pgvector), and each run's final record (task, status, review notes, PR link). What it does not currently hold: the moment-to-moment scratchpad of each agent's tool calls and thinking — that lives only in memory while a node is running and gets thrown away once that node hands back its summary. LangGraph does have a mechanism for persisting that (a "checkpointer," saving state after every node) — right now it's using MemorySaver (in-process, gone on restart) rather than PostgresSaver. Upgrading that is exactly what's left for M4, and it's also what would let a run pause for your approval and survive until you click Approve, possibly minutes or hours later.

One-paragraph summary
You connect GitHub, pick a repo and an issue, and that task kicks off one LangGraph StateGraph — five specialist agents running one after another (not in parallel), each reading and writing a shared state object. Researcher explores (optionally using embedding-based semantic search over your pre-indexed codebase), Planner commits to a structured plan, Coder writes real files to a real cloned repo, Tester runs real tests, and on failure it's Coder — not Planner — that retries, up to 3 times, using the failure as new context. Once tests pass, Reviewer writes a summary and a final GitHub agent opens a real pull request. Every step streams a live status update the whole way, which is what makes the "watch the agents work" dashboard possible.