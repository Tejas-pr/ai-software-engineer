import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronDown, FolderGit2, Plus, Search, Users } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { getOverview, type OrgOverview } from "@/api/organizations.api"
import {
  ApplicationButton,
  applicationButtonVariants,
} from "@/components/molecules/application/application-button"
import { ApplicationInput } from "@/components/molecules/application/application-input"
import { PageHeader } from "@/components/molecules/common/page-header"
import {
  ViewToggle,
  type ListView,
} from "@/components/molecules/common/view-toggle"
import { CreateOrganizationPopup } from "@/components/molecules/organization/create-organization-popup"
import { AttentionCard } from "@/components/organisms/dashboard/attention-card"
import { UsageCard } from "@/components/organisms/dashboard/usage-card"
import { ProjectList } from "@/components/organisms/projects/project-list"
import { useOrganization } from "@/hooks/organization/use-organization"
import { useOrgProjects, useOrgRuns } from "@/hooks/organization/use-org-data"
import { paths } from "@/lib/common/paths"
import { latestRunByProject } from "@/lib/common/runs"

export function DashboardPage() {
  const { current, refresh, switchTo } = useOrganization()
  const navigate = useNavigate()
  const { projects } = useOrgProjects(current.id)
  const { runs } = useOrgRuns(current.id)
  const [overview, setOverview] = useState<OrgOverview | null>(null)
  const [query, setQuery] = useState("")
  const [view, setView] = useState<ListView>("list")
  const [isCreatingOrg, setIsCreatingOrg] = useState(false)

  useEffect(() => {
    let cancelled = false
    getOverview(current.id)
      .then((data) => {
        if (!cancelled) setOverview(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [current.id])

  const latestRuns = useMemo(() => latestRunByProject(runs), [runs])
  const shown = useMemo(
    () =>
      (projects ?? []).filter((p) =>
        p.name.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [projects, query]
  )

  const connect = () => navigate(`${paths.projects.root}?connect=1`)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow={current.name}
        title="Overview"
        description="Your repositories, what the agents are doing in them, and what's waiting on you."
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <ApplicationInput
          placeholder="Search repositories…"
          iconLeft={<Search />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          containerClassName="min-w-0 flex-1 basis-56"
        />
        <ViewToggle value={view} onChange={setView} />
        <DropdownMenu>
          <DropdownMenuTrigger
            className={applicationButtonVariants({ variant: "primary" })}
          >
            Add new
            <ChevronDown className="size-4 opacity-70" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-52 rounded-xl p-1.5"
          >
            <DropdownMenuItem
              className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem]"
              onClick={connect}
            >
              <FolderGit2 className="size-4 text-muted-foreground" />
              Repository
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem]"
              onClick={() => navigate(paths.settings.members)}
            >
              <Users className="size-4 text-muted-foreground" />
              Teammate
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem]"
              onClick={() => setIsCreatingOrg(true)}
            >
              <Plus className="size-4 text-muted-foreground" />
              Organization
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Usage</h2>
            <UsageCard overview={overview} />
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Alerts</h2>
            <AttentionCard runs={runs} />
          </div>
        </div>

        {/* Repositories first on small screens */}
        <div className="order-first flex flex-col gap-3 lg:order-none">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Repositories</h2>
            {projects && projects.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {projects.length} connected
              </span>
            )}
          </div>
          {projects === null ? (
            <Skeleton className="h-72 rounded-xl" />
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
              <span className="flex size-11 items-center justify-center rounded-xl border bg-card">
                <FolderGit2 className="size-5 text-muted-foreground" />
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold">No repositories yet</p>
                <p className="max-w-sm text-xs/relaxed text-muted-foreground">
                  Connect a GitHub repository, then hand the agents an issue
                  from it.
                </p>
              </div>
              <ApplicationButton iconLeft={<Plus />} onClick={connect}>
                Connect a repository
              </ApplicationButton>
            </div>
          ) : shown.length === 0 ? (
            <p className="rounded-xl border px-4 py-8 text-center text-xs text-muted-foreground">
              No repository matches “{query}”.
            </p>
          ) : (
            <ProjectList projects={shown} latestRuns={latestRuns} view={view} />
          )}
        </div>
      </div>

      <CreateOrganizationPopup
        isOpen={isCreatingOrg}
        onClose={() => setIsCreatingOrg(false)}
        onCreated={async (organization) => {
          setIsCreatingOrg(false)
          await refresh()
          switchTo(organization.id)
        }}
      />
    </div>
  )
}
