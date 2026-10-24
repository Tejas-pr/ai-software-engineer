import { motion, useReducedMotion } from "motion/react"
import {
  Check,
  CircleDot,
  FileCode2,
  GitPullRequestArrow,
  MessageSquareText,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

// An illustrative pull request, the kind the agent opens: not real data
const FILES = [
  { path: "api/routes/upload.py", add: 42, del: 9 },
  { path: "api/middleware/rate_limit.py", add: 31, del: 0 },
  { path: "tests/test_upload_limits.py", add: 11, del: 3 },
]

const CHECKS = [
  { label: "Plan approved by you", icon: MessageSquareText },
  { label: "pytest · 48 passed", icon: Check },
  { label: "Self-review: no blocking notes", icon: FileCode2 },
]

const EASE = [0.22, 1, 0.36, 1] as const

/**
 * AuthLayout's right panel: always dark (ink), whatever the theme, with the
 * thing the product hands back — a pull request waiting for review.
 */
export function AuthShowcase({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion()
  const rise = (delay: number) =>
    reduceMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: EASE },
        }

  return (
    <div
      data-slot="auth-showcase"
      className={cn(
        "dark relative isolate flex flex-col justify-between overflow-hidden rounded-2xl bg-[var(--brand-ink)] p-10 text-foreground xl:p-14",
        className
      )}
    >
      {/* Grid and an amber glow from the corner, under everything */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-grid opacity-60"
      />
      <div
        aria-hidden="true"
        className="absolute -top-40 -right-40 -z-10 size-[32rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand-amber)_28%,transparent),transparent)]"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grain" />

      <motion.p
        {...rise(0.1)}
        className="max-w-md font-serif text-[2.75rem] leading-[1.05] tracking-[-0.01em] text-balance"
      >
        Hand it the issue.{" "}
        <em className="text-[var(--brand-amber)]">Review the pull request.</em>
      </motion.p>

      <motion.div
        {...rise(0.25)}
        className="mt-10 w-full max-w-md self-end rounded-xl border border-white/10 bg-white/[0.04] shadow-[0_40px_80px_-30px_black] backdrop-blur-sm"
      >
        <div className="flex items-start gap-3 border-b border-white/10 p-4">
          <GitPullRequestArrow className="mt-0.5 size-4 shrink-0 text-run-completed" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              Add per-user rate limiting to uploads
            </p>
            <p className="mt-0.5 font-mono text-2xs text-muted-foreground">
              agent/rate-limit-uploads → main
            </p>
          </div>
          <span className="flex items-center gap-1 rounded-full border border-run-awaiting/30 bg-run-awaiting/10 px-2 py-0.5 text-2xs font-medium text-run-awaiting">
            <CircleDot className="size-3" />
            Ready for review
          </span>
        </div>

        <ul className="flex flex-col gap-1 p-3 font-mono text-xs">
          {FILES.map((file, i) => (
            <motion.li
              key={file.path}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 + i * 0.12, duration: 0.4, ease: EASE }}
              className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-white/5"
            >
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {file.path}
              </span>
              <span className="text-run-completed">+{file.add}</span>
              <span className="w-6 text-end text-run-failed">−{file.del}</span>
            </motion.li>
          ))}
        </ul>

        <ul className="flex flex-col gap-2 border-t border-white/10 p-4">
          {CHECKS.map(({ label, icon: Icon }, i) => (
            <motion.li
              key={label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.95 + i * 0.15, duration: 0.3 }}
              className="flex items-center gap-2.5 text-xs text-muted-foreground"
            >
              <span className="flex size-4 items-center justify-center rounded-full bg-run-completed/15 text-run-completed">
                <Icon className="size-2.5" strokeWidth={3} />
              </span>
              {label}
            </motion.li>
          ))}
        </ul>
      </motion.div>

      <p className="mt-8 text-2xs text-muted-foreground/70">
        illustrative · researcher → planner → you → coder → tester → reviewer →
        PR
      </p>
    </div>
  )
}
