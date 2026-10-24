import { useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"
import { Spinner } from "@workspace/ui/components/spinner"
import { githubLoginUrl } from "@/api/auth.api"
import { GithubIcon } from "@/components/atoms/github-icon"
import {
  ApplicationButton,
  type ApplicationButtonProps,
} from "@/components/molecules/application/application-button"
import { rememberRedirect } from "@/lib/auth/auth-redirect"

// Long enough for a slow redirect to start; past it the page clearly stayed
const REDIRECT_TIMEOUT_MS = 15_000

export interface GithubAuthButtonProps extends Omit<
  ApplicationButtonProps,
  "onClick" | "children"
> {
  /** Where to land after sign-in (the page that sent them here) */
  next?: string | null
  label?: string
}

/**
 * The one way in: GitHub OAuth. A full-page navigation, not axios: the API
 * redirects to GitHub and back to /login/callback with the cookies set.
 */
export function GithubAuthButton({
  next = null,
  label = "Continue with GitHub",
  variant = "highlight",
  size = "lg",
  className,
  ...props
}: GithubAuthButtonProps) {
  // True from the click until the browser leaves for GitHub, so a second
  // click can't start another sign-in
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (!isRedirecting) return
    // Two ways back keep this page instead of reloading it:
    // - Back from GitHub restores it from the back/forward cache
    // - the redirect never starts (offline, blocked)
    const reset = () => setIsRedirecting(false)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) reset()
    }
    window.addEventListener("pageshow", handlePageShow)
    const timeout = window.setTimeout(reset, REDIRECT_TIMEOUT_MS)
    return () => {
      window.removeEventListener("pageshow", handlePageShow)
      window.clearTimeout(timeout)
    }
  }, [isRedirecting])

  function handleClick() {
    if (isRedirecting) return
    setIsRedirecting(true)
    rememberRedirect(next)
    window.location.assign(githubLoginUrl())
  }

  return (
    <ApplicationButton
      data-slot="github-auth-button"
      variant={variant}
      size={size}
      className={className}
      disabled={isRedirecting}
      aria-busy={isRedirecting}
      iconLeft={isRedirecting ? <Spinner /> : <GithubIcon />}
      iconRight={isRedirecting ? undefined : <ArrowRight />}
      onClick={handleClick}
      {...props}
    >
      {isRedirecting ? "Redirecting to GitHub…" : label}
    </ApplicationButton>
  )
}
