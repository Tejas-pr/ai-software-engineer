import { Navigate, useLocation, useSearchParams } from "react-router-dom"
import { TextLink } from "@/components/atoms/text-link"
import { AuthNotice } from "@/components/molecules/auth/auth-notice"
import { GithubAuthButton } from "@/components/molecules/common/github-auth-button"
import { AuthCard } from "@/components/organisms/auth/auth-card"
import { useAuth } from "@/hooks/auth/use-auth"
import { redirectFrom, SIGNED_IN_HOME } from "@/lib/auth/auth-redirect"
import { paths } from "@/lib/common/paths"

export function SigninPage() {
  const { isAuthenticated, isPending } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  // A guarded page that sent them here (AppLayout) — back there after
  const from = redirectFrom(location.state)
  // The callback page sends ?error=github when no session came back
  const githubFailed = searchParams.get("error") === "github"

  if (isAuthenticated) {
    return <Navigate to={from ?? SIGNED_IN_HOME} replace />
  }

  // Not known yet: render nothing rather than flash the card at someone
  // who's about to be redirected
  if (isPending) return null

  return (
    <AuthCard
      data-slot="signin-page"
      eyebrow="Sign in"
      title={
        <>
          Welcome <em>back</em>.
        </>
      }
      description="Sign in with the GitHub account your repositories live on."
      footer={
        <>
          New here?{" "}
          <TextLink to={paths.auth.signup}>Create an account</TextLink>
        </>
      }
    >
      {githubFailed ? (
        <AuthNotice tone="error">
          GitHub sign-in didn't complete. Please try again.
        </AuthNotice>
      ) : from ? (
        <AuthNotice>
          Sign in to continue to{" "}
          <code className="font-mono text-xs text-foreground">{from}</code>.
        </AuthNotice>
      ) : null}

      <GithubAuthButton next={from} className="w-full" />

      <p className="text-xs/relaxed text-muted-foreground">
        We ask for the <code className="font-mono text-foreground">repo</code>{" "}
        scope so the agent can clone, branch and open pull requests for you. It
        never writes code before you approve its plan.
      </p>
    </AuthCard>
  )
}
