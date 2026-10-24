import { Navigate, Outlet, useLocation } from "react-router-dom"
import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { RouteTransition } from "@/components/molecules/common/route-transition"
import { PageSkeleton } from "@/components/molecules/skeletons/page-skeleton"
import { AppSidebar } from "@/components/organisms/common/app-sidebar"
import { AppTopbar } from "@/components/organisms/common/app-topbar"
import { useAuth } from "@/hooks/auth/use-auth"
import { paths } from "@/lib/common/paths"
import { OrganizationProvider } from "@/providers/organization/organization-provider"

// Rail (3rem) + section panel
const SIDEBAR_SIZE = { "--sidebar-width": "21rem" } as React.CSSProperties

// The signed-in app. The API checks every request too; this keeps signed-out
// visitors (or a session that just expired, or someone pressing Back after
// signing out) out of the screens and brings them back after sign-in, and
// sends anyone who hasn't finished onboarding to finish it first.
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

  if (!user.onboarded_at) {
    return <Navigate to={paths.onboarding} replace />
  }

  return (
    <OrganizationProvider>
      <TooltipProvider>
        <SidebarProvider style={SIDEBAR_SIZE}>
          <AppSidebar user={user} />
          <SidebarInset className="min-w-0">
            <AppTopbar />
            <RouteTransition className="flex flex-1 flex-col">
              <Outlet />
            </RouteTransition>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </OrganizationProvider>
  )
}
