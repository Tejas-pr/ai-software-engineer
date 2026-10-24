import { useMemo, useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import { motion } from "motion/react"
import {
  KeyRound,
  Plus,
  Search,
  Settings,
  UserRound,
  Users,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"
import type { User } from "@/api/user.api"
import { BrandMark } from "@/components/atoms/brand-logo"
import { BuiltBy } from "@/components/atoms/built-by"
import { ApplicationInput } from "@/components/molecules/application/application-input"
import { NavUser } from "@/components/molecules/common/nav-user"
import { OrgSwitcher } from "@/components/molecules/organization/org-switcher"
import { useOrganization } from "@/hooks/organization/use-organization"
import { useOrgProjects, useOrgRuns } from "@/hooks/organization/use-org-data"
import { APP_NAV, sectionFor, type AppSection } from "@/lib/common/app-nav"
import { timeAgo } from "@/lib/common/dates"
import { paths, projectPath } from "@/lib/common/paths"
import { PROJECT_STATUS, RUN_DOT, RUN_STATUS } from "@/lib/common/status"

const PANEL_TITLES: Record<AppSection, string> = {
  overview: "Repositories",
  repositories: "Repositories",
  runs: "Recent runs",
  agents: "The pipeline",
  settings: "Settings",
}

const ROW =
  "flex flex-col gap-1 border-b px-4 py-3 text-sm leading-tight last:border-b-0 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"

/**
 * The signed-in sidebar, after shadcn's sidebar-09 ("collapsible nested
 * sidebars"): an icon rail of sections on the left, and a panel listing
 * what's in the current section — repositories, runs, settings pages —
 * with the organization switcher on top. Collapses to the rail (⌘/Ctrl+B).
 */
export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: User }) {
  const { pathname } = useLocation()
  const { setOpen, setOpenMobile } = useSidebar()
  const section = sectionFor(pathname)

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      {/* The icon rail */}
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="md:h-8 md:p-0"
                render={<Link to={paths.dashboard} aria-label="Overview" />}
              >
                <BrandMark className="size-8!" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {APP_NAV.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      tooltip={{ children: item.title, hidden: false }}
                      isActive={section === item.id}
                      className="relative px-2.5 md:px-2"
                      render={
                        <NavLink
                          to={item.to}
                          onClick={() => {
                            setOpen(true)
                            setOpenMobile(false)
                          }}
                        />
                      }
                    >
                      {section === item.id && (
                        <motion.span
                          layoutId="rail-active"
                          aria-hidden="true"
                          className="absolute inset-y-1.5 -left-1.5 w-0.5 rounded-full bg-primary md:-left-2"
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 40,
                          }}
                        />
                      )}
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>
      </Sidebar>

      {/* The section panel */}
      <Sidebar collapsible="none" className="flex min-w-0 flex-1">
        <SidebarHeader className="gap-3 border-b p-3">
          <OrgSwitcher />
        </SidebarHeader>
        <SidebarContent>
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-2xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              {PANEL_TITLES[section]}
            </span>
          </div>
          {section === "runs" ? (
            <RunsPanel />
          ) : section === "settings" ? (
            <SettingsPanel pathname={pathname} />
          ) : section === "agents" ? (
            <AgentsPanel />
          ) : (
            <RepositoriesPanel pathname={pathname} />
          )}
        </SidebarContent>
        <SidebarFooter className="border-t px-4 py-3">
          <BuiltBy />
        </SidebarFooter>
      </Sidebar>
    </Sidebar>
  )
}

function RepositoriesPanel({ pathname }: { pathname: string }) {
  const { current } = useOrganization()
  const { projects } = useOrgProjects(current.id)
  const [query, setQuery] = useState("")
  const shown = useMemo(
    () =>
      (projects ?? []).filter((p) =>
        p.name.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [projects, query]
  )

  return (
    <>
      <div className="px-3 pb-2">
        <ApplicationInput
          size="sm"
          placeholder="Search repositories…"
          iconLeft={<Search className="size-3.5 text-muted-foreground" />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <SidebarGroup className="px-0">
        <SidebarGroupContent>
          {projects === null ? (
            <PanelSkeleton />
          ) : shown.length === 0 ? (
            <PanelEmpty
              text={query ? "No repository matches." : "No repositories yet."}
            />
          ) : (
            shown.map((project) => (
              <Link
                key={project.id}
                to={projectPath(project.id)}
                className={cn(
                  ROW,
                  pathname === projectPath(project.id) && "bg-sidebar-accent"
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {project.name}
                  </span>
                  <span className="text-2xs text-muted-foreground">
                    {PROJECT_STATUS[project.status].label}
                  </span>
                </span>
                <span className="truncate text-2xs text-muted-foreground">
                  {project.branch} · {timeAgo(project.created_at)}
                </span>
              </Link>
            ))
          )}
          <div className="p-3">
            <Link
              to={`${paths.projects.root}?connect=1`}
              className="flex items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <Plus className="size-3.5" />
              Connect a repository
            </Link>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )
}

function RunsPanel() {
  const { current } = useOrganization()
  const { runs } = useOrgRuns(current.id)

  return (
    <SidebarGroup className="px-0">
      <SidebarGroupContent>
        {runs === null ? (
          <PanelSkeleton />
        ) : runs.length === 0 ? (
          <PanelEmpty text="No runs yet — open a repository and hand the agents a task." />
        ) : (
          runs.slice(0, 30).map((run) => (
            <Link
              key={run.id}
              to={`${projectPath(run.project_id)}?run=${run.id}`}
              className={ROW}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    RUN_DOT[run.status]
                  )}
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {run.task}
                </span>
              </span>
              <span className="truncate text-2xs text-muted-foreground">
                {run.project_name} · {RUN_STATUS[run.status].label} ·{" "}
                {timeAgo(run.created_at)}
              </span>
            </Link>
          ))
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

const SETTINGS_LINKS = [
  {
    to: paths.settings.organization,
    label: "General",
    hint: "Name, danger zone",
    icon: Settings,
  },
  {
    to: paths.settings.members,
    label: "Members",
    hint: "Who's in this organization",
    icon: Users,
  },
  {
    to: paths.settings.apiKeys,
    label: "API keys",
    hint: "Your Gemini, Claude, OpenAI keys",
    icon: KeyRound,
  },
  {
    to: paths.account,
    label: "Profile",
    hint: "Your name and GitHub account",
    icon: UserRound,
  },
]

function SettingsPanel({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Settings" className="flex flex-col">
      {SETTINGS_LINKS.map(({ to, label, hint, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className={cn(
            ROW,
            "flex-row items-center gap-3",
            pathname === to && "bg-sidebar-accent"
          )}
        >
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium">{label}</span>
            <span className="truncate text-2xs text-muted-foreground">
              {hint}
            </span>
          </span>
        </Link>
      ))}
    </nav>
  )
}

const PIPELINE = [
  "Researcher",
  "Planner",
  "You — approve",
  "Coder",
  "Tester",
  "Reviewer",
  "GitHub",
]

function AgentsPanel() {
  return (
    <ol className="flex flex-col px-4 py-2">
      {PIPELINE.map((name, i) => (
        <li
          key={name}
          className="relative flex items-center gap-3 py-2 text-sm"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md border bg-sidebar text-2xs text-muted-foreground tabular-nums">
            {i + 1}
          </span>
          <span className={cn(name.startsWith("You") && "text-link")}>
            {name}
          </span>
        </li>
      ))}
    </ol>
  )
}

function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      ))}
    </div>
  )
}

function PanelEmpty({ text }: { text: string }) {
  return (
    <p className="px-4 py-6 text-xs/relaxed text-muted-foreground">{text}</p>
  )
}
