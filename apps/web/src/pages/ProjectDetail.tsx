import { useEffect, useState } from "react"
import axios from "axios"
import { Link, useParams } from "react-router-dom"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectPositioner,
  SelectPopup,
  SelectList,
  SelectItem,
} from "@workspace/ui/components/select"
import {
  approveRun,
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

function statusDot(status: NodeStatus) {
  const color = {
    idle: "bg-muted-foreground/30",
    running: "bg-primary animate-pulse",
    done: "bg-emerald-500",
    error: "bg-destructive",
  }[status]
  return <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
}

function describeError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return (
      (err.response?.data as { detail?: string } | undefined)?.detail ||
      fallback
    )
  }
  return fallback
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const id = Number(projectId)

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

  useEffect(() => {
    getProject(id)
      .then(setProject)
      .catch(() => setProject(null))
      .finally(() => setProjectLoading(false))
    listRuns()
      .then((all) => setRunHistory(all.filter((r) => r.project_id === id)))
      .catch(() => {})
  }, [id])

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

  const consumeStream = async (response: Response, runId: number) => {
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
    const updated = await getRun(runId)
    setRun(updated)
    setRunHistory((prev) => [
      updated,
      ...prev.filter((r) => r.id !== updated.id),
    ])
  }

  const handleStartRun = async () => {
    if (!project || !task.trim()) return
    setNodeStates(initialNodeStates())
    setPendingPlan(null)
    setStreamError(null)
    const newRun = await createRun(project.id, task, model, skipTests)
    setRun(newRun)
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

  const canRun =
    project?.status === "ready" &&
    task.trim().length > 0 &&
    (!run || ["completed", "rejected", "failed"].includes(run.status))

  if (projectLoading || !project) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <header className="mb-10 space-y-2 border-b border-border pb-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </header>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-1">
              <div className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
              <div className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
            <div className="space-y-6 lg:col-span-2">
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="space-y-2 rounded-lg border border-border bg-card p-4 shadow-sm"
                  >
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-10 flex items-center justify-between border-b border-border pb-6">
          <div>
            <Link
              to="/"
              className="text-xs text-muted-foreground hover:underline"
            >
              ← All repositories
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">
              {project.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {project.github_url}
            </p>
          </div>
        </header>

        {project.status === "pending" && (
          <p className="mb-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            Cloning repository...
          </p>
        )}

        {project.status === "failed" && (
          <div className="mb-6 flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">{project.description}</p>
            <Button
              variant="outline"
              className="rounded-lg"
              onClick={handleRetry}
              disabled={retrying}
            >
              {retrying ? "Retrying..." : "Retry"}
            </Button>
          </div>
        )}
        {setupError && (
          <p className="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            {setupError}
          </p>
        )}

        {project.status === "ready" && (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left column: setup */}
            <div className="space-y-6 lg:col-span-1">
              <section className="space-y-3 rounded-lg border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Task
                  </h2>
                  <button
                    onClick={refreshIssues}
                    disabled={issuesLoading}
                    className="cursor-pointer text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    {issuesLoading ? "Refreshing..." : "Refresh issues"}
                  </button>
                </div>
                {issuesLoading ? (
                  <Skeleton className="h-8 w-full" />
                ) : (
                  issues.length > 0 && (
                    <Select
                      value={selectedIssue}
                      onValueChange={(val) => {
                        setSelectedIssue(val)
                        const issue = issues.find(
                          (i) => i.number === Number(val)
                        )
                        if (issue)
                          setTask(
                            `Implement issue #${issue.number}: ${issue.title}`
                          )
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pick an open issue..." />
                      </SelectTrigger>
                      <SelectPortal>
                        <SelectPositioner>
                          <SelectPopup>
                            <SelectList>
                              {issues.map((issue) => (
                                <SelectItem
                                  key={issue.number}
                                  value={String(issue.number)}
                                >
                                  #{issue.number} {issue.title}
                                </SelectItem>
                              ))}
                            </SelectList>
                          </SelectPopup>
                        </SelectPositioner>
                      </SelectPortal>
                    </Select>
                  )
                )}
                <textarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="Describe the task, or pick an issue above..."
                  rows={4}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </section>

              <section className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
                {/* Section header + key-source toggle */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Model
                  </h2>
                  {/* Key-source toggle pill */}
                  <div className="flex items-center gap-1 rounded-full border border-border bg-muted p-0.5 text-xs">
                    <button
                      id="key-source-my-key"
                      onClick={() => {
                        setKeySource("my-key")
                        // Reset model if current selection is no longer visible.
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
                      className={`cursor-pointer rounded-full px-3 py-1 transition-colors ${
                        keySource === "my-key"
                          ? "bg-primary font-semibold text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      My API key
                    </button>
                    <button
                      id="key-source-platform"
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
                      className={`cursor-pointer rounded-full px-3 py-1 transition-colors ${
                        keySource === "platform"
                          ? "bg-primary font-semibold text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Platform AI
                    </button>
                  </div>
                </div>

                {/* Model picker — only shows models reachable under the current toggle */}
                {visibleModels.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {keySource === "my-key"
                      ? "No API keys configured. Add them in Settings, or switch to Platform AI."
                      : "No platform API keys are configured on this server."}
                  </p>
                ) : (
                  <Select
                    value={model}
                    onValueChange={(val) => val && setModel(val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPortal>
                      <SelectPositioner>
                        <SelectPopup>
                          <SelectList>
                            {visibleModels.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                <span>{m.name}</span>
                                <span className="ml-auto flex items-center gap-1.5 pl-4 text-[10px] text-muted-foreground">
                                  {m.recommended && (
                                    <span
                                      title="Best fit for coding among your installed local models"
                                      className="rounded-full bg-primary/10 px-1.5 py-0.5 font-semibold text-primary"
                                    >
                                      Recommended
                                    </span>
                                  )}
                                  {m.group}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectList>
                        </SelectPopup>
                      </SelectPositioner>
                    </SelectPortal>
                  </Select>
                )}

                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={skipTests}
                    onChange={(e) => setSkipTests(e.target.checked)}
                    className="cursor-pointer rounded border-border"
                  />
                  Skip tests (treat as passed — useful when the repo has no test
                  suite, or the planner picks a bad verify command)
                </label>
                <Button
                  className="w-full rounded-lg font-semibold"
                  disabled={!canRun}
                  onClick={handleStartRun}
                >
                  {run &&
                  !["completed", "rejected", "failed"].includes(run.status)
                    ? "Running..."
                    : "Run"}
                </Button>
              </section>
            </div>

            {/* Right column: live status */}
            <div className="space-y-6 lg:col-span-2">
              <div className="grid gap-4 sm:grid-cols-2">
                {AGENT_NODES.map((node) => {
                  const state = nodeStates[node.key]
                  return (
                    <div
                      key={node.key}
                      className="space-y-1 rounded-lg border border-border bg-card p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-semibold">
                          {node.label}
                          <span
                            title={node.description}
                            className="flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-muted-foreground/40 text-[9px] leading-none text-muted-foreground"
                          >
                            i
                          </span>
                        </span>
                        {statusDot(state.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {node.blurb}
                      </p>
                      {state.detail && (
                        <p className="line-clamp-2 pt-1 text-xs text-foreground/80">
                          {state.detail}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              {pendingPlan && (
                <div className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-6 shadow-sm">
                  <h3 className="text-sm font-bold tracking-wider text-primary uppercase">
                    Approval needed
                  </h3>
                  <p className="text-sm text-foreground">
                    {pendingPlan.summary}
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                    {pendingPlan.steps.map((step, i) => (
                      <li key={i}>{step.description}</li>
                    ))}
                  </ul>
                  <p className="font-mono text-xs text-muted-foreground">
                    Verify with: {pendingPlan.test_command}
                  </p>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      Feedback (optional)
                    </label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="e.g. This is a React project — use .tsx components, not raw HTML/CSS/JS. Approve sends this as extra guidance; Reject sends it back to the planner for a revised plan."
                      rows={2}
                      className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      className="rounded-lg"
                      onClick={() => handleApproval(true)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => handleApproval(false)}
                    >
                      {feedback.trim() ? "Reject & Revise" : "Reject"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Once the run reaches a terminal state, the Result panel
                  below shows this same message via run.error — no need to
                  show it twice. */}
              {streamError && run?.status !== "failed" && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                  {streamError}
                </div>
              )}

              {run &&
                ["completed", "rejected", "failed"].includes(run.status) && (
                  <div className="space-y-2 rounded-lg border border-border bg-card p-6 shadow-sm">
                    <h3 className="text-sm font-bold tracking-wider uppercase">
                      Result: {run.status}
                    </h3>
                    {run.review_notes && (
                      <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                        {run.review_notes}
                      </p>
                    )}
                    {run.pr_url && (
                      <a
                        href={run.pr_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-sm font-semibold text-primary underline"
                      >
                        View pull request →
                      </a>
                    )}
                    {run.error && (
                      <p className="text-sm text-destructive">{run.error}</p>
                    )}
                    {run.status === "failed" && (
                      <Button
                        onClick={handleRetryRun}
                        disabled={retryingRun}
                        size="sm"
                        variant="outline"
                        className="mt-2"
                      >
                        {retryingRun ? "Retrying…" : "Retry from last step"}
                      </Button>
                    )}
                  </div>
                )}

              {runHistory.length > 0 && (
                <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <h3 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Run history
                  </h3>
                  <div className="space-y-2">
                    {runHistory.slice(0, 10).map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="truncate pr-4 text-foreground/80">
                          {r.task}
                        </span>
                        <span className="shrink-0 font-mono text-muted-foreground">
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
