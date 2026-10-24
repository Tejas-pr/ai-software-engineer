import * as React from "react"
import { listOrganizations, type Organization } from "@/api/organizations.api"
import { PageSkeleton } from "@/components/molecules/skeletons/page-skeleton"
import {
  readStorage,
  STORAGE_KEYS,
  writeStorage,
} from "@/lib/common/local-storage"
import { OrganizationContext } from "./organization-context"

function pick(organizations: Organization[], id: number | null) {
  return organizations.find((o) => o.id === id) ?? organizations[0] ?? null
}

/**
 * Loads the user's organizations once and keeps the selected one. Only
 * mounted for onboarded users (AppLayout), who always have at least one —
 * so children can rely on `current` being set.
 */
export function OrganizationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [organizations, setOrganizations] = React.useState<
    Organization[] | null
  >(null)
  const [currentId, setCurrentId] = React.useState<number | null>(() => {
    const stored = Number(readStorage(STORAGE_KEYS.organization))
    return Number.isInteger(stored) && stored > 0 ? stored : null
  })
  const [error, setError] = React.useState<unknown>(null)

  React.useEffect(() => {
    let cancelled = false
    listOrganizations()
      .then((list) => {
        if (!cancelled) setOrganizations(list)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const switchTo = React.useCallback((organizationId: number) => {
    writeStorage(STORAGE_KEYS.organization, String(organizationId))
    setCurrentId(organizationId)
  }, [])

  const refresh = React.useCallback(async () => {
    const list = await listOrganizations()
    setOrganizations(list)
    return list
  }, [])

  const current = organizations ? pick(organizations, currentId) : null

  const value = React.useMemo(
    () =>
      organizations && current
        ? { organizations, current, switchTo, refresh }
        : undefined,
    [organizations, current, switchTo, refresh]
  )

  // A failed load surfaces through the route error boundary
  if (error) throw error
  // Can't normally happen: a personal organization can't be deleted or left
  if (organizations?.length === 0) {
    throw new Error("You don't belong to any organization")
  }
  if (!value) return <PageSkeleton />

  return <OrganizationContext value={value}>{children}</OrganizationContext>
}
