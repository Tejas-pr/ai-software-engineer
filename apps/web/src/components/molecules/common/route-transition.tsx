import type { ReactNode } from "react"
import { useMatches } from "react-router-dom"
import { motion, useReducedMotion } from "motion/react"

// The page fades in while rising 8px: the app's standard 300ms ease-out.
// Enter only: the old page goes at once, so navigating never waits
const ENTER = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: "easeOut" },
} as const

// Reduced motion: a plain fade
const FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.15 },
} as const

export interface RouteTransitionProps {
  /** The page: the layout's <Outlet /> */
  children: ReactNode
  className?: string
}

/**
 * Wraps a layout's page so every route animates in when the user moves to
 * another page. It replays only when the matched page route changes: search
 * params, or another id on the same page, neither replay nor remount. A
 * route turns it off with `handle: { transition: false }`.
 */
export function RouteTransition({ children, className }: RouteTransitionProps) {
  const matches = useMatches()
  const reduceMotion = useReducedMotion()
  const pageId = matches.at(-1)?.id
  const isOff = matches.some(
    (match) =>
      (match.handle as { transition?: boolean } | undefined)?.transition ===
      false
  )

  if (isOff) {
    return (
      <div data-slot="route-transition" className={className}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      key={pageId}
      data-slot="route-transition"
      className={className}
      {...(reduceMotion ? FADE : ENTER)}
    >
      {children}
    </motion.div>
  )
}
