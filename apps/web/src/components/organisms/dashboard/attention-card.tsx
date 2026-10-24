import { Link } from "react-router-dom"
import { BellRing, CheckCircle2 } from "lucide-react"
import type { RunListItem } from "@/api/agent.api"
import { timeAgo } from "@/lib/common/dates"
import { projectPath } from "@/lib/common/paths"

/** Runs waiting on a person: plans to approve, failures to look at */
export function AttentionCard({ runs }: { runs: RunListItem[] | null }) {
  const awaiting = (runs ?? []).filter((r) => r.status === "awaiting_approval")
  const failed = (runs ?? []).filter((r) => r.status === "failed").slice(0, 3)
  const items = [...awaiting, ...failed]

  return (
    <section
      data-slot="attention-card"
      className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-[0_1px_0_0_var(--border)]"
    >
      <header className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Needs your attention</h2>
      </header>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
          <span className="flex size-9 items-center justify-center rounded-lg border bg-background text-muted-foreground">
            <CheckCircle2 className="size-4" />
          </span>
          <p className="text-xs/relaxed text-muted-foreground">
            Nothing waiting. Plans that need approval and failed runs show up
            here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col">
          {items.map((run) => (
            <li key={run.id} className="border-b last:border-b-0">
              <Link
                to={`${projectPath(run.project_id)}?run=${run.id}`}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <BellRing
                  className={
                    run.status === "awaiting_approval"
                      ? "mt-0.5 size-4 shrink-0 text-run-awaiting"
                      : "mt-0.5 size-4 shrink-0 text-run-failed"
                  }
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[0.8125rem] font-medium">
                    {run.status === "awaiting_approval"
                      ? "Plan ready for review"
                      : "Run failed"}{" "}
                    · {run.project_name}
                  </span>
                  <span className="truncate text-2xs text-muted-foreground">
                    {run.task} · {timeAgo(run.created_at)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
