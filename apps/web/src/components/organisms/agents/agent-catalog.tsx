import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import {
  ArrowRight,
  Bot,
  FileSearch,
  GitPullRequestArrow,
  ListChecks,
  PenLine,
  ScanSearch,
  TestTubeDiagonal,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"
import { getAgentCatalog, type AgentCatalog as Catalog } from "@/api/agent.api"
import { ApplicationBadge } from "@/components/molecules/application/application-badge"

const ICONS: Record<string, LucideIcon> = {
  researcher: ScanSearch,
  planner: ListChecks,
  human_approval: UserRoundCheck,
  coder: PenLine,
  tester: TestTubeDiagonal,
  reviewer: FileSearch,
  github: GitPullRequestArrow,
}

const EASE = [0.22, 1, 0.36, 1] as const

/**
 * The pipeline and every agent in it, as this server runs them — tools and
 * limits come from the API (`GET /agent/catalog`), read from the graph's
 * own code.
 */
export function AgentCatalog() {
  const reduceMotion = useReducedMotion()
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    getAgentCatalog()
      .then(setCatalog)
      .catch(() => setFailed(true))
  }, [])

  if (failed) {
    return (
      <p className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">
        Couldn't reach the API to load the agents. Is the backend running?
      </p>
    )
  }

  if (!catalog) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const nameOf = (id: string) =>
    id === catalog.approval_step.id
      ? catalog.approval_step.name
      : (catalog.agents.find((a) => a.id === id)?.name ?? id)

  return (
    <div data-slot="agent-catalog" className="flex flex-col gap-10">
      {/* The flow, left to right */}
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2 rounded-xl border bg-card p-3 shadow-[0_1px_0_0_var(--border)]">
        {catalog.order.map((id, i) => {
          const Icon = ICONS[id] ?? Bot
          const isYou = id === catalog.approval_step.id
          return (
            <motion.li
              key={id}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: EASE }}
              className="flex items-center gap-1.5"
            >
              <a
                href={isYou ? "#human_approval" : `#${id}`}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  isYou
                    ? "border-[color-mix(in_oklab,var(--primary),black_14%)] bg-primary text-primary-foreground"
                    : "bg-background hover:border-foreground/20"
                )}
              >
                <Icon className="size-3.5" />
                {nameOf(id)}
              </a>
              {i < catalog.order.length - 1 && (
                <ArrowRight
                  className="size-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
            </motion.li>
          )
        })}
      </ol>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
        {catalog.agents.map((agent, i) => {
          const Icon = ICONS[agent.id] ?? Bot
          return (
            <motion.article
              key={agent.id}
              id={agent.id}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: (i % 2) * 0.06, ease: EASE }}
              className="flex scroll-mt-24 flex-col gap-4 rounded-xl border bg-card p-5 shadow-[0_1px_0_0_var(--border)]"
            >
              <header className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-background">
                  <Icon className="size-[1.125rem]" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-2xs text-muted-foreground tabular-nums">
                    Agent {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-serif text-2xl leading-none">
                    {agent.name}
                  </h3>
                </div>
                <ApplicationBadge
                  variant="neutral"
                  size="sm"
                  className="hidden sm:inline-flex"
                >
                  {agent.kind}
                </ApplicationBadge>
              </header>

              <p className="text-sm font-medium">{agent.role}</p>
              <p className="text-[0.8125rem]/relaxed text-muted-foreground">
                {agent.description}
              </p>

              <dl className="mt-auto flex flex-col gap-3 border-t pt-4 text-xs">
                <div className="flex flex-col gap-1.5">
                  <dt className="text-2xs tracking-[0.12em] text-muted-foreground uppercase">
                    Tools
                  </dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {agent.tools.length ? (
                      agent.tools.map((tool) => (
                        <code
                          key={tool}
                          className="rounded-md border bg-background px-1.5 py-0.5 text-2xs"
                        >
                          {tool}
                        </code>
                      ))
                    ) : (
                      <span className="text-muted-foreground">
                        None — no tool access
                      </span>
                    )}
                  </dd>
                </div>
                {agent.limits.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <dt className="text-2xs tracking-[0.12em] text-muted-foreground uppercase">
                      Limits
                    </dt>
                    <dd>
                      <ul className="flex flex-col gap-1 text-muted-foreground">
                        {agent.limits.map((limit) => (
                          <li key={limit}>· {limit}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <dt className="text-2xs tracking-[0.12em] text-muted-foreground uppercase">
                    Hands off
                  </dt>
                  <dd>{agent.outputs}</dd>
                </div>
              </dl>
            </motion.article>
          )
        })}
      </div>

      <section
        id="human_approval"
        className="flex scroll-mt-24 flex-col gap-2 rounded-xl border border-[color-mix(in_oklab,var(--primary),black_10%)] bg-brand-soft/60 p-5 sm:flex-row sm:items-center sm:gap-4"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--primary),black_14%)] bg-primary text-primary-foreground">
          <UserRoundCheck className="size-[1.125rem]" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-serif text-2xl leading-none">
            {catalog.approval_step.name}, between the planner and the coder
          </h3>
          <p className="text-[0.8125rem]/relaxed text-muted-foreground">
            {catalog.approval_step.role} Asking for changes sends the plan back
            to the planner with your notes; rejecting ends the run.
          </p>
        </div>
      </section>
    </div>
  )
}
