import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ExternalLink } from "lucide-react"
import type { RunListItem, RunStatus } from "@/api/agent.api"
import { ApplicationBadge } from "@/components/molecules/application/application-badge"
import { ApplicationSelection } from "@/components/molecules/application/application-selection"
import {
  ApplicationTable,
  type ApplicationTableColumn,
} from "@/components/molecules/application/application-table"
import { PageHeader } from "@/components/molecules/common/page-header"
import { useOrganization } from "@/hooks/organization/use-organization"
import { useOrgRuns } from "@/hooks/organization/use-org-data"
import { formatDateTime, timeAgo } from "@/lib/common/dates"
import { projectPath } from "@/lib/common/paths"
import { RUN_STATUS } from "@/lib/common/status"

const ALL = "all"

// The table wants plain object rows; a mapped type (unlike the interface)
// carries the implicit index signature for that
type RunRow = Pick<RunListItem, keyof RunListItem>

const STATUS_OPTIONS = [
  { value: ALL, label: "All statuses" },
  ...(Object.keys(RUN_STATUS) as RunStatus[]).map((status) => ({
    value: status,
    label: RUN_STATUS[status].label,
  })),
]

const COLUMNS: ApplicationTableColumn<RunRow>[] = [
  {
    header: "Task",
    accessorKey: "task",
    cell: (run) => (
      <span className="flex max-w-[28rem] flex-col gap-0.5">
        <span className="truncate font-medium">{run.task}</span>
        <span className="truncate text-2xs text-muted-foreground">
          #{run.id} · {run.model}
        </span>
      </span>
    ),
  },
  {
    header: "Repository",
    accessorKey: "project_name",
    sort: true,
    cell: (run) => (
      <span className="text-muted-foreground">{run.project_name}</span>
    ),
  },
  {
    header: "Status",
    accessorKey: "status",
    sort: true,
    cell: (run) => (
      <ApplicationBadge
        variant={RUN_STATUS[run.status].badge}
        size="sm"
        dot
        pulseDot={RUN_STATUS[run.status].live}
      >
        {RUN_STATUS[run.status].label}
      </ApplicationBadge>
    ),
  },
  {
    header: "Pull request",
    accessorKey: "pr_url",
    cell: (run) =>
      run.pr_url ? (
        <a
          href={run.pr_url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-link hover:underline"
        >
          Open PR <ExternalLink className="size-3" />
        </a>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    header: "Started",
    accessorKey: "created_at",
    sort: true,
    align: "right",
    cell: (run) => (
      <span
        title={formatDateTime(run.created_at)}
        className="text-muted-foreground"
      >
        {timeAgo(run.created_at)}
      </span>
    ),
  },
]

/** Every run in the organization — the "deployments" view */
export function RunsPage() {
  const { current } = useOrganization()
  const navigate = useNavigate()
  const { runs } = useOrgRuns(current.id)
  const [status, setStatus] = useState<string>(ALL)

  const shown: RunRow[] = useMemo(
    () => (runs ?? []).filter((r) => status === ALL || r.status === status),
    [runs, status]
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow={current.name}
        title="Runs"
        description="Every task handed to the agents in this organization, newest first."
      />
      <ApplicationTable
        data={shown}
        columns={COLUMNS}
        idAccessor={(run) => String(run.id)}
        isLoading={runs === null}
        showSearch
        searchPlaceholder="Search tasks, repositories, models…"
        searchKeys={["task", "project_name", "model"]}
        onRowClick={(run) =>
          navigate(`${projectPath(run.project_id)}?run=${run.id}`)
        }
        emptyTitle={runs?.length ? "No runs match" : "No runs yet"}
        emptyDescription={
          runs?.length
            ? "Try another search or status."
            : "Open a repository and hand the agents a task."
        }
        toolbarActions={
          <ApplicationSelection
            aria-label="Filter by status"
            options={STATUS_OPTIONS}
            value={status}
            onValueChange={(v) => setStatus(v ?? ALL)}
            className="w-44"
            indicator="chevron-down"
          />
        }
      />
    </div>
  )
}
