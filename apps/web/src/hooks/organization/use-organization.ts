import { use } from "react"
import { OrganizationContext } from "@/providers/organization/organization-context"

export function useOrganization() {
  const context = use(OrganizationContext)

  if (context === undefined) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider"
    )
  }

  return context
}
