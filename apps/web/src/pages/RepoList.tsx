import { useEffect, useState } from "react"
import axios from "axios"
import { Link, useNavigate } from "react-router-dom"
import { ChevronDown } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuPositioner,
  DropdownMenuPopup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@workspace/ui/components/dropdown-menu"
import { getUser } from "@/api/user.api"
import { logout } from "@/api/auth.api"
import {
  connectProject,
  listGithubRepos,
  listProjects,
  reconnectProject,
  type GithubRepo,
  type Project,
} from "@/api/projects.api"

interface User {
  id: number
  username: string
  email: string
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

function statusBadge(status: Project["status"]) {
  const style = {
    ready: "text-emerald-600",
    pending: "text-primary",
    failed: "text-destructive",
  }[status]
  return <span className={`text-xs font-semibold ${style}`}>{status}</span>
}

export function RepoListPage() {
  const [user, setUser] = useState<User | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [repos, setRepos] = useState<GithubRepo[] | null>(null)
  const [reposLoading, setReposLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyUrl, setBusyUrl] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    getUser()
      .then(setUser)
      .catch(() => {})
      .finally(() => setUserLoading(false))

    listProjects()
      .then(setProjects)
      .catch(() => {})
      .finally(() => setProjectsLoading(false))
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // best-effort — the cookies will simply expire on their own otherwise
    }
    navigate("/login", { state: { loggedOut: true } })
  }

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
      navigate(`/projects/${project.id}`)
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
      navigate(`/projects/${updated.id}`)
    } catch (err) {
      setError(describeError(err, "Couldn't reconnect that repo. Try again."))
      setBusyUrl(null)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="mb-10 flex items-center justify-between border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="m18 16 4-4-4-4" />
                <path d="m6 8-4 4 4 4" />
                <path d="m14.5 4-5 16" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight">
                AI Software Engineer
              </div>
              {userLoading ? (
                <Skeleton className="mt-1 h-3.5 w-24" />
              ) : (
                user && (
                  <div className="text-xs text-muted-foreground">
                    {user.username}
                  </div>
                )
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {userLoading ? (
              <Skeleton className="h-7 w-20 rounded-lg" />
            ) : (
              user && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="outline"
                        className="gap-1.5 rounded-lg"
                      />
                    }
                  >
                    <span>{user.username}</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </DropdownMenuTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuPositioner className="min-w-[10rem]">
                      <DropdownMenuPopup>
                        <div className="truncate px-2 py-1.5 font-mono text-xs text-muted-foreground">
                          {user.email}
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem render={<Link to="/settings" />}>
                          Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={handleLogout}
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                        >
                          Logout
                        </DropdownMenuItem>
                      </DropdownMenuPopup>
                    </DropdownMenuPositioner>
                  </DropdownMenuPortal>
                </DropdownMenu>
              )
            )}
          </div>
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
                      onClick={() => navigate(`/projects/${project.id}`)}
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
