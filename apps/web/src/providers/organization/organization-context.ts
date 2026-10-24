import { createContext } from "react"
import type { Organization } from "@/api/organizations.api"

export type OrganizationContextValue = {
  /** Every organization the user belongs to */
  organizations: Organization[]
  /** The one picked in the switcher (remembered per browser) */
  current: Organization
  switchTo: (organizationId: number) => void
  /** Re-reads the list (after create, rename, leave …); resolves to it */
  refresh: () => Promise<Organization[]>
}

export const OrganizationContext = createContext<
  OrganizationContextValue | undefined
>(undefined)
