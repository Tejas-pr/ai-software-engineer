import { useEffect, useMemo, useState } from "react"
import { Lock, Search } from "lucide-react"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  connectProject,
  listGithubRepos,
  type GithubRepo,
  type Project,
} from "@/api/projects.api"
import { ApplicationButton } from "@/components/molecules/application/application-button"
import { ApplicationInput } from "@/components/molecules/application/application-input"
import { ApplicationPopup } from "@/components/molecules/application/application-popup"
import { showDemoRestrictionNotice } from "@/lib/common/demo-notice"
import { useSystemConfig } from "@/hooks/common/use-system-config"
import { describeError } from "@/lib/common/api-error"
import { githubLoginUrl } from "@/api/auth.api"

/** Pick one of your GitHub repositories to connect to the organization */
export function ConnectRepositoryPopup({
  isOpen,
  onClose,
  organizationId,
  connectedUrls,
  onConnected,
}: {
  isOpen: boolean
  onClose: () => void
  organizationId: number
  connectedUrls: Set<string>
  onConnected: (project: Project) => void
}) {
  const [repos, setRepos] = useState<GithubRepo[] | null>(null)
  const [query, setQuery] = useState("")
  const [busyUrl, setBusyUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isGithubExpired, setIsGithubExpired] = useState(false)
  const { isRestricted } = useSystemConfig()

  useEffect(() => {
    if (!isOpen || repos !== null) return
    listGithubRepos()
      .then(setRepos)
      .catch((err) => {
        setRepos([])
        const msg = describeError(err, "Couldn't load your GitHub repositories")
        setError(msg)
        if (
          (err as { response?: { status?: number } })?.response?.status ===
            401 ||
          (err as { response?: { status?: number } })?.response?.status ===
            400 ||
          msg.toLowerCase().includes("github") ||
          msg.toLowerCase().includes("re-authenticate")
        ) {
          setIsGithubExpired(true)
        }
      })
  }, [isOpen, repos])

  const shown = useMemo(
    () =>
      (repos ?? []).filter(
        (r) =>
          !connectedUrls.has(r.url) &&
          r.name.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [repos, query, connectedUrls]
  )

  async function handleConnect(repo: GithubRepo) {
    if (isRestricted) {
      showDemoRestrictionNotice()
      return
    }
    setBusyUrl(repo.url)
    setError(null)
    try {
      onConnected(await connectProject(organizationId, repo))
    } catch (err) {
      setError(describeError(err, "Couldn't connect that repository"))
    } finally {
      setBusyUrl(null)
    }
  }

  return (
    <ApplicationPopup
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Connect a repository"
      description="It's cloned into its own workspace and indexed so the agents can search it."
    >
      <div className="flex flex-col gap-3">
        <ApplicationInput
          placeholder="Search your GitHub repositories"
          iconLeft={<Search />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {error && (
          <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <p>{error}</p>
            {isGithubExpired && (
              <ApplicationButton
                size="sm"
                variant="highlight"
                className="self-start text-xs"
                onClick={() => window.location.assign(githubLoginUrl())}
              >
                Reconnect with GitHub
              </ApplicationButton>
            )}
          </div>
        )}
        <ul className="flex max-h-[min(24rem,55svh)] flex-col overflow-y-auto rounded-xl border">
          {repos === null
            ? Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="border-b p-3 last:border-b-0">
                  <Skeleton className="h-4 w-1/2" />
                </li>
              ))
            : shown.map((repo) => (
                <li
                  key={repo.url}
                  className="flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-1.5 truncate text-sm font-medium">
                      {repo.name}
                      {repo.private && (
                        <Lock className="size-3 shrink-0 text-muted-foreground" />
                      )}
                    </span>
                    <span className="truncate text-2xs text-muted-foreground">
                      {repo.description ||
                        `default branch ${repo.default_branch}`}
                    </span>
                  </span>
                  <ApplicationButton
                    size="sm"
                    variant="secondary"
                    disabled={busyUrl !== null}
                    iconLeft={busyUrl === repo.url ? <Spinner /> : undefined}
                    onClick={() => handleConnect(repo)}
                  >
                    Connect
                  </ApplicationButton>
                </li>
              ))}
          {repos !== null && shown.length === 0 && (
            <li className="p-4 text-xs text-muted-foreground">
              {query
                ? "No repository matches."
                : "Every repository you can access is already connected."}
            </li>
          )}
        </ul>
      </div>
    </ApplicationPopup>
  )
}
