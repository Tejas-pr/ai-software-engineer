import { useState } from "react"
import { NavLink } from "react-router-dom"
import { useMotionValueEvent, useScroll } from "motion/react"
import { cn } from "@workspace/ui/lib/utils"
import { BrandLink } from "@/components/molecules/common/brand-link"
import { paths } from "@/lib/common/paths"

const NAV = [
  { to: `${paths.home}#how-it-works`, label: "How it works" },
  { to: paths.agents, label: "Agents" },
  { to: paths.setup, label: "Self-host" },
]

/**
 * The public header: sits flat on the page at the top, then turns to frosted
 * glass with a hairline once the page scrolls under it.
 */
export function SiteHeader({
  className,
  children,
  ...props
}: React.ComponentProps<"header">) {
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8))

  return (
    <header
      data-slot="site-header"
      data-scrolled={scrolled || undefined}
      className={cn(
        "sticky top-0 z-40 w-full border-b border-transparent transition-[background-color,border-color,backdrop-filter] duration-300",
        "data-scrolled:border-border/70 data-scrolled:bg-background/75 data-scrolled:backdrop-blur-xl data-scrolled:backdrop-saturate-150",
        className
      )}
      {...props}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <BrandLink />
        <nav
          aria-label="Main"
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex"
        >
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-1.5 text-[0.8125rem] font-medium transition-colors hover:text-foreground",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2">{children}</div>
      </div>
    </header>
  )
}
