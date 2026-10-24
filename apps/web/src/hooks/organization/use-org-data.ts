import { useCallback, useEffect, useState } from "react"
import { listRuns, type RunListItem } from "@/api/agent.api"
import { listProjects, type Project } from "@/api/projects.api"

/**
 * Fired on window after anything that changes the organization's projects
 * or runs (connect, disconnect, start a run …), so lists elsewhere on the
 * screen — the sidebar — refresh without a shared store.
 */
export const ORG_DATA_CHANGED_EVENT = "ase:org-data-changed"

export function notifyOrgDataChanged() {
  window.dispatchEvent(new Event(ORG_DATA_CHANGED_EVENT))
}

function useOrgList<T>(load: () => Promise<T[]>, key: number) {
  const [items, setItems] = useState<T[] | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1)
    window.addEventListener(ORG_DATA_CHANGED_EVENT, bump)
    return () => window.removeEventListener(ORG_DATA_CHANGED_EVENT, bump)
  }, [])

  useEffect(() => {
    let cancelled = false
    load()
      .then((list) => {
        if (!cancelled) setItems(list)
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
    return () => {
      cancelled = true
    }
    // `key` (the organization) and `version` decide when to reload
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return { items, reload }
}

/** The organization's projects; null while loading */
export function useOrgProjects(organizationId: number) {
  const { items, reload } = useOrgList<Project>(
    () => listProjects(organizationId),
    organizationId
  )
  return { projects: items, reload }
}

/** The organization's runs, newest first; null while loading */
export function useOrgRuns(organizationId: number) {
  const { items, reload } = useOrgList<RunListItem>(
    () => listRuns(organizationId),
    organizationId
  )
  return { runs: items, reload }
}
