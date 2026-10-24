import { lazy, Suspense, useCallback, useState } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import type { User } from "@/api/user.api"
import { RouteTransition } from "@/components/molecules/common/route-transition"
import { PageSkeleton } from "@/components/molecules/skeletons/page-skeleton"
import { AppSidebar } from "@/components/organisms/common/app-sidebar"
import { AppTopbar } from "@/components/organisms/common/app-topbar"
import { useAuth } from "@/hooks/auth/use-auth"
import { useKeyboardShortcuts } from "@/hooks/common/use-keyboard-shortcuts"
import { paths } from "@/lib/common/paths"
import { OrganizationProvider } from "@/providers/organization/organization-provider"

const AppSearchDialog = lazy(() =>
  import("@/components/molecules/common/app-search-dialog").then((m) => ({
    default: m.AppSearchDialog,
  }))
)

// Rail (3rem) + section panel
const SIDEBAR_SIZE = { "--sidebar-width": "21rem" } as React.CSSProperties

function AppShell({ user }: { user: User }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const { toggleSidebar } = useSidebar()

  const handleOpenSearch = useCallback(() => {
    setSearchOpen(true)
  }, [])

  const handleToggleSearch = useCallback(() => {
    setSearchOpen((prev) => !prev)
  }, [])

  useKeyboardShortcuts([
    {
      key: "k",
      mod: true,
      allowInInput: true,
      allowInDialog: true,
      run: handleToggleSearch,
    },
  ])

  return (
    <>
      <AppSidebar user={user} />
      <SidebarInset className="h-svh min-w-0 overflow-x-hidden overflow-y-auto">
        <AppTopbar onOpenSearch={handleOpenSearch} />
        <RouteTransition className="flex flex-1 flex-col">
          <Outlet />
        </RouteTransition>
      </SidebarInset>
      <Suspense fallback={null}>
        {searchOpen && (
          <AppSearchDialog
            open={searchOpen}
            onOpenChange={setSearchOpen}
            onToggleSidebar={toggleSidebar}
          />
        )}
      </Suspense>
    </>
  )
}

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
        <SidebarProvider style={SIDEBAR_SIZE} className="h-svh overflow-hidden">
          <AppShell user={user} />
        </SidebarProvider>
      </TooltipProvider>
    </OrganizationProvider>
  )
}
