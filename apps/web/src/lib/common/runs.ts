import type { RunListItem } from "@/api/agent.api"

/** Latest run per project, from a newest-first list */
export function latestRunByProject(runs: RunListItem[] | null) {
  const map = new Map<number, RunListItem>()
  for (const run of runs ?? []) {
    if (!map.has(run.project_id)) map.set(run.project_id, run)
  }
  return map
}
