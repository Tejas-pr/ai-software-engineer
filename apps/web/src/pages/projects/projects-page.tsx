import { useEffect, useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { ApplicationBadge } from "@/components/molecules/application/application-badge"
import { projectPath } from "@/lib/common/paths"
import {
  connectProject,
  listGithubRepos,
  listProjects,
  reconnectProject,
  type GithubRepo,
  type Project,
} from "@/api/projects.api"

function describeError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return (
      (err.response?.data as { detail?: string } | undefined)?.detail ||
      fallback
    )
  }
  return fallback
}

function statusBadge(status: Project["status"]) {
  const variant = {
    ready: "completed",
    pending: "running",
    failed: "failed",
  } as const
  return (
    <ApplicationBadge
      variant={variant[status]}
      size="sm"
      dot
      pulseDot={status === "pending"}
    >
      {status}
    </ApplicationBadge>
  )
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [repos, setRepos] = useState<GithubRepo[] | null>(null)
  const [reposLoading, setReposLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyUrl, setBusyUrl] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .catch(() => {})
      .finally(() => setProjectsLoading(false))
  }, [])

  const loadRepos = async () => {
    setReposLoading(true)
    setError(null)
    try {
      const allRepos = await listGithubRepos()
      const connectedUrls = new Set(projects.map((p) => p.github_url))
      setRepos(allRepos.filter((r) => !connectedUrls.has(r.url)))
    } catch (err) {
      setError(
        describeError(
          err,
          "Couldn't load your GitHub repos. Try again in a moment."
        )
      )
    } finally {
      setReposLoading(false)
    }
  }

  const handleConnect = async (repo: GithubRepo) => {
    setBusyUrl(repo.url)
    setError(null)
    try {
      const project = await connectProject(repo)
      navigate(projectPath(project.id))
    } catch (err) {
      setError(describeError(err, "Couldn't connect that repo. Try again."))
      setBusyUrl(null)
    }
  }

  const handleRetry = async (project: Project) => {
    setBusyUrl(project.github_url)
    setError(null)
    try {
      const updated = await reconnectProject(project)
      navigate(projectPath(updated.id))
    } catch (err) {
      setError(describeError(err, "Couldn't reconnect that repo. Try again."))
      setBusyUrl(null)
    }
  }

  return (
    <div className="text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
        <header className="mb-10 flex flex-col gap-2 border-b border-border pb-8">
          <span className="text-2xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Workspace
          </span>
          <h1 className="font-serif text-4xl leading-none tracking-[-0.01em]">
            Your repositories
          </h1>
          <p className="text-sm text-muted-foreground">
            Open a connected repository to hand the agent a task, or connect a
            new one from GitHub.
          </p>
        </header>

        {error && (
          <p className="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <section className="mb-10">
          <h2 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Your repositories
          </h2>
          {projectsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-7 w-12 rounded-lg" />
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <p className="rounded-lg border border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
              No repositories connected yet — pick one below to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-border/80"
                >
                  <div>
                    <div className="text-sm font-semibold">{project.name}</div>
                    <div className="mt-1 flex items-center gap-2">
                      {statusBadge(project.status)}
                      {project.status === "failed" && project.description && (
                        <span className="max-w-md truncate text-xs text-muted-foreground">
                          {project.description}
                        </span>
                      )}
                    </div>
                  </div>
                  {project.status === "failed" ? (
                    <Button
                      variant="outline"
                      className="rounded-lg"
                      disabled={busyUrl === project.github_url}
                      onClick={() => handleRetry(project)}
                    >
                      {busyUrl === project.github_url ? "Retrying..." : "Retry"}
                    </Button>
                  ) : (
                    <Button
                      className="rounded-lg font-semibold"
                      onClick={() => navigate(projectPath(project.id))}
                    >
                      Open
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Connect a repository
          </h2>
          {reposLoading ? (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-2">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2"
                >
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3.5 w-16" />
                </div>
              ))}
            </div>
          ) : repos === null ? (
            <Button
              variant="outline"
              className="rounded-lg font-semibold"
              onClick={loadRepos}
              disabled={reposLoading}
            >
              + Connect a GitHub repo
            </Button>
          ) : repos.length === 0 ? (
            <p className="rounded-lg border border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
              Nothing left to connect — every repo you have access to is already
              here.
            </p>
          ) : (
            <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-2">
              {repos.map((repo) => (
                <button
                  key={repo.url}
                  onClick={() => handleConnect(repo)}
                  disabled={busyUrl === repo.url}
                  className="flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                >
                  <span className="font-medium">{repo.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {busyUrl === repo.url
                      ? "Connecting..."
                      : repo.private
                        ? "private"
                        : "public"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
