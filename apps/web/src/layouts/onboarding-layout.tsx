import { Navigate, Outlet, useLocation } from "react-router-dom"
import { BuiltBy } from "@/components/atoms/built-by"
import { BrandLink } from "@/components/molecules/common/brand-link"
import { ThemeToggle } from "@/components/molecules/common/theme-toggle"
import { PageSkeleton } from "@/components/molecules/skeletons/page-skeleton"
import { useAuth } from "@/hooks/auth/use-auth"
import { paths } from "@/lib/common/paths"

// First sign-in → here, until the user has an organization and a model to
// run on (AppLayout sends them; the API's /account/onboarding/complete
// enforces it). Already onboarded → the dashboard.
export function OnboardingLayout() {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === "pending") return <PageSkeleton />
  if (!user) {
    return (
      <Navigate
        to={paths.auth.signin}
        state={{ from: location.pathname }}
        replace
      />
    )
  }
  if (user.onboarded_at) return <Navigate to={paths.dashboard} replace />

  return (
    <div className="relative isolate flex min-h-svh flex-col bg-background">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid" />
      <header className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
        <BrandLink to={paths.onboarding} />
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
        <Outlet />
      </main>
      <footer className="mx-auto w-full max-w-3xl px-4 pb-6 sm:px-6">
        <BuiltBy />
      </footer>
    </div>
  )
}
