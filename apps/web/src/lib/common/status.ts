import type { RunStatus } from "@/api/agent.api"
import type { Project } from "@/api/projects.api"
import type { ApplicationBadgeVariant } from "@/components/molecules/application/application-badge"

/** How each run status is shown: badge preset, label, and whether it's live */
export const RUN_STATUS: Record<
  RunStatus,
  { badge: ApplicationBadgeVariant; label: string; live: boolean }
> = {
  pending: { badge: "pending", label: "Pending", live: false },
  running: { badge: "running", label: "Running", live: true },
  awaiting_approval: { badge: "awaiting", label: "Needs approval", live: true },
  completed: { badge: "completed", label: "Completed", live: false },
  failed: { badge: "failed", label: "Failed", live: false },
  rejected: { badge: "neutral", label: "Rejected", live: false },
}

export const PROJECT_STATUS: Record<
  Project["status"],
  { badge: ApplicationBadgeVariant; label: string }
> = {
  pending: { badge: "running", label: "Cloning" },
  ready: { badge: "completed", label: "Ready" },
  failed: { badge: "failed", label: "Clone failed" },
}

export const INDEX_STATUS: Record<
  Project["index_status"],
  { badge: ApplicationBadgeVariant; label: string }
> = {
  none: { badge: "neutral", label: "Not indexed" },
  indexing: { badge: "running", label: "Indexing" },
  ready: { badge: "completed", label: "Indexed" },
  failed: { badge: "failed", label: "Index failed" },
}

/** A status dot's fill per run status, for compact lists */
export const RUN_DOT: Record<RunStatus, string> = {
  pending: "bg-run-pending",
  running: "bg-run-running",
  awaiting_approval: "bg-run-awaiting",
  completed: "bg-run-completed",
  failed: "bg-run-failed",
  rejected: "bg-run-pending",
}
