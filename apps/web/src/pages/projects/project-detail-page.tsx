import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  Layers,
  ListChecks,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Square,
  Terminal,
} from "lucide-react"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Kbd } from "@workspace/ui/components/kbd"
import { toast } from "@workspace/ui/components/toast"
import { cn } from "@workspace/ui/lib/utils"
import { useSystemConfig } from "@/hooks/common/use-system-config"
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
import { ApplicationBadge } from "@/components/molecules/application/application-badge"
import { ApplicationButton } from "@/components/molecules/application/application-button"
import { ApplicationCard } from "@/components/molecules/application/application-card"
import { ApplicationInput } from "@/components/molecules/application/application-input"
import { ApplicationSelection } from "@/components/molecules/application/application-selection"
import { ApplicationTabs } from "@/components/molecules/application/application-tabs"
import { PageHeader } from "@/components/molecules/common/page-header"
import { notifyOrgDataChanged } from "@/hooks/organization/use-org-data"
import { describeError } from "@/lib/common/api-error"
import { timeAgo } from "@/lib/common/dates"
import { paths } from "@/lib/common/paths"
import { RUN_STATUS } from "@/lib/common/status"

// Cloud models tagged with provider for availability filtering
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

interface AgentNodeDef {
  key: string
  label: string
  role: string
  blurb: string
  icon: typeof Search
  description: string
}

// 7-step LangGraph multi-agent pipeline order
const AGENT_NODES: readonly AgentNodeDef[] = [
  {
    key: "researcher",
    label: "Researcher",
    role: "Codebase Exploration",
    blurb: "Reads codebase & queries semantic vector index",
    icon: Search,
    description:
      "Reads repository files and queries pgvector embeddings to brief the planner on existing abstractions, schemas, and dependencies.",
  },
  {
    key: "planner",
    label: "Planner",
    role: "Architecture & Spec",
    blurb: "Drafts step-by-step implementation plan and test harness",
    icon: ListChecks,
    description:
      "Formulates an exact execution plan, identifies target files, and provides the verification command conforming to the detected tech stack.",
  },
  {
    key: "human_approval",
    label: "Approval",
    role: "Human-in-the-Loop",
    blurb: "Pauses the run for your review and feedback",
    icon: ShieldCheck,
    description:
      "Pauses execution to allow you to approve the plan or reject with feedback for automatic replanning.",
  },
  {
    key: "coder",
    label: "Coder",
    role: "Implementation",
    blurb: "Applies precision file edits to cloned repository",
    icon: Code2,
    description:
      "Edits project files directly on the workspace branch following the approved plan.",
  },
  {
    key: "tester",
    label: "Tester",
    role: "Verification & Healing",
    blurb: "Executes test verification with auto-healing loop (up to 3x)",
    icon: Terminal,
    description:
      "Runs the plan's verification command in the workspace. Automatically sends failures back to the coder for up to 3 repair passes.",
  },
  {
    key: "reviewer",
    label: "Reviewer",
    role: "Diff & Quality Audit",
    blurb: "Evaluates code diff, file modifications and final pass/fail",
    icon: CheckCircle2,
    description:
      "Performs a git diff audit, summarizes the files touched, and prepares the changelog.",
  },
  {
    key: "github",
    label: "GitHub",
    role: "Pull Request",
    blurb: "Pushes branch, creates commit and opens a real PR",
    icon: GitPullRequest,
    description:
      "Pushes verified commits to the remote origin and opens a pull request linked to any referenced GitHub issue.",
  },
] as const

type NodeStatus = "idle" | "running" | "done" | "error"

interface NodeState {
  status: NodeStatus
  detail: string
}

interface LogEntry {
  id: string
  time: string
  agent?: string
  status?: string
  message: string
  type: "info" | "success" | "warning" | "error"
}

function initialNodeStates(): Record<string, NodeState> {
  const states: Record<string, NodeState> = {}
  for (const node of AGENT_NODES) {
    states[node.key] = { status: "idle", detail: "" }
  }
  return states
}

const QUICK_TEMPLATES = [
  { label: "Fix bug", text: "Investigate and resolve the bug: " },
  {
    label: "Unit tests",
    text: "Add comprehensive unit tests covering edge cases for ",
  },
  {
    label: "Refactor",
    text: "Refactor code to improve modularity and clean architecture.",
  },
  {
    label: "Add docs",
    text: "Document module APIs with type annotations and README usage.",
  },
]

export function ProjectDetailPage() {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const id = Number(projectId)
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedRunId = Number(searchParams.get("run")) || null
  const attachedRunId = useRef<number | null>(null)
  const { isRestricted } = useSystemConfig()

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
  const [retryingRun, setRetryingRun] = useState(false)
  const [stoppingRun, setStoppingRun] = useState(false)

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
  const [activeTab, setActiveTab] = useState<string>("pipeline")
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [copiedVerify, setCopiedVerify] = useState(false)

  // Usable providers
  const activeProviders: Set<string> = availableModels
    ? new Set(
        keySource === "my-key"
          ? availableModels.user_providers
          : availableModels.platform_providers
      )
    : new Set()

  // Local Ollama models
  const localModels = (availableModels?.local_models ?? [])
    .map((m) => ({
      id: m.id,
      name: m.parameter_size ? `${m.id} (${m.parameter_size})` : m.id,
      provider: "local" as const,
      recommended: m.id === availableModels?.recommended_coding_model,
    }))
    .sort((a, b) => Number(b.recommended) - Number(a.recommended))

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

  // Poll while background clone is pending
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
    if (project?.status === "ready") {
      getProjectIssues(id)
        .then(setIssues)
        .catch(() => setIssues([]))
    }
  }, [project?.status, id])

  useEffect(() => {
    getAvailableModels()
      .then((data) => {
        setAvailableModels(data)
        if (data.user_providers.length > 0) {
          setKeySource("my-key")
        } else {
          setKeySource("platform")
        }
      })
      .catch(() => {})
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

  const openRun = async (target: AgentRun) => {
    if (attachedRunId.current === target.id) return
    setRun(target)
    setNodeStates(initialNodeStates())
    setPendingPlan(
      target.status === "awaiting_approval" ? target.pending_plan : null
    )
    setStreamError(target.error)

    // Seed log history from known target fields
    const initialLogs: LogEntry[] = []
    if (target.created_at) {
      initialLogs.push({
        id: "init",
        time: new Date(target.created_at).toLocaleTimeString(),
        message: `Loaded run #${target.id} (${target.model}): "${target.task}"`,
        type: "info",
      })
    }
    if (target.pending_plan) {
      initialLogs.push({
        id: "plan",
        time: "plan",
        agent: "planner",
        message: `Plan: ${target.pending_plan.summary}`,
        type: "warning",
      })
    }
    if (target.review_notes) {
      initialLogs.push({
        id: "review",
        time: "review",
        agent: "reviewer",
        message: target.review_notes,
        type: "info",
      })
    }
    if (target.pr_url) {
      initialLogs.push({
        id: "pr",
        time: "github",
        agent: "github",
        message: `Pull request created: ${target.pr_url}`,
        type: "success",
      })
    }
    if (target.error) {
      initialLogs.push({
        id: "err",
        time: "error",
        message: target.error,
        type: "error",
      })
    }
    setLogs(initialLogs)

    if (!RUN_STATUS[target.status].live) return
    attachedRunId.current = target.id
    const response = await streamRun(target.id)
    if (response.ok) await consumeStream(response, target.id)
  }

  const consumeStream = async (response: Response, runId: number) => {
    attachedRunId.current = runId
    setStreamError(null)
    for await (const event of readAgentStream(response)) {
      const now = new Date().toLocaleTimeString()
      if (event.mode === "custom") {
        const { agent, status, detail } = event.payload as {
          agent: string
          status: NodeStatus
          detail: string
        }
        setNodeStates((prev) => ({ ...prev, [agent]: { status, detail } }))
        setLogs((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            time: now,
            agent,
            message: detail || `Node ${status}`,
            type:
              status === "error"
                ? "error"
                : status === "done"
                  ? "success"
                  : "info",
          },
        ])
      } else if (event.mode === "interrupt") {
        const { plan } = event.payload as { plan: Plan }
        setPendingPlan(plan)
        setLogs((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            time: now,
            agent: "planner",
            message: `Plan generated: "${plan.summary}". Pausing for human approval.`,
            type: "warning",
          },
        ])
      } else if (event.mode === "error") {
        const msg = String(event.payload)
        setStreamError(msg)
        setLogs((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            time: now,
            message: msg,
            type: "error",
          },
        ])
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
        const target =
          history.find((r) => r.id === requestedRunId) ??
          history.find((r) => RUN_STATUS[r.status].live)
        if (target) void openRun(target)
      })
      .catch(() => setProject(null))
      .finally(() => setProjectLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, requestedRunId])

  const handleStartRun = async () => {
    if (isRestricted) {
      toast.add({
        title: "Demo Mode Restricted",
        description:
          "Agent execution is disabled on this low-resource demo instance. Please clone the project to run locally or check the GitHub video walkthrough.",
        type: "warning",
      })
      return
    }
    if (!project || !task.trim()) return
    setNodeStates(initialNodeStates())
    setPendingPlan(null)
    setStreamError(null)
    const newLogs: LogEntry[] = [
      {
        id: "start",
        time: new Date().toLocaleTimeString(),
        message: `Initiating agent pipeline with ${model}...`,
        type: "info",
      },
    ]
    setLogs(newLogs)
    setActiveTab("pipeline")
    const newRun = await createRun(project.id, task, model, skipTests)
    setRun(newRun)
    setSearchParams({ run: String(newRun.id) }, { replace: true })
    notifyOrgDataChanged()
    const response = await streamRun(newRun.id)
    consumeStream(response, newRun.id)
  }

  const handleApproval = async (approved: boolean) => {
    if (isRestricted) {
      toast.add({
        title: "Demo Mode Restricted",
        description:
          "Agent execution is disabled on this low-resource demo instance. Please clone the project to run locally or check the GitHub video walkthrough.",
        type: "warning",
      })
      return
    }
    if (!run) return
    setPendingPlan(null)
    setRun({ ...run, status: "running" })
    const response = await approveRun(
      run.id,
      approved,
      feedback.trim() || undefined
    )
    setFeedback("")
    consumeStream(response, run.id)
  }

  const handleRetryRun = async () => {
    if (isRestricted) {
      toast.add({
        title: "Demo Mode Restricted",
        description:
          "Agent execution is disabled on this low-resource demo instance. Please clone the project to run locally or check the GitHub video walkthrough.",
        type: "warning",
      })
      return
    }
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
      setStreamError("Run stopped by user.")
      setRunHistory((prev) => [
        updated,
        ...prev.filter((r) => r.id !== updated.id),
      ])
    } catch {
      setRun({ ...run, status: "failed", error: "Run was stopped by user." })
      setStreamError("Run stopped by user.")
    } finally {
      setStoppingRun(false)
    }
  }

  const copyVerifyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd)
    setCopiedVerify(true)
    setTimeout(() => setCopiedVerify(false), 2000)
  }

  const canRun =
    project?.status === "ready" &&
    task.trim().length > 0 &&
    (!run || ["completed", "rejected", "failed"].includes(run.status))

  if (projectLoading || !project) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="space-y-3 border-b border-border pb-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-96" />
        </header>
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5 xl:col-span-4">
            <ApplicationCard className="space-y-4 p-6">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-9 w-full" />
            </ApplicationCard>
          </div>
          <div className="space-y-6 lg:col-span-7 xl:col-span-8">
            <ApplicationCard className="space-y-4 p-6">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-64 w-full" />
            </ApplicationCard>
          </div>
        </div>
      </div>
    )
  }

  const isLive = Boolean(run && RUN_STATUS[run.status]?.live)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      {/* 1. Header with Repository Meta & Context */}
      <PageHeader
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(paths.projects.root)}
              className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3" />
              <span>Repositories</span>
            </button>
            <span className="text-muted-foreground/40">/</span>
            <span className="font-mono">{project.name}</span>
          </div>
        }
        title={
          <span className="flex items-center gap-3">
            {project.name}
            <ApplicationBadge
              variant={
                project.status === "ready"
                  ? "completed"
                  : project.status === "failed"
                    ? "failed"
                    : "running"
              }
              dot
              pulseDot={project.status === "pending"}
            >
              {project.status === "ready"
                ? "Repository Ready"
                : project.status === "failed"
                  ? "Connection Failed"
                  : "Cloning Repository…"}
            </ApplicationBadge>
          </span>
        }
        description={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-mono">
              <GitBranch className="size-3.5 text-muted-foreground" />
              <span className="text-foreground">{project.branch}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-border" />
              <span className="font-mono">
                Index:{" "}
                <strong
                  className={cn(
                    "font-medium",
                    project.index_status === "ready"
                      ? "text-run-completed"
                      : project.index_status === "indexing"
                        ? "text-primary"
                        : "text-muted-foreground"
                  )}
                >
                  {project.index_status === "ready"
                    ? "pgvector semantic ready"
                    : project.index_status === "indexing"
                      ? "indexing codebase…"
                      : "not indexed"}
                </strong>
              </span>
            </span>
            {project.indexed_at && (
              <span className="text-muted-foreground">
                Updated {timeAgo(project.indexed_at)}
              </span>
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <a
              href={project.github_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex"
            >
              <ApplicationButton
                variant="secondary"
                size="sm"
                iconRight={
                  <ExternalLink className="size-3 text-muted-foreground" />
                }
              >
                GitHub
              </ApplicationButton>
            </a>
          </div>
        }
      />

      {/* Setup alerts */}
      {project.status === "pending" && (
        <ApplicationCard className="flex items-center gap-3 border-primary/30 bg-primary/5 p-4 text-xs text-foreground">
          <RefreshCw className="size-4 shrink-0 animate-spin text-primary" />
          <span>
            Cloning remote repository and generating vector index embeddings.
            This will take a few seconds...
          </span>
        </ApplicationCard>
      )}

      {project.status === "failed" && (
        <ApplicationCard className="border-destructive/30 bg-destructive/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="size-4 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">{project.description}</p>
            </div>
            <ApplicationButton
              variant="secondary"
              size="sm"
              onClick={handleRetry}
              disabled={retrying}
            >
              {retrying ? "Retrying…" : "Retry connection"}
            </ApplicationButton>
          </div>
        </ApplicationCard>
      )}

      {setupError && (
        <ApplicationCard className="border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          {setupError}
        </ApplicationCard>
      )}

      {project.status === "ready" && (
        <div className="grid gap-5 lg:grid-cols-12">
          {/* LEFT COLUMN: Mission Control & Task Launcher */}
          <div className="space-y-4 self-start lg:sticky lg:top-4 lg:col-span-4">
            <ApplicationCard className="space-y-3 p-3.5 sm:p-4">
              <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  <h2 className="text-2xs font-semibold tracking-wider text-foreground uppercase">
                    Task Launcher
                  </h2>
                </div>
                <ApplicationButton
                  variant="ghost"
                  size="sm"
                  onClick={refreshIssues}
                  disabled={issuesLoading}
                  className="h-6 px-1.5 text-3xs"
                  iconLeft={
                    <RefreshCw
                      className={cn(
                        "size-2.5",
                        issuesLoading && "animate-spin"
                      )}
                    />
                  }
                >
                  Issues
                </ApplicationButton>
              </div>

              {/* Quick Template Chips */}
              <div className="space-y-1">
                <span className="text-3xs font-medium tracking-[0.1em] text-muted-foreground uppercase">
                  Quick suggestions
                </span>
                <div className="flex flex-wrap gap-1">
                  {QUICK_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.label}
                      type="button"
                      onClick={() => setTask(tmpl.text)}
                      className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 text-3xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted hover:text-foreground"
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* GitHub Issue Picker */}
              {issues.length > 0 && (
                <div className="space-y-1">
                  <label className="text-3xs font-medium tracking-[0.1em] text-muted-foreground uppercase">
                    Connect GitHub Issue
                  </label>
                  <ApplicationSelection
                    size="sm"
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
                        setTask(`Resolve #${issue.number}: ${issue.title}`)
                      }
                    }}
                    placeholder="Select issue to solve…"
                    indicator="chevron-down"
                  />
                </div>
              )}

              {/* Task Textarea */}
              <div className="space-y-1">
                <label className="text-3xs font-medium tracking-[0.1em] text-muted-foreground uppercase">
                  Task Prompt
                </label>
                <div className="relative">
                  <textarea
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        (e.metaKey || e.ctrlKey) &&
                        e.key === "Enter" &&
                        canRun
                      ) {
                        e.preventDefault()
                        handleStartRun()
                      }
                    }}
                    placeholder="Describe what the agent team should research, write, and test..."
                    rows={3}
                    className="w-full resize-none rounded-md border border-input bg-card p-2.5 font-sans text-xs text-foreground outline-hidden transition-all duration-150 placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-primary/20 dark:bg-input/20"
                  />
                  <div className="pointer-events-none absolute right-2 bottom-2 hidden items-center gap-1 text-3xs text-muted-foreground sm:flex">
                    <Kbd>⌘↵</Kbd>
                  </div>
                </div>
              </div>

              {/* Model Settings Block */}
              <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-3xs font-medium tracking-[0.1em] text-muted-foreground uppercase">
                    Inference Model
                  </span>
                  {/* Key Source Toggle */}
                  <div className="inline-flex rounded border border-border bg-card p-0.5">
                    <button
                      type="button"
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
                      className={cn(
                        "rounded px-1.5 py-0.5 text-3xs font-medium transition-colors",
                        keySource === "my-key"
                          ? "bg-highlight text-highlight-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      My Key
                    </button>
                    <button
                      type="button"
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
                      className={cn(
                        "rounded px-1.5 py-0.5 text-3xs font-medium transition-colors",
                        keySource === "platform"
                          ? "bg-highlight text-highlight-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Platform AI
                    </button>
                  </div>
                </div>

                {visibleModels.length === 0 ? (
                  <p className="text-2xs text-muted-foreground">
                    {keySource === "my-key"
                      ? "No API keys configured. Set them in Settings or switch to Platform AI."
                      : "No platform keys active on server."}
                  </p>
                ) : (
                  <ApplicationSelection
                    size="sm"
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

                <label className="flex cursor-pointer items-center gap-1.5 pt-0.5 text-2xs text-muted-foreground select-none">
                  <input
                    type="checkbox"
                    checked={skipTests}
                    onChange={(e) => setSkipTests(e.target.checked)}
                    className="size-3 cursor-pointer rounded border-border text-primary focus:ring-primary/25"
                  />
                  <span>Skip test verification (treat suite as passed)</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-0.5">
                <ApplicationButton
                  className="h-8 flex-1 text-xs font-semibold"
                  variant="primary"
                  size="sm"
                  disabled={!canRun}
                  onClick={handleStartRun}
                  iconLeft={
                    isLive ? (
                      <RefreshCw className="size-3 animate-spin" />
                    ) : (
                      <Play className="size-3" />
                    )
                  }
                >
                  {isLive ? "Agents Running…" : "Run Agents"}
                </ApplicationButton>

                {isLive && (
                  <ApplicationButton
                    variant="destructive"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    disabled={stoppingRun}
                    onClick={handleStopRun}
                    iconLeft={<Square className="size-3" />}
                  >
                    {stoppingRun ? "Stopping…" : "Stop"}
                  </ApplicationButton>
                )}
              </div>
            </ApplicationCard>
          </div>

          {/* RIGHT COLUMN: Execution Pipeline, Approval, Console & History */}
          <div className="space-y-6 lg:col-span-8">
            {/* Active Run Overview Banner */}
            {run && (
              <ApplicationCard className="flex flex-col gap-3 border-border/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      Run #{run.id}
                    </span>
                    <ApplicationBadge
                      variant={RUN_STATUS[run.status]?.badge ?? "neutral"}
                      dot
                      pulseDot={isLive}
                    >
                      {RUN_STATUS[run.status]?.label ?? run.status}
                    </ApplicationBadge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {run.task}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-3xs text-muted-foreground">
                    {run.model}
                  </span>
                  <ApplicationButton
                    variant="ghost"
                    size="sm"
                    className="h-7 text-2xs"
                    onClick={() => {
                      setRun(null)
                      setNodeStates(initialNodeStates())
                      setPendingPlan(null)
                      setSearchParams({}, { replace: true })
                    }}
                  >
                    New Task
                  </ApplicationButton>
                </div>
              </ApplicationCard>
            )}

            {/* View Tabs */}
            <ApplicationTabs
              tabs={[
                {
                  key: "pipeline",
                  label: "Pipeline Stepper",
                  icon: <Layers className="size-3.5" />,
                },
                {
                  key: "console",
                  label: "Console & Activity",
                  icon: <Terminal className="size-3.5" />,
                  count: logs.length,
                },
                {
                  key: "history",
                  label: "Run History",
                  icon: <Clock className="size-3.5" />,
                  count: runHistory.length,
                },
              ]}
              activeKey={activeTab}
              onChange={setActiveTab}
            />

            {/* TAB 1: PIPELINE VIEW */}
            {activeTab === "pipeline" && (
              <div className="space-y-6">
                {/* Streaming Error Callout */}
                {streamError && run?.status !== "failed" && (
                  <ApplicationCard className="flex items-center gap-2.5 border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{streamError}</span>
                  </ApplicationCard>
                )}

                {/* Human Approval Required Callout */}
                {pendingPlan && (
                  <ApplicationCard className="space-y-4 border-primary/50 bg-primary/5 p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="size-5 text-primary" />
                        <h3 className="font-serif text-lg font-medium text-foreground">
                          Human Approval Requested
                        </h3>
                      </div>
                      <ApplicationBadge variant="awaiting" dot pulseDot>
                        Awaiting Decision
                      </ApplicationBadge>
                    </div>

                    <p className="text-xs leading-relaxed font-medium text-foreground">
                      {pendingPlan.summary}
                    </p>

                    <div className="space-y-2 rounded-lg border border-border/80 bg-card p-3">
                      <span className="text-2xs font-semibold tracking-wider text-muted-foreground uppercase">
                        Proposed Execution Steps
                      </span>
                      <ol className="space-y-1.5 pt-1">
                        {pendingPlan.steps.map((step, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2.5 text-xs text-muted-foreground"
                          >
                            <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-3xs font-semibold text-primary">
                              {i + 1}
                            </span>
                            <span className="pt-0.5">{step.description}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-2.5 font-mono text-2xs">
                      <div className="flex items-center gap-2 truncate">
                        <Terminal className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-muted-foreground">Verify:</span>
                        <code className="truncate text-foreground">
                          {pendingPlan.test_command}
                        </code>
                      </div>
                      <ApplicationButton
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-3xs"
                        onClick={() =>
                          copyVerifyCommand(pendingPlan.test_command)
                        }
                        iconLeft={
                          copiedVerify ? (
                            <Check className="size-3 text-run-completed" />
                          ) : (
                            <Copy className="size-3" />
                          )
                        }
                      >
                        {copiedVerify ? "Copied" : "Copy"}
                      </ApplicationButton>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-2xs font-medium tracking-wider text-muted-foreground uppercase">
                        Review Guidance / Feedback (Optional)
                      </label>
                      <ApplicationInput
                        type="text"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="e.g. Ensure strict TypeScript types, do not modify config.ts..."
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <ApplicationButton
                        variant="primary"
                        onClick={() => handleApproval(true)}
                        iconLeft={<Check className="size-3.5" />}
                      >
                        Approve & Execute Plan
                      </ApplicationButton>
                      <ApplicationButton
                        variant="secondary"
                        onClick={() => handleApproval(false)}
                      >
                        {feedback.trim()
                          ? "Reject & Request Revision"
                          : "Reject Plan"}
                      </ApplicationButton>
                    </div>
                  </ApplicationCard>
                )}

                {/* Final Result / PR Card */}
                {run &&
                  ["completed", "rejected", "failed"].includes(run.status) && (
                    <ApplicationCard className="space-y-4 p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {run.status === "completed" ? (
                            <CheckCircle2 className="size-5 text-run-completed" />
                          ) : (
                            <AlertCircle className="size-5 text-run-failed" />
                          )}
                          <h3 className="font-serif text-lg font-medium">
                            {run.status === "completed"
                              ? "Run Completed"
                              : "Run Ended"}
                          </h3>
                        </div>
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

                      {run.pr_url && (
                        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3.5">
                          <div className="flex items-center gap-3">
                            <GitPullRequest className="size-4 text-primary" />
                            <div>
                              <p className="text-xs font-semibold text-foreground">
                                Pull Request Created
                              </p>
                              <p className="font-mono text-2xs text-muted-foreground">
                                Ready for team code review on GitHub
                              </p>
                            </div>
                          </div>
                          <a
                            href={run.pr_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex"
                          >
                            <ApplicationButton
                              variant="primary"
                              size="sm"
                              iconRight={<ExternalLink className="size-3" />}
                            >
                              Open PR
                            </ApplicationButton>
                          </a>
                        </div>
                      )}

                      {run.review_notes && (
                        <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
                          <span className="text-2xs font-semibold tracking-wider text-muted-foreground uppercase">
                            Reviewer Summary & Changelog
                          </span>
                          <p className="font-mono text-2xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                            {run.review_notes}
                          </p>
                        </div>
                      )}

                      {run.error && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                          {run.error}
                        </div>
                      )}

                      {run.status === "failed" && (
                        <ApplicationButton
                          onClick={handleRetryRun}
                          disabled={retryingRun}
                          size="sm"
                          variant="secondary"
                        >
                          {retryingRun
                            ? "Retrying…"
                            : "Retry from last checkpoint"}
                        </ApplicationButton>
                      )}
                    </ApplicationCard>
                  )}

                {/* Connected 7-Node Stepper Flow */}
                <div className="relative space-y-3 pl-3 before:absolute before:top-3 before:bottom-3 before:left-6 before:w-px before:bg-border/80">
                  {AGENT_NODES.map((node, index) => {
                    const state = nodeStates[node.key]
                    const Icon = node.icon
                    const isRunning = state.status === "running"
                    const isDone = state.status === "done"
                    const isError = state.status === "error"

                    return (
                      <div
                        key={node.key}
                        className="relative flex items-start gap-4"
                      >
                        {/* Status Icon Circle */}
                        <div
                          className={cn(
                            "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-card text-2xs transition-all",
                            isRunning &&
                              "animate-pulse border-primary bg-primary/10 text-primary shadow-xs ring-4 ring-primary/15",
                            isDone &&
                              "border-run-completed/40 bg-run-completed/10 text-run-completed",
                            isError &&
                              "border-destructive/40 bg-destructive/10 text-destructive",
                            !isRunning &&
                              !isDone &&
                              !isError &&
                              "border-border text-muted-foreground"
                          )}
                        >
                          <Icon className="size-3" />
                        </div>

                        {/* Step Card Content */}
                        <ApplicationCard
                          className={cn(
                            "flex-1 p-3.5 transition-all duration-150",
                            isRunning &&
                              "border-primary/50 bg-primary/[0.02] shadow-xs"
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-3xs font-medium text-muted-foreground uppercase">
                                Step 0{index + 1}
                              </span>
                              <span className="text-muted-foreground/30">
                                ·
                              </span>
                              <h4 className="text-xs font-semibold text-foreground">
                                {node.label}
                              </h4>
                              <span className="hidden text-2xs text-muted-foreground sm:inline">
                                ({node.role})
                              </span>
                            </div>

                            <ApplicationBadge
                              size="sm"
                              variant={
                                isRunning
                                  ? "running"
                                  : isDone
                                    ? "completed"
                                    : isError
                                      ? "failed"
                                      : "neutral"
                              }
                              dot
                              pulseDot={isRunning}
                            >
                              {isRunning
                                ? "In Progress"
                                : isDone
                                  ? "Completed"
                                  : isError
                                    ? "Failed"
                                    : "Standby"}
                            </ApplicationBadge>
                          </div>

                          <p className="pt-1 text-2xs text-muted-foreground">
                            {node.blurb}
                          </p>

                          {state.detail && (
                            <div className="mt-2.5 rounded border border-border/60 bg-muted/40 px-2.5 py-1.5 font-mono text-2xs text-foreground/90">
                              <span className="mr-1.5 font-bold text-primary">
                                ›
                              </span>
                              {state.detail}
                            </div>
                          )}
                        </ApplicationCard>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: CONSOLE & ACTIVITY LOGS */}
            {activeTab === "console" && (
              <ApplicationCard className="overflow-hidden p-0">
                <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
                  <div className="flex items-center gap-2 font-mono text-2xs text-muted-foreground">
                    <Terminal className="size-3.5" />
                    <span>agent-pipeline.log</span>
                  </div>
                  <ApplicationButton
                    variant="ghost"
                    size="sm"
                    className="h-6 text-3xs"
                    onClick={() => {
                      const text = logs
                        .map(
                          (l) =>
                            `[${l.time}] ${l.agent ? `[${l.agent}] ` : ""}${l.message}`
                        )
                        .join("\n")
                      navigator.clipboard.writeText(text)
                    }}
                    iconLeft={<Copy className="size-3" />}
                  >
                    Copy log
                  </ApplicationButton>
                </div>

                <div className="scrollbar-thin max-h-96 min-h-64 space-y-2 overflow-y-auto bg-card p-4 font-mono text-xs">
                  {logs.length === 0 ? (
                    <p className="text-2xs text-muted-foreground">
                      No agent stream messages recorded yet. Start a run or
                      select one from history.
                    </p>
                  ) : (
                    logs.map((log) => (
                      <div
                        key={log.id}
                        className={cn(
                          "flex items-start gap-2.5 text-2xs leading-relaxed",
                          log.type === "error" && "text-destructive",
                          log.type === "warning" && "text-primary",
                          log.type === "success" && "text-run-completed",
                          log.type === "info" && "text-foreground/90"
                        )}
                      >
                        <span className="shrink-0 text-muted-foreground/60 select-none">
                          [{log.time}]
                        </span>
                        {log.agent && (
                          <span className="shrink-0 font-semibold text-primary uppercase">
                            [{log.agent}]
                          </span>
                        )}
                        <span className="break-all">{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </ApplicationCard>
            )}

            {/* TAB 3: RUN HISTORY */}
            {activeTab === "history" && (
              <div className="space-y-3">
                {runHistory.length === 0 ? (
                  <ApplicationCard className="p-8 text-center text-xs text-muted-foreground">
                    No runs recorded for this repository yet.
                  </ApplicationCard>
                ) : (
                  runHistory.map((item) => {
                    const isSelected = run?.id === item.id
                    return (
                      <ApplicationCard
                        key={item.id}
                        className={cn(
                          "flex flex-col gap-3 p-4 transition-all sm:flex-row sm:items-center sm:justify-between",
                          isSelected && "border-primary/50 bg-primary/[0.02]"
                        )}
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold">
                              Run #{item.id}
                            </span>
                            <ApplicationBadge
                              size="sm"
                              variant={
                                RUN_STATUS[item.status]?.badge ?? "neutral"
                              }
                              dot
                            >
                              {RUN_STATUS[item.status]?.label ?? item.status}
                            </ApplicationBadge>
                            <span className="text-3xs text-muted-foreground">
                              {timeAgo(item.created_at)}
                            </span>
                          </div>
                          <p className="truncate text-xs text-foreground/80">
                            {item.task}
                          </p>
                          <div className="flex items-center gap-3 font-mono text-3xs text-muted-foreground">
                            <span>Model: {item.model}</span>
                            {item.pr_url && (
                              <span className="text-link">PR Opened</span>
                            )}
                          </div>
                        </div>

                        <ApplicationButton
                          variant={isSelected ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => void openRun(item)}
                        >
                          {isSelected ? "Inspecting" : "Inspect"}
                        </ApplicationButton>
                      </ApplicationCard>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
