import { useMatches } from "react-router-dom"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { ThemeToggle } from "@/components/molecules/common/theme-toggle"
import { useOrganization } from "@/hooks/organization/use-organization"

/** A route's `handle: { title }` names it in the breadcrumb */
export type RouteHandle = { title?: string; transition?: boolean }

/** Top of the signed-in content area: sidebar toggle, breadcrumb, theme */
export function AppTopbar() {
  const { current } = useOrganization()
  const title = useMatches()
    .map((match) => (match.handle as RouteHandle | undefined)?.title)
    .filter(Boolean)
    .at(-1)

  return (
    <header
      data-slot="app-topbar"
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-xl backdrop-saturate-150 sm:px-4"
    >
      <SidebarTrigger className="-ms-1" />
      <Separator
        orientation="vertical"
        className="me-2 data-vertical:h-4 data-vertical:self-auto"
      />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap">
          <BreadcrumbItem className="hidden min-w-0 md:block">
            <span className="truncate">{current.name}</span>
          </BreadcrumbItem>
          {title && (
            <>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate">{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ms-auto">
        <ThemeToggle />
      </div>
    </header>
  )
}
