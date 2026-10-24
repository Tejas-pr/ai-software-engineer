import { Navigate, Outlet, useLocation } from "react-router-dom"
import { PageSkeleton } from "@/components/molecules/skeletons/page-skeleton"
import { RouteTransition } from "@/components/molecules/common/route-transition"
import { AppHeader } from "@/components/organisms/common/app-header"
import { useAuth } from "@/hooks/auth/use-auth"
import { paths } from "@/lib/common/paths"

// The signed-in app. The API checks every request too; this keeps signed-out
// visitors (or a session that just expired, or someone pressing Back after
// signing out) out of the screens, and brings them back here after sign-in.
export function AppLayout() {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === "pending") {
    return <PageSkeleton />
  }

  if (!user) {
    return (
      <Navigate
        to={paths.auth.signin}
        state={{ from: `${location.pathname}${location.search}` }}
        replace
      />
    )
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <AppHeader user={user} />
      <RouteTransition className="flex flex-1 flex-col">
        <Outlet />
      </RouteTransition>
    </div>
  )
}
