import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Check, ChevronsUpDown, Plus, Settings } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { OrgAvatar } from "@/components/atoms/org-avatar"
import { CreateOrganizationPopup } from "@/components/molecules/organization/create-organization-popup"
import { useOrganization } from "@/hooks/organization/use-organization"
import { paths } from "@/lib/common/paths"

const ITEM = "cursor-pointer gap-2.5 rounded-lg px-2 py-1.5 text-[0.8125rem]"

/** Picks the organization everything in the app is scoped to */
export function OrgSwitcher() {
  const { organizations, current, switchTo, refresh } = useOrganization()
  const navigate = useNavigate()
  const [isCreating, setIsCreating] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          data-slot="org-switcher"
          className="group/org flex w-full cursor-pointer items-center gap-2.5 rounded-lg p-1.5 text-start transition-colors outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring/50 data-popup-open:bg-sidebar-accent"
        >
          <OrgAvatar name={current.name} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold">
              {current.name}
            </span>
            <span className="truncate text-2xs text-muted-foreground">
              {current.is_personal ? "Personal" : "Team"} · {current.role}
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="w-(--anchor-width) min-w-64 rounded-xl p-1.5"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 text-2xs tracking-[0.12em] text-muted-foreground uppercase">
              Organizations
            </DropdownMenuLabel>
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                className={ITEM}
                onClick={() => {
                  switchTo(org.id)
                  navigate(paths.dashboard)
                }}
              >
                <OrgAvatar name={org.name} className="size-6 text-2xs" />
                <span className="min-w-0 flex-1 truncate">{org.name}</span>
                {org.id === current.id && (
                  <Check className="size-4 text-link" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            className={ITEM}
            onClick={() => setIsCreating(true)}
          >
            <Plus className="size-4 text-muted-foreground" />
            Create organization
          </DropdownMenuItem>
          <DropdownMenuItem
            className={ITEM}
            onClick={() => navigate(paths.settings.organization)}
          >
            <Settings className="size-4 text-muted-foreground" />
            Organization settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateOrganizationPopup
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        onCreated={async (organization) => {
          setIsCreating(false)
          await refresh()
          switchTo(organization.id)
          navigate(paths.dashboard)
        }}
      />
    </>
  )
}
