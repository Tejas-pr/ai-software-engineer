import { Link } from "react-router-dom"
import { cn } from "@workspace/ui/lib/utils"
import { BrandLogo } from "@/components/atoms/brand-logo"
import { paths } from "@/lib/common/paths"

const CURRENT_YEAR = new Date().getFullYear()

export function SiteFooter({
  className,
  ...props
}: React.ComponentProps<"footer">) {
  return (
    <footer
      data-slot="site-footer"
      className={cn("border-t border-border/70", className)}
      {...props}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-2">
          <BrandLogo />
          <p className="text-xs text-muted-foreground">
            You review. It writes the pull request.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <nav
            aria-label="Footer"
            className="flex items-center gap-4 text-[0.8125rem] text-muted-foreground"
          >
            <a href="#how-it-works" className="hover:text-foreground">
              How it works
            </a>
            <Link to={paths.auth.signin} className="hover:text-foreground">
              Sign in
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground/80">
            © {CURRENT_YEAR} · press{" "}
            <kbd className="rounded border px-1">D</kbd> to flip the lights
          </p>
        </div>
      </div>
    </footer>
  )
}
