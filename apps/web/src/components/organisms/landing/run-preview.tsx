import { useEffect, useRef, useState } from "react"
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react"
import { Check, CornerDownRight, GitPullRequestArrow } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import {
  ApplicationBadge,
  type ApplicationBadgeVariant,
} from "@/components/molecules/application/application-badge"

type Line = {
  /** The graph node that speaks (app/agents/graph.py) */
  node: string
  text: string
  /** How long this line runs before the next one starts (ms) */
  ms: number
  tone?: "muted" | "ok" | "warn" | "fail"
  /** Extra block under the line */
  detail?: "plan" | "approve" | "pr"
  /** The run's status while this line is the newest */
  status: ApplicationBadgeVariant
}

// An illustrative run, step for step what the pipeline does: research,
// plan, wait for you, code, test (fail, fix, pass), self-review, open a PR
const SCRIPT: Line[] = [
  {
    node: "researcher",
    text: "Reading the codebase — 37 files under api/ and tests/",
    ms: 1500,
    status: "running",
  },
  {
    node: "planner",
    text: "Drafted a plan: 3 steps, 3 files",
    ms: 1300,
    detail: "plan",
    status: "running",
  },
  {
    node: "you",
    text: "Waiting for your approval…",
    ms: 2300,
    tone: "warn",
    detail: "approve",
    status: "awaiting",
  },
  {
    node: "coder",
    text: "Edited api/routes/upload.py  +42 −9",
    ms: 1100,
    status: "running",
  },
  {
    node: "coder",
    text: "Created api/middleware/rate_limit.py  +31",
    ms: 1000,
    status: "running",
  },
  {
    node: "tester",
    text: "pytest — 1 failed: test_burst_limit",
    ms: 1300,
    tone: "fail",
    status: "running",
  },
  {
    node: "coder",
    text: "Fixed off-by-one in the token bucket refill",
    ms: 1100,
    status: "running",
  },
  {
    node: "tester",
    text: "pytest — 48 passed in 6.2s",
    ms: 1100,
    tone: "ok",
    status: "running",
  },
  {
    node: "reviewer",
    text: "Reviewed the diff — no blocking notes",
    ms: 1100,
    tone: "ok",
    status: "running",
  },
  {
    node: "github",
    text: "Opened pull request #128",
    ms: 4200,
    tone: "ok",
    detail: "pr",
    status: "completed",
  },
]

const STATUS_LABEL: Partial<Record<ApplicationBadgeVariant, string>> = {
  running: "running",
  awaiting: "awaiting approval",
  completed: "completed",
}

const TONE: Record<NonNullable<Line["tone"]>, string> = {
  muted: "text-muted-foreground",
  ok: "text-run-completed",
  warn: "text-run-awaiting",
  fail: "text-run-failed",
}

const EASE = [0.22, 1, 0.36, 1] as const

/**
 * The landing hero's terminal: plays a run line by line and loops. Pauses
 * off screen; with reduced motion it shows the finished run, still.
 */
export function RunPreview({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  // How many lines are on screen; the newest is "running"
  const [shown, setShown] = useState(1)
  const [loop, setLoop] = useState(0)
  const visible = reduceMotion ? SCRIPT.length : shown

  useEffect(() => {
    if (reduceMotion || !inView) return
    const current = SCRIPT[shown - 1]
    const timer = window.setTimeout(() => {
      if (shown < SCRIPT.length) {
        setShown(shown + 1)
      } else {
        // Start over: a new run id makes the log clear and replay
        setShown(1)
        setLoop((n) => n + 1)
      }
    }, current?.ms ?? 1000)
    return () => window.clearTimeout(timer)
  }, [shown, inView, reduceMotion])

  const newest = SCRIPT[visible - 1]!
  const status = newest.status

  return (
    <div
      ref={ref}
      data-slot="run-preview"
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card shadow-[0_1px_0_0_var(--border),0_40px_80px_-40px_oklch(0.3_0.04_60/0.45)] dark:shadow-[0_40px_80px_-30px_black]",
        className
      )}
    >
      {/* Title bar: which run, on which repo, in which state */}
      <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-2.5">
        <span className="font-mono text-xs text-muted-foreground">
          run <span className="text-foreground">#{214 + loop}</span> ·
          acme/storefront
        </span>
        <ApplicationBadge
          variant={status}
          size="sm"
          dot
          pulseDot={status !== "completed"}
          className="ms-auto font-mono"
        >
          {STATUS_LABEL[status] ?? status}
        </ApplicationBadge>
      </div>

      {/* Tall enough for the whole run, so the page never jumps as it grows */}
      <div className="min-h-[33rem] px-4 pt-3 pb-4 font-mono text-[0.75rem] leading-6 sm:min-h-[29rem] sm:text-[0.8125rem]">
        <p className="mb-2 truncate text-muted-foreground">
          <span className="text-link">task</span> Add per-user rate limiting to
          the upload endpoint (#93)
        </p>
        <ol key={loop} className="flex flex-col">
          <AnimatePresence initial={false}>
            {SCRIPT.slice(0, visible).map((line, i) => {
              const isNewest = i === visible - 1 && status !== "completed"
              return (
                <motion.li
                  key={i}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="flex flex-col"
                >
                  <div className="flex gap-3">
                    <span className="w-[4.5rem] shrink-0 text-end text-muted-foreground/70">
                      {line.node}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1",
                        line.tone ? TONE[line.tone] : "text-foreground"
                      )}
                    >
                      {line.text}
                      {isNewest && (
                        <span
                          aria-hidden="true"
                          className="ms-1 inline-block h-[1.05em] w-[0.5em] translate-y-[0.15em] animate-caret bg-primary"
                        />
                      )}
                    </span>
                  </div>
                  {line.detail && (
                    <Detail
                      kind={line.detail}
                      // The approve button gets "pressed" once the next
                      // line (the coder) arrives
                      settled={i < visible - 1}
                      reduceMotion={Boolean(reduceMotion)}
                    />
                  )}
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ol>
      </div>
    </div>
  )
}

function Detail({
  kind,
  settled,
  reduceMotion,
}: {
  kind: NonNullable<Line["detail"]>
  settled: boolean
  reduceMotion: boolean
}) {
  const reveal = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, height: 0 },
        animate: { opacity: 1, height: "auto" },
        transition: { duration: 0.4, ease: EASE, delay: 0.15 },
      }

  if (kind === "plan") {
    return (
      <motion.div {...reveal} className="overflow-hidden">
        <ol className="my-1.5 ms-[5.25rem] flex flex-col gap-0.5 rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-muted-foreground">
          {[
            "Add a token-bucket limiter keyed by user id",
            "Apply it to POST /uploads, return 429 + Retry-After",
            "Cover burst and refill cases in tests",
          ].map((step, i) => (
            <li key={step} className="flex gap-2 truncate">
              <span className="text-link">{i + 1}.</span>
              <span className="truncate">{step}</span>
            </li>
          ))}
        </ol>
      </motion.div>
    )
  }

  if (kind === "approve") {
    return (
      <motion.div {...reveal} className="overflow-hidden">
        <div className="my-1.5 ms-[5.25rem] flex items-center gap-2">
          <motion.span
            animate={
              settled && !reduceMotion
                ? { scale: [1, 0.94, 1], transition: { duration: 0.25 } }
                : undefined
            }
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 font-sans text-xs font-medium transition-colors duration-300",
              settled
                ? "border-run-completed/30 bg-run-completed/10 text-run-completed"
                : "border-[color-mix(in_oklab,var(--primary),black_14%)] bg-primary text-primary-foreground"
            )}
          >
            {settled ? <Check className="size-3" strokeWidth={3} /> : null}
            {settled ? "Approved by you" : "Approve plan"}
          </motion.span>
          {!settled && (
            <span className="rounded-md border px-2.5 py-0.5 font-sans text-xs text-muted-foreground">
              Request changes
            </span>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div {...reveal} className="overflow-hidden">
      <div className="my-1.5 ms-[5.25rem] flex items-center gap-2.5 rounded-lg border bg-background/60 px-3 py-2">
        <GitPullRequestArrow className="size-4 shrink-0 text-run-completed" />
        <span className="min-w-0 flex-1 truncate font-sans text-xs font-medium text-foreground">
          Add per-user rate limiting to uploads
        </span>
        <span className="hidden items-center gap-1 text-2xs text-muted-foreground sm:flex">
          <CornerDownRight className="size-3" />
          agent/rate-limit-uploads
        </span>
      </div>
    </motion.div>
  )
}
