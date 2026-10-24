import { Navigate } from "react-router-dom"
import { TextLink } from "@/components/atoms/text-link"
import { GithubAuthButton } from "@/components/molecules/common/github-auth-button"
import { AuthCard } from "@/components/organisms/auth/auth-card"
import { useAuth } from "@/hooks/auth/use-auth"
import { SIGNED_IN_HOME } from "@/lib/auth/auth-redirect"
import { paths } from "@/lib/common/paths"

const STEPS = [
  "Authorize on GitHub — that's your account",
  "Connect a repository",
  "Hand the agent an issue",
]

// There's no separate sign-up: the first GitHub sign-in creates the account
export function SignupPage() {
  const { isAuthenticated, isPending } = useAuth()

  if (isAuthenticated) {
    return <Navigate to={SIGNED_IN_HOME} replace />
  }

  if (isPending) return null

  return (
    <AuthCard
      data-slot="signup-page"
      eyebrow="Get started"
      title={
        <>
          Start with a <em>repository</em>.
        </>
      }
      description="No password to set. Your account is created the first time you sign in with GitHub."
      footer={
        <>
          Already have an account?{" "}
          <TextLink to={paths.auth.signin}>Sign in</TextLink>
        </>
      }
    >
      <ol className="flex flex-col gap-2.5">
        {STEPS.map((step, i) => (
          <li
            key={step}
            className="flex items-center gap-3 text-[0.8125rem] text-foreground"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md border bg-card text-2xs font-medium text-muted-foreground tabular-nums shadow-[0_1px_0_0_var(--border)]">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <GithubAuthButton label="Sign up with GitHub" className="mt-2 w-full" />
    </AuthCard>
  )
}
