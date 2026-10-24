import { useEffect, useMemo, useState } from "react"
import { Check, Lock, Search } from "lucide-react"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  connectProject,
  listGithubRepos,
  type GithubRepo,
} from "@/api/projects.api"
import { ApplicationButton } from "@/components/molecules/application/application-button"
import { ApplicationInput } from "@/components/molecules/application/application-input"
import { describeError } from "@/lib/common/api-error"

/** Step 3 (optional): connect the first repository, then finish */
export function RepositoryStep({
  organizationId,
  isFinishing,
  onFinish,
}: {
  organizationId: number
  isFinishing: boolean
  onFinish: () => void
}) {
  const [repos, setRepos] = useState<GithubRepo[] | null>(null)
  const [query, setQuery] = useState("")
  const [connected, setConnected] = useState<Set<string>>(new Set())
  const [busyUrl, setBusyUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listGithubRepos()
      .then(setRepos)
      .catch((err) => {
        setRepos([])
        setError(describeError(err, "Couldn't load your GitHub repositories"))
      })
  }, [])

  const shown = useMemo(
    () =>
      (repos ?? [])
        .filter((r) =>
          r.name.toLowerCase().includes(query.trim().toLowerCase())
        )
        .slice(0, 8),
    [repos, query]
  )

  async function handleConnect(repo: GithubRepo) {
    setBusyUrl(repo.url)
    setError(null)
    try {
      await connectProject(organizationId, repo)
      setConnected((s) => new Set(s).add(repo.url))
    } catch (err) {
      setError(describeError(err, "Couldn't connect that repository"))
    } finally {
      setBusyUrl(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ApplicationInput
        placeholder="Search your repositories"
        iconLeft={<Search />}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <ul className="flex flex-col overflow-hidden rounded-xl border bg-card">
        {repos === null
          ? Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="border-b p-3 last:border-b-0">
                <Skeleton className="h-4 w-1/2" />
              </li>
            ))
          : shown.map((repo) => {
              const isConnected = connected.has(repo.url)
              return (
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
                      {repo.description || repo.default_branch}
                    </span>
                  </span>
                  <ApplicationButton
                    size="sm"
                    variant={isConnected ? "ghost" : "secondary"}
                    disabled={isConnected || busyUrl === repo.url}
                    iconLeft={
                      busyUrl === repo.url ? (
                        <Spinner />
                      ) : isConnected ? (
                        <Check />
                      ) : undefined
                    }
                    onClick={() => handleConnect(repo)}
                  >
                    {isConnected ? "Connected" : "Connect"}
                  </ApplicationButton>
                </li>
              )
            })}
        {repos !== null && shown.length === 0 && (
          <li className="p-4 text-xs text-muted-foreground">
            No repositories match.
          </li>
        )}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <ApplicationButton
          size="lg"
          variant="highlight"
          onClick={onFinish}
          disabled={isFinishing}
          iconLeft={isFinishing ? <Spinner /> : undefined}
        >
          {connected.size > 0
            ? "Go to the dashboard"
            : "Skip and go to the dashboard"}
        </ApplicationButton>
        <span className="text-xs text-muted-foreground">
          You can connect more repositories any time.
        </span>
      </div>
    </div>
  )
}
