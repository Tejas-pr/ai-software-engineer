import { motion, useReducedMotion } from "motion/react"
import { format } from "date-fns"
import { Skeleton } from "@workspace/ui/components/skeleton"
import type { OrgOverview } from "@/api/organizations.api"
import { parseApiDate } from "@/lib/common/dates"

/** "Last 30 days": a run-per-day bar chart and the headline numbers */
export function UsageCard({ overview }: { overview: OrgOverview | null }) {
  const reduceMotion = useReducedMotion()

  if (!overview) {
    return <Skeleton className="h-80 rounded-xl" />
  }

  const max = Math.max(1, ...overview.daily.map((d) => d.runs))
  const { runs, projects } = overview
  const rate =
    runs.success_rate === null ? "—" : `${Math.round(runs.success_rate * 100)}%`
  const rows = [
    { label: "Runs", value: runs.total },
    { label: "Completed", value: runs.by_status.completed ?? 0 },
    { label: "Success rate", value: rate },
    { label: "Pull requests opened", value: runs.prs_opened },
    {
      label: "Repositories indexed",
      value: `${projects.indexed} / ${projects.total}`,
    },
  ]

  return (
    <section
      data-slot="usage-card"
      className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-[0_1px_0_0_var(--border)]"
    >
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Last 30 days</h2>
        {runs.active > 0 && (
          <span className="flex items-center gap-1.5 text-2xs text-run-running">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-current" />
            </span>
            {runs.active} active
          </span>
        )}
      </header>

      {/* One bar per day, newest on the right: its height is the day's runs,
          the solid part the ones that completed */}
      <div
        className="flex h-24 items-end gap-[3px] px-4 pt-4"
        role="img"
        aria-label={`${runs.total} runs in the last 30 days`}
      >
        {overview.daily.map((day, i) => (
          <motion.div
            key={day.date}
            title={`${format(parseApiDate(day.date), "MMM d")}: ${day.runs} run${day.runs === 1 ? "" : "s"}`}
            className={
              day.runs > 0
                ? "relative flex-1 overflow-hidden rounded-[2px] bg-primary/30"
                : "relative flex-1 overflow-hidden rounded-[2px] bg-muted"
            }
            initial={reduceMotion ? false : { height: 2 }}
            animate={{ height: `${Math.max(4, (day.runs / max) * 100)}%` }}
            transition={{
              duration: 0.6,
              delay: i * 0.012,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {day.runs > 0 && (
              <span
                className="absolute inset-x-0 bottom-0 bg-primary"
                style={{ height: `${(day.completed / day.runs) * 100}%` }}
              />
            )}
          </motion.div>
        ))}
      </div>
      <div className="flex justify-between px-4 pt-1.5 pb-3 text-3xs text-muted-foreground">
        <span>{format(parseApiDate(overview.daily[0]!.date), "MMM d")}</span>
        <span>Today</span>
      </div>

      <dl className="flex flex-col border-t">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between border-b px-4 py-2.5 text-[0.8125rem] last:border-b-0"
          >
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-medium tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
