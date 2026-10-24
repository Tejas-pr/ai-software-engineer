import { useMemo } from "react"
import { useTheme } from "@/hooks/common/use-theme"
import { useOrganization } from "@/hooks/organization/use-organization"
import { useOrgProjects, useOrgRuns } from "@/hooks/organization/use-org-data"
import { actionItems } from "@/lib/search/search-actions"
import {
  pageItems,
  projectSearchItems,
  runSearchItems,
} from "@/lib/search/search-sources"
import type { SearchItem } from "@/lib/search/types"

/**
 * Collects searchable actions, static pages, and in-memory projects and runs.
 * Only evaluated when the search dialog is actually open.
 */
export function useSearchItems(
  isOpen: boolean,
  { canToggleSidebar }: { canToggleSidebar: boolean }
): SearchItem[] {
  const { theme, resolvedTheme } = useTheme()
  const { current } = useOrganization()
  const { projects } = useOrgProjects(current?.id ?? 0)
  const { runs } = useOrgRuns(current?.id ?? 0)

  return useMemo(() => {
    if (!isOpen) return []

    const actions = actionItems({
      theme,
      resolvedTheme,
      canToggleSidebar,
    })
    const pages = pageItems()
    const projectItems = projectSearchItems(projects)
    const runItems = runSearchItems(runs)

    return [...actions, ...pages, ...projectItems, ...runItems]
  }, [isOpen, theme, resolvedTheme, canToggleSidebar, projects, runs])
}
