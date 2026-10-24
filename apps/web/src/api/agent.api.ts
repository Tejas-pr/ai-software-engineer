import { apiClient, baseURL } from "./api"
import { API_ENDPOINTS } from "./endpoints"

export type RunStatus =
  | "pending"
  | "running"
  | "awaiting_approval"
  | "completed"
  | "rejected"
  | "failed"

export interface AgentRun {
  id: number
  created_at: string
  updated_at: string
  project_id: number
  user_id: number
  task: string
  model: string
  status: RunStatus
  pending_plan: Plan | null
  review_notes: string | null
  pr_url: string | null
  error: string | null
}

export interface PlanStep {
  description: string
  files: string[]
}

export interface Plan {
  summary: string
  steps: PlanStep[]
  test_command: string
}

// Every event the backend can emit over an agent run's SSE stream. `agent`/
// `status`/`detail` come from a graph node's own get_stream_writer() calls
// (app/agents/graph.py's _emit) — "updates" carries LangGraph's own
// per-node state deltas, keyed by node name; "interrupt" is the
// human_approval pause; "error" is a run-ending exception.
export interface AgentStreamEvent {
  mode: "custom" | "updates" | "interrupt" | "error"
  payload: unknown
}

export async function createRun(
  project_id: number,
  task: string,
  model: string,
  skip_tests = false
): Promise<AgentRun> {
  const res = await apiClient.post<AgentRun>(API_ENDPOINTS.AGENT_RUNS, {
    project_id,
    task,
    model,
    skip_tests,
  })
  return res.data
}

export interface RunListItem extends AgentRun {
  project_name: string
}

/** The organization's runs (optionally one project's), newest first */
export async function listRuns(
  organizationId: number,
  projectId?: number
): Promise<RunListItem[]> {
  const res = await apiClient.get<RunListItem[]>(API_ENDPOINTS.AGENT_RUNS, {
    params: { organization_id: organizationId, project_id: projectId },
  })
  return res.data
}

export interface AgentInfo {
  id: string
  name: string
  role: string
  description: string
  kind: string
  tools: string[]
  limits: string[]
  outputs: string
}

export interface AgentCatalog {
  agents: AgentInfo[]
  approval_step: { id: string; name: string; role: string }
  /** Node ids in pipeline order, including the human approval step */
  order: string[]
}

/** Public: the pipeline's agents as configured on this server */
export async function getAgentCatalog(): Promise<AgentCatalog> {
  const res = await apiClient.get<AgentCatalog>(API_ENDPOINTS.AGENT_CATALOG)
  return res.data
}

export async function getRun(id: number): Promise<AgentRun> {
  const res = await apiClient.get<AgentRun>(API_ENDPOINTS.AGENT_RUN(id))
  return res.data
}

/** Opens the run's live SSE stream. Starts graph execution the moment this
 * connects — there's no separate "start" call. */
export function streamRun(id: number): Promise<Response> {
  return fetch(`${baseURL}${API_ENDPOINTS.AGENT_RUN_STREAM(id)}`, {
    credentials: "include",
  })
}

/** Resumes a run paused at human_approval. Also an SSE stream — covers
 * execution from here to the end, same event shape as streamRun. */
export function approveRun(
  id: number,
  approved: boolean,
  feedback?: string
): Promise<Response> {
  return fetch(`${baseURL}${API_ENDPOINTS.AGENT_RUN_APPROVE(id)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ approved, feedback }),
  })
}

/** Retries a `failed` run from wherever it actually stopped (LangGraph's
 * checkpoint), instead of restarting the whole pipeline — e.g. everything
 * through Reviewer already succeeded and only the GitHub step blew up.
 * Also an SSE stream, same event shape as streamRun. Does NOT reset the
 * workspace — keeps whatever the coder already built. */
export function retryRun(id: number): Promise<Response> {
  return fetch(`${baseURL}${API_ENDPOINTS.AGENT_RUN_RETRY(id)}`, {
    method: "POST",
    credentials: "include",
  })
}

/** Cancels an active run immediately. */
export async function cancelRun(id: number): Promise<AgentRun> {
  const res = await apiClient.post<AgentRun>(API_ENDPOINTS.AGENT_RUN_CANCEL(id))
  return res.data
}

/** Parses a `text/event-stream` body of `data: {...}\n\n` frames into
 * typed events, one at a time, as they arrive. */
export async function* readAgentStream(
  response: Response
): AsyncGenerator<AgentStreamEvent> {
  if (!response.body) return
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let sepIndex: number
    while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sepIndex)
      buffer = buffer.slice(sepIndex + 2)
      if (!frame.startsWith("data: ")) continue
      const json = frame.slice("data: ".length)
      try {
        yield JSON.parse(json) as AgentStreamEvent
      } catch {
        // partial/malformed frame — skip rather than crash the whole stream
      }
    }
  }
}
