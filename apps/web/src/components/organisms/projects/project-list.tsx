import { Link } from "react-router-dom"
import { motion, useReducedMotion } from "motion/react"
import {
  ChevronRight,
  GitBranch,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { cn } from "@workspace/ui/lib/utils"
import type { RunListItem } from "@/api/agent.api"
import type { Project } from "@/api/projects.api"
import { GithubIcon } from "@/components/atoms/github-icon"
import { ApplicationBadge } from "@/components/molecules/application/application-badge"
import { timeAgo } from "@/lib/common/dates"
import { projectPath } from "@/lib/common/paths"
import { INDEX_STATUS, PROJECT_STATUS, RUN_STATUS } from "@/lib/common/status"

export interface ProjectActions {
  onReindex: (project: Project) => void
  onRetryClone: (project: Project) => void
  onDisconnect: (project: Project) => void
}

const EASE = [0.22, 1, 0.36, 1] as const

/** The organization's repositories as Vercel-style rows (or cards), each
 * with its latest run. Pass `actions` for the per-row management menu. */
export function ProjectList({
  projects,
  latestRuns,
  view = "list",
  actions,
}: {
  projects: Project[]
  latestRuns: Map<number, RunListItem>
  view?: "list" | "grid"
  actions?: ProjectActions
}) {
  const reduceMotion = useReducedMotion()

  return (
    <ul
      data-slot="project-list"
      className={cn(
        view === "grid"
          ? "grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2"
          : "flex flex-col overflow-hidden rounded-xl border bg-card shadow-[0_1px_0_0_var(--border)]"
      )}
    >
      {projects.map((project, i) => {
        const run = latestRuns.get(project.id)
        const status = PROJECT_STATUS[project.status]
        return (
          <motion.li
            key={project.id}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.35,
              delay: Math.min(i, 10) * 0.03,
              ease: EASE,
            }}
            className={cn(
              "group relative",
              view === "grid"
                ? "rounded-xl border bg-card shadow-[0_1px_0_0_var(--border)] transition-colors hover:border-foreground/20"
                : "border-b last:border-b-0"
            )}
          >
            <div
              className={cn(
                "flex gap-4 p-4 transition-colors",
                view === "grid" ? "flex-col" : "items-center hover:bg-muted/40"
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-background">
                <GithubIcon className="size-4" />
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Link
                  to={projectPath(project.id)}
                  className="truncate text-sm font-semibold after:absolute after:inset-0 hover:underline"
                >
                  {project.name}
                </Link>
                <span className="flex items-center gap-1.5 truncate text-2xs text-muted-foreground">
                  <GitBranch className="size-3 shrink-0" />
                  {project.branch} · connected {timeAgo(project.created_at)}
                </span>
              </div>

              <div
                className={cn(
                  "flex min-w-0 flex-col gap-0.5",
                  view === "list" && "hidden w-[38%] lg:flex"
                )}
              >
                {run ? (
                  <>
                    <span className="truncate text-xs">{run.task}</span>
                    <span className="truncate text-2xs text-muted-foreground">
                      {RUN_STATUS[run.status].label} · {timeAgo(run.created_at)}
                    </span>
                  </>
                ) : project.status === "failed" ? (
                  <span className="line-clamp-2 text-2xs text-run-failed">
                    {project.description}
                  </span>
                ) : (
                  <span className="text-2xs text-muted-foreground">
                    No runs yet
                  </span>
                )}
              </div>

              <div className="relative z-10 flex shrink-0 items-center gap-1.5">
                <ApplicationBadge
                  variant={status.badge}
                  size="sm"
                  dot
                  pulseDot={project.status === "pending"}
                >
                  {status.label}
                </ApplicationBadge>
                {project.status === "ready" && (
                  <ApplicationBadge
                    variant={INDEX_STATUS[project.index_status].badge}
                    size="sm"
                    className="hidden sm:inline-flex"
                    title={project.index_error ?? undefined}
                  >
                    {INDEX_STATUS[project.index_status].label}
                  </ApplicationBadge>
                )}
                {actions ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label={`Actions for ${project.name}`}
                      className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 data-popup-open:bg-muted"
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="min-w-48 rounded-xl p-1.5"
                    >
                      {project.status === "ready" && (
                        <DropdownMenuItem
                          className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem]"
                          disabled={project.index_status === "indexing"}
                          onClick={() => actions.onReindex(project)}
                        >
                          <RefreshCw className="size-4 text-muted-foreground" />
                          Re-index for search
                        </DropdownMenuItem>
                      )}
                      {project.status === "failed" && (
                        <DropdownMenuItem
                          className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem]"
                          onClick={() => actions.onRetryClone(project)}
                        >
                          <RotateCcw className="size-4 text-muted-foreground" />
                          Retry clone
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem]"
                        render={
                          <a
                            href={project.github_url}
                            target="_blank"
                            rel="noreferrer"
                          />
                        }
                      >
                        <GithubIcon className="size-4 text-muted-foreground" />
                        Open on GitHub
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuItem
                        variant="destructive"
                        className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem]"
                        onClick={() => actions.onDisconnect(project)}
                      >
                        <Trash2 className="size-4" />
                        Disconnect
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                )}
              </div>
            </div>
          </motion.li>
        )
      })}
    </ul>
  )
}
