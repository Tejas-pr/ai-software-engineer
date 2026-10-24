import { useState } from "react"
import { NavLink } from "react-router-dom"
import { motion, useMotionValueEvent, useScroll } from "motion/react"
import { FolderGit2, KeyRound } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import type { User } from "@/api/user.api"
import { BrandLink } from "@/components/molecules/common/brand-link"
import { ThemeToggle } from "@/components/molecules/common/theme-toggle"
import { UserMenu } from "@/components/molecules/common/user-menu"
import { paths } from "@/lib/common/paths"

const NAV = [
  { to: paths.projects.root, label: "Repositories", icon: FolderGit2 },
  { to: paths.settings, label: "API keys", icon: KeyRound },
]

/** The signed-in header: brand, sections, theme and the account menu */
export function AppHeader({ user }: { user: User }) {
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 4))

  return (
    <header
      data-slot="app-header"
      data-scrolled={scrolled || undefined}
      className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl backdrop-saturate-150 transition-shadow duration-300 data-scrolled:shadow-[0_8px_24px_-16px_oklch(0_0_0/0.25)]"
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4 sm:gap-8 sm:px-6">
        <BrandLink
          to={paths.projects.root}
          className="[&_[data-slot=brand-logo]>span]:hidden sm:[&_[data-slot=brand-logo]>span]:inline"
        />

        <nav aria-label="Main" className="flex items-center gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="app-header-active"
                      aria-hidden="true"
                      className="absolute inset-0 -z-10 rounded-lg bg-muted shadow-[inset_0_0_0_1px_var(--border)]"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 40,
                      }}
                    />
                  )}
                  <Icon className="size-4 opacity-70" />
                  <span className="hidden sm:inline">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  )
}
