import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { FolderGit2, Plus, Search } from "lucide-react"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { toast } from "@workspace/ui/components/toast"
import {
  deleteProject,
  reconnectProject,
  reindexProject,
  type Project,
} from "@/api/projects.api"
import { ApplicationButton } from "@/components/molecules/application/application-button"
import { ApplicationInput } from "@/components/molecules/application/application-input"
import { ApplicationPopup } from "@/components/molecules/application/application-popup"
import { showDemoRestrictionNotice } from "@/lib/common/demo-notice"
import { PageHeader } from "@/components/molecules/common/page-header"
import {
  ViewToggle,
  type ListView,
} from "@/components/molecules/common/view-toggle"
import { ConnectRepositoryPopup } from "@/components/organisms/projects/connect-repository-popup"
import { ProjectList } from "@/components/organisms/projects/project-list"
import { useSystemConfig } from "@/hooks/common/use-system-config"
import { useOrganization } from "@/hooks/organization/use-organization"
import {
  notifyOrgDataChanged,
  useOrgProjects,
  useOrgRuns,
} from "@/hooks/organization/use-org-data"
import { describeError } from "@/lib/common/api-error"
import { projectPath } from "@/lib/common/paths"
import { latestRunByProject } from "@/lib/common/runs"

// While a clone or an index is in progress, re-read the list this often
const POLL_MS = 3000

export function ProjectsPage() {
  const { current } = useOrganization()
  const { isRestricted } = useSystemConfig()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { projects, reload } = useOrgProjects(current.id)
  const { runs } = useOrgRuns(current.id)
  const [query, setQuery] = useState("")
  const [view, setView] = useState<ListView>("list")
  const [disconnecting, setDisconnecting] = useState<Project | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const isConnectOpen = searchParams.get("connect") === "1"
  const setConnectOpen = (open: boolean) =>
    setSearchParams(open ? { connect: "1" } : {}, { replace: true })

  const busy = (projects ?? []).some(
    (p) => p.status === "pending" || p.index_status === "indexing"
  )
  useEffect(() => {
    if (!busy) return
    const timer = window.setInterval(reload, POLL_MS)
    return () => window.clearInterval(timer)
  }, [busy, reload])

  const latestRuns = useMemo(() => latestRunByProject(runs), [runs])
  const shown = useMemo(
    () =>
      (projects ?? []).filter((p) =>
        p.name.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [projects, query]
  )
  const connectedUrls = useMemo(
    () => new Set((projects ?? []).map((p) => p.github_url)),
    [projects]
  )

  async function act(action: () => Promise<unknown>, failure: string) {
    try {
      await action()
      notifyOrgDataChanged()
    } catch (err) {
      toast.add({
        title: failure,
        description: describeError(err, ""),
        type: "error",
      })
    }
  }

  async function confirmDisconnect() {
    if (!disconnecting) return
    setIsDeleting(true)
    await act(() => deleteProject(disconnecting.id), "Couldn't disconnect it")
    setIsDeleting(false)
    setDisconnecting(null)
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow={current.name}
        title="Repositories"
        description="Connected GitHub repositories. Each one is cloned into its own workspace and indexed so the researcher can search it."
        actions={
          <ApplicationButton
            iconLeft={<Plus />}
            onClick={() => setConnectOpen(true)}
          >
            Connect repository
          </ApplicationButton>
        }
      />

      <div className="flex items-center gap-2">
        <ApplicationInput
          placeholder="Search repositories…"
          iconLeft={<Search />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          containerClassName="min-w-0 flex-1"
        />
        <ViewToggle value={view} onChange={setView} />
      </div>

      {projects === null ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl border bg-card">
            <FolderGit2 className="size-5 text-muted-foreground" />
          </span>
          <p className="max-w-sm text-sm text-muted-foreground">
            No repositories in {current.name} yet.
          </p>
          <ApplicationButton
            iconLeft={<Plus />}
            onClick={() => setConnectOpen(true)}
          >
            Connect a repository
          </ApplicationButton>
        </div>
      ) : shown.length === 0 ? (
        <p className="rounded-xl border px-4 py-8 text-center text-xs text-muted-foreground">
          No repository matches “{query}”.
        </p>
      ) : (
        <ProjectList
          projects={shown}
          latestRuns={latestRuns}
          view={view}
          actions={{
            onReindex: (p) => {
              if (isRestricted) {
                showDemoRestrictionNotice()
                return
              }
              act(() => reindexProject(p.id), "Couldn't start indexing")
            },
            onRetryClone: (p) => {
              if (isRestricted) {
                showDemoRestrictionNotice()
                return
              }
              act(() => reconnectProject(p), "Couldn't retry the clone")
            },
            onDisconnect: setDisconnecting,
          }}
        />
      )}

      <ConnectRepositoryPopup
        isOpen={isConnectOpen}
        onClose={() => setConnectOpen(false)}
        organizationId={current.id}
        connectedUrls={connectedUrls}
        onConnected={(project) => {
          notifyOrgDataChanged()
          navigate(projectPath(project.id))
        }}
      />

      <ApplicationPopup
        isOpen={disconnecting !== null}
        onClose={() => setDisconnecting(null)}
        size="sm"
        title={`Disconnect ${disconnecting?.name ?? ""}?`}
        description="Its runs, search index and cloned workspace are deleted. The repository on GitHub isn't touched."
        secondaryAction={{
          label: "Cancel",
          onClick: () => setDisconnecting(null),
        }}
        primaryAction={{
          label: isDeleting ? "Disconnecting…" : "Disconnect",
          variant: "destructive",
          disabled: isDeleting,
          onClick: confirmDisconnect,
        }}
      />
    </div>
  )
}
