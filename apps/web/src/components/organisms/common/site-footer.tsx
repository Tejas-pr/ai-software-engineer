import { Link } from "react-router-dom"
import { cn } from "@workspace/ui/lib/utils"
import { BrandLogo } from "@/components/atoms/brand-logo"
import { BuiltBy } from "@/components/atoms/built-by"
import { GithubIcon } from "@/components/atoms/github-icon"
import { AUTHOR, REPOSITORY_URL } from "@/lib/common/attribution"
import { paths } from "@/lib/common/paths"

const CURRENT_YEAR = new Date().getFullYear()

const LINKS = [
  { to: `${paths.home}#how-it-works`, label: "How it works" },
  { to: paths.agents, label: "Agents" },
  { to: paths.setup, label: "Self-host" },
  { to: paths.auth.signin, label: "Sign in" },
]

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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="flex flex-col gap-3">
          <BrandLogo />
          <p className="text-xs text-muted-foreground">
            You review. It writes the pull request.
          </p>
          <BuiltBy />
        </div>
        <div className="flex flex-col gap-4 sm:items-end">
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.8125rem] text-muted-foreground"
          >
            {LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <a
              href={REPOSITORY_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <GithubIcon className="size-3.5" />
              GitHub
            </a>
          </nav>
          <p className="text-2xs text-muted-foreground/80">
            © {CURRENT_YEAR} {AUTHOR} · press{" "}
            <kbd className="rounded border px-1">D</kbd> to flip the lights
          </p>
        </div>
      </div>
    </footer>
  )
}
