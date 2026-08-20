import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@workspace/ui/components/button"
import { getUser } from "@/api/user.api"
import { logout } from "@/api/auth.api"

interface User {
  id: number
  username: string
  email: string
  is_active: boolean
}

export function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    getUser()
      .then((res) => {
        setUser(res)
        setLoading(false)
      })
      .catch((err) => {
        // 401s are handled centrally by the api client (refresh-or-redirect
        // to /login) — just surface anything else here.
        if (err.response?.status !== 401) {
          setError(err.message || "Failed to load user session")
        }
        setLoading(false)
      })
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // best-effort — the cookies will simply expire on their own otherwise
    }
    navigate("/login")
  }

  if (loading) {
    return (
      <div className="animate-fade-in flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="animate-pulse text-sm font-medium text-muted-foreground">
            Loading workspace...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* Navigation Bar */}
        <header className="mb-12 flex items-center justify-between border-b border-border pb-6">
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
            <span className="text-lg font-bold tracking-tight">
              AI SWE Workspace
            </span>
          </div>

          <Button
            variant="outline"
            onClick={handleLogout}
            className="rounded-lg"
          >
            Logout
          </Button>
        </header>

        {/* Dashboard Content */}
        <main className="grid gap-8 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            <div className="rounded-lg border border-border bg-card p-8 text-card-foreground shadow-sm">
              <h2 className="mb-2 text-2xl font-bold tracking-tight">
                Project ready!
              </h2>
              <p className="mb-6 leading-relaxed text-muted-foreground">
                Your AI Software Engineer application dashboard is fully
                configured. You can now build workflows, integrate tools, and
                manage deployments.
              </p>
              <div className="flex gap-4">
                <Button className="rounded-lg">Launch Console</Button>
                <Button variant="outline" className="rounded-lg">
                  View Docs
                </Button>
              </div>
            </div>
          </div>

          {/* User Profile Card */}
          <div className="space-y-6">
            {error ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
                Error: {error}
              </div>
            ) : (
              user && (
                <div className="space-y-4 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
                  <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                    User Session
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                      <span className="text-lg font-bold">
                        {(user.username || "?").substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold">{user.username}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 border-t border-border pt-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">User ID:</span>
                      <span className="font-mono text-muted-foreground">
                        {user.id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-semibold text-primary">
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
