import {
  Activity,
  Bot,
  FolderGit2,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react"
import { paths } from "@/lib/common/paths"

export type AppSection =
  "overview" | "repositories" | "runs" | "agents" | "settings"

export interface AppNavItem {
  id: AppSection
  title: string
  to: string
  icon: LucideIcon
}

/** The sidebar's icon rail, top to bottom */
export const APP_NAV: AppNavItem[] = [
  {
    id: "overview",
    title: "Overview",
    to: paths.dashboard,
    icon: LayoutDashboard,
  },
  {
    id: "repositories",
    title: "Repositories",
    to: paths.projects.root,
    icon: FolderGit2,
  },
  { id: "runs", title: "Runs", to: paths.runs, icon: Activity },
  { id: "agents", title: "Agents", to: paths.dashboardAgents, icon: Bot },
  {
    id: "settings",
    title: "Settings",
    to: paths.settings.organization,
    icon: Settings,
  },
]

/** Which rail section a path belongs to */
export function sectionFor(pathname: string): AppSection {
  if (pathname.startsWith(paths.projects.root)) return "repositories"
  if (pathname.startsWith(paths.runs)) return "runs"
  if (pathname.startsWith(paths.dashboardAgents)) return "agents"
  if (
    pathname.startsWith(paths.settings.organization) ||
    pathname.startsWith(paths.account)
  )
    return "settings"
  return "overview"
}
