import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Spinner } from "@workspace/ui/components/spinner"
import { AuthCard } from "@/components/organisms/auth/auth-card"
import { useAuth } from "@/hooks/auth/use-auth"
import { SIGNED_IN_HOME, takeRedirect } from "@/lib/auth/auth-redirect"
import { paths } from "@/lib/common/paths"

// GitHub → API → here. The API already set the auth cookies before
// redirecting, so there's nothing to read from the URL: wait for /me to
// answer, then go where the user was headed.
export function AuthCallbackPage() {
  const { status } = useAuth()
  const navigate = useNavigate()
  // takeRedirect() clears what it reads: only ever act once (StrictMode
  // runs effects twice in development)
  const handled = useRef(false)

  useEffect(() => {
    if (status === "pending" || handled.current) return
    handled.current = true
    if (status === "authenticated") {
      navigate(takeRedirect() ?? SIGNED_IN_HOME, { replace: true })
    } else {
      navigate(`${paths.auth.signin}?error=github`, { replace: true })
    }
  }, [status, navigate])

  return (
    <AuthCard
      data-slot="auth-callback-page"
      media={
        <span className="flex size-10 items-center justify-center rounded-xl border bg-card shadow-[0_1px_0_0_var(--border)]">
          <Spinner className="size-4" />
        </span>
      }
      title={
        <>
          Signing you <em>in</em>…
        </>
      }
      description="GitHub sent you back. Checking your session."
    />
  )
}
