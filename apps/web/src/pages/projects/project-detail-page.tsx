import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { notifyOrgDataChanged } from "@/hooks/organization/use-org-data"
import { describeError } from "@/lib/common/api-error"
import { paths } from "@/lib/common/paths"
import { RUN_STATUS } from "@/lib/common/status"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { ApplicationBadge } from "@/components/molecules/application/application-badge"
import { ApplicationButton } from "@/components/molecules/application/application-button"
import { ApplicationCard } from "@/components/molecules/application/application-card"
import { ApplicationSelection } from "@/components/molecules/application/application-selection"
import { PageHeader } from "@/components/molecules/common/page-header"
import {
  approveRun,
  cancelRun,
  createRun,
  getRun,
  listRuns,
  readAgentStream,
  retryRun,
  streamRun,
  type AgentRun,
  type Plan,
} from "@/api/agent.api"
import {
  getProject,
  getProjectIssues,
  reconnectProject,
  type Project,
  type ProjectIssue,
} from "@/api/projects.api"
import { getAvailableModels, type AvailableModels } from "@/api/settings.api"

// Cloud models tagged with their provider prefix for availability filtering.
const ALL_CLOUD_MODELS = [
  { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash", provider: "gemini" },
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", provider: "gemini" },
  { id: "claude-sonnet-5", name: "Claude Sonnet 5", provider: "claude" },
  {
    id: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5",
    provider: "claude",
  },
  { id: "gpt-5.1", name: "GPT-5.1", provider: "gpt" },
]

type KeySource = "my-key" | "platform"

// Fixed display order matching app/agents/graph.py's node graph — not the
// arrival order of events, so a box never jumps around on screen.
const AGENT_NODES = [
  {
    key: "researcher",
    label: "Researcher",
    blurb: "Explores the repo",
    description:
      "Reads the codebase with read-only tools (list/search/read files, semantic search over the indexed repo) to brief the planner. The tech stack itself is detected deterministically from package.json/etc., not guessed by this agent.",
  },
  {
    key: "planner",
    label: "Planner",
    blurb: "Writes the implementation plan",
    description:
      "Turns the research into a concrete plan: the steps to take, files to touch, and the command that verifies the change. Must match the detected tech stack — won't introduce a different framework.",
  },
  {
    key: "human_approval",
    label: "Approval",
    blurb: "Waits for you",
    description:
      "Pauses the run until you approve or reject the plan. Reject with feedback to send it back to the planner for a revision instead of ending the run; feedback on an approval is passed to the coder as extra guidance.",
  },
  {
    key: "coder",
    label: "Coder",
    blurb: "Edits files",
    description:
      "Implements the approved plan: reads files, then writes the actual changes to the cloned repo on disk.",
  },
  {
    key: "tester",
    label: "Tester",
    blurb: "Runs tests",
    description:
      "Runs the plan's verification command. On failure, loops back to the coder with the failure output (up to 3 attempts) before giving up. Can be skipped entirely with the checkbox below if the task doesn't need it.",
  },
  {
    key: "reviewer",
    label: "Reviewer",
    blurb: "Summarizes the result",
    description:
      "Summarizes what happened — files changed, attempts taken, pass/fail.",
  },
  {
    key: "github",
    label: "GitHub",
    blurb: "Opens the pull request",
    description:
      "Creates a branch, commits, pushes, and opens a real PR — only if tests passed (or were skipped). A failed run never gets pushed.",
  },
] as const

type NodeStatus = "idle" | "running" | "done" | "error"

interface NodeState {
  status: NodeStatus
  detail: string
}

function initialNodeStates(): Record<string, NodeState> {
  const states: Record<string, NodeState> = {}
  for (const node of AGENT_NODES)
    states[node.key] = { status: "idle", detail: "" }
  return states
}

function nodeBadge(status: NodeStatus) {
  const map: Record<
    NodeStatus,
    { variant: "neutral" | "running" | "completed" | "failed"; label: string }
  > = {
    idle: { variant: "neutral", label: "Idle" },
    running: { variant: "running", label: "Running" },
    done: { variant: "completed", label: "Done" },
    error: { variant: "failed", label: "Error" },
  }
  const config = map[status] ?? { variant: "neutral", label: status }
  return (
    <ApplicationBadge
      size="sm"
      variant={config.variant}
      dot
      pulseDot={status === "running"}
    >
      {config.label}
    </ApplicationBadge>
  )
}

export function ProjectDetailPage() {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const id = Number(projectId)
  const [searchParams] = useSearchParams()
  const requestedRunId = Number(searchParams.get("run")) || null
  // The run whose live stream this page is attached to, so a second effect
  // pass (StrictMode, re-render) never opens a duplicate stream
  const attachedRunId = useRef<number | null>(null)

  const [project, setProject] = useState<Project | null>(null)
  const [projectLoading, setProjectLoading] = useState(true)
  const [prevId, setPrevId] = useState(id)
  if (id !== prevId) {
    setPrevId(id)
    setProjectLoading(true)
  }
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null)
  const [issues, setIssues] = useState<ProjectIssue[]>([])
  const [issuesLoading, setIssuesLoading] = useState(false)
  const [task, setTask] = useState("")
  const [model, setModel] = useState(ALL_CLOUD_MODELS[0].id)
  const [skipTests, setSkipTests] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  // Distinct from `retrying` above (project reconnect) — this is for
  // retrying a failed *run* from its last checkpoint via POST .../retry.
  const [retryingRun, setRetryingRun] = useState(false)
  const [stoppingRun, setStoppingRun] = useState(false)

  // Key-source toggle state and available providers fetched from backend.
  const [availableModels, setAvailableModels] =
    useState<AvailableModels | null>(null)
  const [keySource, setKeySource] = useState<KeySource>("my-key")

  const [run, setRun] = useState<AgentRun | null>(null)
  const [nodeStates, setNodeStates] =
    useState<Record<string, NodeState>>(initialNodeStates())
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null)
  const [feedback, setFeedback] = useState("")
  const [streamError, setStreamError] = useState<string | null>(null)
  const [runHistory, setRunHistory] = useState<AgentRun[]>([])

  // Which providers are usable under the current toggle setting.
  const activeProviders: Set<string> = availableModels
    ? new Set(
        keySource === "my-key"
          ? availableModels.user_providers
          : availableModels.platform_providers
      )
    : new Set()

  // Local Ollama models — fetched live from the backend (which queries
  // Ollama's own `/api/tags`, see app/services/ollama.py), not a
  // hardcoded list, so whatever's actually pulled on this machine shows
  // up automatically. Whichever one the backend judged the best fit for
  // the Coder step (see recommend_coding_model) is flagged and sorted first.
  const localModels = (availableModels?.local_models ?? [])
    .map((m) => ({
      id: m.id,
      name: m.parameter_size ? `${m.id} (${m.parameter_size})` : m.id,
      provider: "local" as const,
      recommended: m.id === availableModels?.recommended_coding_model,
    }))
    .sort((a, b) => Number(b.recommended) - Number(a.recommended))

  // Cloud models reachable under current toggle + always-on local models.
  const visibleModels = [
    ...ALL_CLOUD_MODELS.filter((m) => activeProviders.has(m.provider)).map(
      (m) => ({ ...m, group: "Cloud" as const, recommended: false })
    ),
    ...localModels.map((m) => ({ ...m, group: "Local" as const })),
  ]

  const refreshIssues = () => {
    setIssuesLoading(true)
    getProjectIssues(id)
      .then(setIssues)
      .catch(() => setIssues([]))
      .finally(() => setIssuesLoading(false))
  }

  // Poll while the background clone is still running.
  useEffect(() => {
    if (project?.status !== "pending") return
    const interval = setInterval(async () => {
      const updated = await getProject(id)
      setProject(updated)
      if (updated.status !== "pending") clearInterval(interval)
    }, 2000)
    return () => clearInterval(interval)
  }, [project?.status, id])

  useEffect(() => {
    // Auto-fetch on the repo becoming ready — no loading indicator here
    // (that's for the manual "Refresh issues" button); this is silent.
    if (project?.status === "ready") {
      getProjectIssues(id)
        .then(setIssues)
        .catch(() => setIssues([]))
    }
  }, [project?.status, id])

  // Fetch which providers/models are reachable once on mount.
  useEffect(() => {
    getAvailableModels()
      .then((data) => {
        setAvailableModels(data)
        // Default to user's own key if they have at least one provider configured;
        // otherwise fall back to platform keys.
        if (data.user_providers.length > 0) {
          setKeySource("my-key")
        } else {
          setKeySource("platform")
        }
      })
      .catch(() => {
        // On error leave availableModels null — visibleModels will just be
        // the local Ollama models (the safe, always-available fallback).
      })
  }, [])

  const handleRetry = async () => {
    if (!project) return
    setRetrying(true)
    setSetupError(null)
    try {
      setProject(await reconnectProject(project))
    } catch (err) {
      setSetupError(describeError(err, "Couldn't reconnect. Try again."))
    } finally {
      setRetrying(false)
    }
  }

  /** Shows a run; a live one is reattached (the API replays its events) */
  const openRun = async (target: AgentRun) => {
    if (attachedRunId.current === target.id) return
    setRun(target)
    setNodeStates(initialNodeStates())
    setPendingPlan(
      target.status === "awaiting_approval" ? target.pending_plan : null
    )
    setStreamError(target.error)
    if (!RUN_STATUS[target.status].live) return
    attachedRunId.current = target.id
    const response = await streamRun(target.id)
    if (response.ok) await consumeStream(response, target.id)
  }

  const consumeStream = async (response: Response, runId: number) => {
    attachedRunId.current = runId
    setStreamError(null)
    for await (const event of readAgentStream(response)) {
      if (event.mode === "custom") {
        const { agent, status, detail } = event.payload as {
          agent: string
          status: NodeStatus
          detail: string
        }
        setNodeStates((prev) => ({ ...prev, [agent]: { status, detail } }))
      } else if (event.mode === "interrupt") {
        const { plan } = event.payload as { plan: Plan }
        setPendingPlan(plan)
      } else if (event.mode === "error") {
        setStreamError(String(event.payload))
      }
    }
    attachedRunId.current = null
    const updated = await getRun(runId)
    setRun(updated)
    setRunHistory((prev) => [
      updated,
      ...prev.filter((r) => r.id !== updated.id),
    ])
    notifyOrgDataChanged()
  }

  useEffect(() => {
    getProject(id)
      .then(async (loaded) => {
        setProject(loaded)
        const history = await listRuns(loaded.organization_id, id)
        setRunHistory(history)
        // Open the run the link asked for, else pick up a run that's
        // still in progress — e.g. after a reload or from another tab
        const target =
          history.find((r) => r.id === requestedRunId) ??
          history.find((r) => RUN_STATUS[r.status].live)
        if (target) void openRun(target)
      })
      .catch(() => setProject(null))
      .finally(() => setProjectLoading(false))
    // openRun is stable in behavior; re-run only for another project/run
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, requestedRunId])

  const handleStartRun = async () => {
    if (!project || !task.trim()) return
    setNodeStates(initialNodeStates())
    setPendingPlan(null)
    setStreamError(null)
    const newRun = await createRun(project.id, task, model, skipTests)
    setRun(newRun)
    notifyOrgDataChanged()
    const response = await streamRun(newRun.id)
    consumeStream(response, newRun.id)
  }

  const handleApproval = async (approved: boolean) => {
    if (!run) return
    setPendingPlan(null)
    setRun({ ...run, status: "running" })
    // Rejecting with feedback loops back to the planner for a revised plan
    // instead of ending the run — approving with feedback passes it to the
    // coder as extra guidance.
    const response = await approveRun(
      run.id,
      approved,
      feedback.trim() || undefined
    )
    setFeedback("")
    consumeStream(response, run.id)
  }

  const handleRetryRun = async () => {
    if (!run || run.status !== "failed") return
    setRetryingRun(true)
    setRun({ ...run, status: "running", error: null })
    try {
      const response = await retryRun(run.id)
      await consumeStream(response, run.id)
    } finally {
      setRetryingRun(false)
    }
  }

  const handleStopRun = async () => {
    if (!run || ["completed", "rejected", "failed"].includes(run.status)) return
    setStoppingRun(true)
    try {
      const updated = await cancelRun(run.id)
      setRun(updated)
      setStreamError("Run was stopped by user.")
      setRunHistory((prev) => [
        updated,
        ...prev.filter((r) => r.id !== updated.id),
      ])
    } catch {
      setRun({ ...run, status: "failed", error: "Run was stopped by user." })
      setStreamError("Run was stopped by user.")
    } finally {
      setStoppingRun(false)
    }
  }

  const canRun =
    project?.status === "ready" &&
    task.trim().length > 0 &&
    (!run || ["completed", "rejected", "failed"].includes(run.status))

  if (projectLoading || !project) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
        <header className="space-y-2 border-b border-border pb-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </header>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <ApplicationCard className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-20 w-full" />
            </ApplicationCard>
            <ApplicationCard className="space-y-4 p-6">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </ApplicationCard>
          </div>
          <div className="space-y-6 lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <ApplicationCard key={n} className="space-y-2 p-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </ApplicationCard>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow={project.github_url}
        title={project.name}
        description="Run autonomous agents to research, plan, code, test, and open pull requests."
        actions={
          <div className="flex items-center gap-2">
            <ApplicationButton
              variant="secondary"
              iconLeft={<ArrowLeft />}
              onClick={() => navigate(paths.projects.root)}
            >
              Repositories
            </ApplicationButton>
            <ApplicationBadge
              variant={
                project.status === "ready"
                  ? "completed"
                  : project.status === "failed"
                    ? "failed"
                    : "running"
              }
              dot
            >
              {project.status === "ready"
                ? "Ready"
                : project.status === "failed"
                  ? "Failed"
                  : "Cloning"}
            </ApplicationBadge>
          </div>
        }
      />

      {project.status === "pending" && (
        <ApplicationCard className="p-4 text-sm text-muted-foreground">
          Cloning repository...
        </ApplicationCard>
      )}

      {project.status === "failed" && (
        <ApplicationCard className="border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-destructive">{project.description}</p>
            <ApplicationButton
              variant="secondary"
              onClick={handleRetry}
              disabled={retrying}
            >
              {retrying ? "Retrying..." : "Retry"}
            </ApplicationButton>
          </div>
        </ApplicationCard>
      )}

      {setupError && (
        <ApplicationCard className="border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {setupError}
        </ApplicationCard>
      )}

      {project.status === "ready" && (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left column: setup */}
          <div className="space-y-6 lg:col-span-1">
            <ApplicationCard className="space-y-4 p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  Task
                </h2>
                <ApplicationButton
                  variant="ghost"
                  size="sm"
                  onClick={refreshIssues}
                  disabled={issuesLoading}
                  iconLeft={
                    <RefreshCw
                      className={cn("size-3", issuesLoading && "animate-spin")}
                    />
                  }
                >
                  Refresh issues
                </ApplicationButton>
              </div>

              {issuesLoading ? (
                <Skeleton className="h-9 w-full rounded-lg" />
              ) : (
                issues.length > 0 && (
                  <ApplicationSelection
                    aria-label="Pick an open issue"
                    options={issues.map((issue) => ({
                      value: String(issue.number),
                      label: `#${issue.number} ${issue.title}`,
                    }))}
                    value={selectedIssue}
                    onValueChange={(val) => {
                      setSelectedIssue(val)
                      const issue = issues.find((i) => i.number === Number(val))
                      if (issue) {
                        setTask(
                          `Implement issue #${issue.number}: ${issue.title}`
                        )
                      }
                    }}
                    placeholder="Pick an open issue…"
                    indicator="chevron-down"
                  />
                )
              )}

              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Describe the task, or pick an issue above..."
                rows={4}
                className="w-full resize-none rounded-lg border border-input bg-card p-3 text-xs text-foreground transition-all duration-200 outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-primary/25 dark:bg-input/20"
              />
            </ApplicationCard>

            <ApplicationCard className="space-y-4 p-5 sm:p-6">
              {/* Section header + key-source toggle */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  Model
                </h2>
                {/* Key-source toggle */}
                <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/60 p-1">
                  <ApplicationButton
                    size="sm"
                    variant={keySource === "my-key" ? "highlight" : "ghost"}
                    onClick={() => {
                      setKeySource("my-key")
                      const providers = availableModels?.user_providers ?? []
                      const stillVisible =
                        ALL_CLOUD_MODELS.some(
                          (m) =>
                            m.id === model && providers.includes(m.provider)
                        ) || localModels.some((m) => m.id === model)
                      if (!stillVisible) {
                        const first = ALL_CLOUD_MODELS.find((m) =>
                          providers.includes(m.provider)
                        )
                        setModel(first?.id ?? localModels[0]?.id ?? model)
                      }
                    }}
                  >
                    My API key
                  </ApplicationButton>
                  <ApplicationButton
                    size="sm"
                    variant={keySource === "platform" ? "highlight" : "ghost"}
                    onClick={() => {
                      setKeySource("platform")
                      const providers =
                        availableModels?.platform_providers ?? []
                      const stillVisible =
                        ALL_CLOUD_MODELS.some(
                          (m) =>
                            m.id === model && providers.includes(m.provider)
                        ) || localModels.some((m) => m.id === model)
                      if (!stillVisible) {
                        const first = ALL_CLOUD_MODELS.find((m) =>
                          providers.includes(m.provider)
                        )
                        setModel(first?.id ?? localModels[0]?.id ?? model)
                      }
                    }}
                  >
                    Platform AI
                  </ApplicationButton>
                </div>
              </div>

              {/* Model picker */}
              {visibleModels.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {keySource === "my-key"
                    ? "No API keys configured. Add them in Settings, or switch to Platform AI."
                    : "No platform API keys are configured on this server."}
                </p>
              ) : (
                <ApplicationSelection
                  aria-label="Select model"
                  options={visibleModels.map((m) => ({
                    value: m.id,
                    label: `${m.name} (${m.group})`,
                  }))}
                  value={model}
                  onValueChange={(val) => val && setModel(val)}
                  indicator="chevron-down"
                />
              )}

              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={skipTests}
                  onChange={(e) => setSkipTests(e.target.checked)}
                  className="size-4 cursor-pointer rounded border-border text-primary focus:ring-primary/25"
                />
                Skip tests (treat as passed — useful when repo has no test
                suite)
              </label>

              <div className="flex items-center gap-2 pt-1">
                <ApplicationButton
                  className="flex-1"
                  variant="primary"
                  disabled={!canRun}
                  onClick={handleStartRun}
                >
                  {run &&
                  !["completed", "rejected", "failed"].includes(run.status)
                    ? "Running..."
                    : "Run"}
                </ApplicationButton>
                {run &&
                  !["completed", "rejected", "failed"].includes(run.status) && (
                    <ApplicationButton
                      variant="destructive"
                      disabled={stoppingRun}
                      onClick={handleStopRun}
                    >
                      {stoppingRun ? "Stopping..." : "Stop"}
                    </ApplicationButton>
                  )}
              </div>
            </ApplicationCard>
          </div>

          {/* Right column: live status */}
          <div className="space-y-6 lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
              {AGENT_NODES.map((node) => {
                const state = nodeStates[node.key]
                return (
                  <ApplicationCard
                    key={node.key}
                    className="flex flex-col justify-between gap-2 p-4 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold">
                        {node.label}
                        <span
                          title={node.description}
                          className="flex size-3.5 cursor-help items-center justify-center rounded-full border border-muted-foreground/40 text-[9px] leading-none text-muted-foreground"
                        >
                          i
                        </span>
                      </span>
                      {nodeBadge(state.status)}
                    </div>
                    <p className="text-2xs text-muted-foreground">
                      {node.blurb}
                    </p>
                    {state.detail && (
                      <p className="line-clamp-2 text-2xs text-foreground/80">
                        {state.detail}
                      </p>
                    )}
                  </ApplicationCard>
                )
              })}
            </div>

            {pendingPlan && (
              <ApplicationCard className="space-y-4 border-primary/40 bg-primary/5 p-6">
                <div className="flex items-center gap-2">
                  <ApplicationBadge variant="awaiting" dot pulseDot>
                    Approval Needed
                  </ApplicationBadge>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {pendingPlan.summary}
                </p>
                <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                  {pendingPlan.steps.map((step, i) => (
                    <li key={i}>{step.description}</li>
                  ))}
                </ul>
                <p className="font-mono text-2xs text-muted-foreground">
                  Verify with:{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5">
                    {pendingPlan.test_command}
                  </code>
                </p>
                <div className="space-y-1">
                  <label className="text-2xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    Feedback (optional)
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="e.g. This is a React project — use .tsx components, not raw HTML/CSS/JS. Approve sends this as extra guidance; Reject sends it back to the planner for a revised plan."
                    rows={2}
                    className="w-full resize-none rounded-lg border border-input bg-card p-3 text-xs text-foreground transition-all duration-200 outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-primary/25 dark:bg-input/20"
                  />
                </div>
                <div className="flex gap-3">
                  <ApplicationButton
                    variant="primary"
                    onClick={() => handleApproval(true)}
                  >
                    Approve
                  </ApplicationButton>
                  <ApplicationButton
                    variant="secondary"
                    onClick={() => handleApproval(false)}
                  >
                    {feedback.trim() ? "Reject & Revise" : "Reject"}
                  </ApplicationButton>
                </div>
              </ApplicationCard>
            )}

            {streamError && run?.status !== "failed" && (
              <ApplicationCard className="border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                {streamError}
              </ApplicationCard>
            )}

            {run &&
              ["completed", "rejected", "failed"].includes(run.status) && (
                <ApplicationCard className="space-y-3 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xs font-medium tracking-[0.12em] uppercase">
                      Result
                    </h3>
                    <ApplicationBadge
                      variant={
                        run.status === "completed"
                          ? "completed"
                          : run.status === "failed"
                            ? "failed"
                            : "neutral"
                      }
                      dot
                    >
                      {RUN_STATUS[run.status].label}
                    </ApplicationBadge>
                  </div>
                  {run.review_notes && (
                    <p className="text-xs whitespace-pre-wrap text-muted-foreground">
                      {run.review_notes}
                    </p>
                  )}
                  {run.pr_url && (
                    <a
                      href={run.pr_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-link hover:underline"
                    >
                      View pull request <ExternalLink className="size-3.5" />
                    </a>
                  )}
                  {run.error && (
                    <p className="text-xs text-destructive">{run.error}</p>
                  )}
                  {run.status === "failed" && (
                    <ApplicationButton
                      onClick={handleRetryRun}
                      disabled={retryingRun}
                      size="sm"
                      variant="secondary"
                      className="mt-2"
                    >
                      {retryingRun ? "Retrying…" : "Retry from last step"}
                    </ApplicationButton>
                  )}
                </ApplicationCard>
              )}

            {runHistory.length > 0 && (
              <ApplicationCard className="p-6">
                <h3 className="mb-3 text-2xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  Run history
                </h3>
                <div className="space-y-1.5">
                  {runHistory.slice(0, 10).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => void openRun(r)}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-start text-xs transition-colors hover:bg-muted",
                        run?.id === r.id && "bg-muted"
                      )}
                    >
                      <span className="truncate pr-4 text-foreground/80">
                        {r.task}
                      </span>
                      <ApplicationBadge
                        size="sm"
                        variant={RUN_STATUS[r.status]?.badge ?? "neutral"}
                      >
                        {RUN_STATUS[r.status]?.label ?? r.status}
                      </ApplicationBadge>
                    </button>
                  ))}
                </div>
              </ApplicationCard>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
