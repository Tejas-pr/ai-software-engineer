import { Outlet } from "react-router-dom"
import { ShieldCheck } from "lucide-react"
import { BuiltBy } from "@/components/atoms/built-by"
import { BrandLink } from "@/components/molecules/common/brand-link"
import { RouteTransition } from "@/components/molecules/common/route-transition"
import { ThemeToggle } from "@/components/molecules/common/theme-toggle"
import { AuthShowcase } from "@/components/organisms/auth/auth-showcase"

// Sign in, sign up, the GitHub callback and sign out. Each page decides
// for itself whether a signed-in user should be here (sign out must be)
export function AuthLayout() {
  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[1fr_minmax(0,46%)]">
      <div className="relative isolate flex flex-col px-5 py-5 sm:px-10 sm:py-8">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grain" />
        <div className="flex items-center justify-between">
          <BrandLink />
          <ThemeToggle />
        </div>

        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-16">
          <RouteTransition className="flex w-full flex-col">
            <Outlet />
          </RouteTransition>
        </main>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            GitHub OAuth · session kept in httpOnly cookies
          </p>
          <BuiltBy />
        </div>
      </div>

      <div className="sticky top-0 hidden h-svh p-3 lg:block">
        <AuthShowcase className="size-full" />
      </div>
    </div>
  )
}
