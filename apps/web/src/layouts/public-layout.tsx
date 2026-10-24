import { Link, Outlet, useLocation } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { applicationButtonVariants } from "@/components/molecules/application/application-button"
import { RouteTransition } from "@/components/molecules/common/route-transition"
import { ThemeToggle } from "@/components/molecules/common/theme-toggle"
import { UserMenu } from "@/components/molecules/common/user-menu"
import { SiteFooter } from "@/components/organisms/common/site-footer"
import { SiteHeader } from "@/components/organisms/common/site-header"
import { useAuth } from "@/hooks/auth/use-auth"
import { SIGNED_IN_HOME } from "@/lib/auth/auth-redirect"
import { paths } from "@/lib/common/paths"

// Pages anyone can see: the landing and the 404. Signed in or not, the
// header shows the way forward
export function PublicLayout() {
  const { user, isPending } = useAuth()
  const isLanding = useLocation().pathname === paths.home

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader showNav={isLanding}>
        <ThemeToggle />
        {isPending ? (
          <Skeleton className="h-9 w-32 rounded-lg" />
        ) : user ? (
          <>
            <Link
              to={SIGNED_IN_HOME}
              className={applicationButtonVariants({
                variant: "ghost",
                className: "hidden sm:inline-flex",
              })}
            >
              Open app
            </Link>
            <UserMenu user={user} />
          </>
        ) : (
          <>
            <Link
              to={paths.auth.signin}
              className={applicationButtonVariants({ variant: "ghost" })}
            >
              Sign in
            </Link>
            <Link
              to={paths.auth.signup}
              className={applicationButtonVariants({
                variant: "highlight",
                className: "hidden sm:inline-flex",
              })}
            >
              Get started
              <ArrowRight />
            </Link>
          </>
        )}
      </SiteHeader>

      <main className="flex flex-1 flex-col">
        <RouteTransition className="flex flex-1 flex-col">
          <Outlet />
        </RouteTransition>
      </main>

      <SiteFooter />
    </div>
  )
}
