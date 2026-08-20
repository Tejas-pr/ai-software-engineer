import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

export function LoginCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // The backend already set the auth cookies before redirecting here —
    // nothing to read from the URL, just move on to the app.
    navigate("/")
  }, [navigate])

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background text-muted-foreground">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="animate-pulse text-sm font-medium">Authenticating...</p>
      </div>
    </div>
  )
}
