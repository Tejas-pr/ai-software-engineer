import {
  Bot,
  FolderGit2,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Monitor,
  Moon,
  PanelLeft,
  Play,
  Settings,
  Sun,
  UserRound,
  Users,
  Zap,
  FileCode2,
  type LucideIcon,
} from "lucide-react"
import { paths } from "@/lib/common/paths"
import type { SearchGroup, SearchItem } from "@/lib/search/types"

export type SearchTone =
  "amber" | "violet" | "blue" | "green" | "rose" | "cyan" | "slate"

export interface SearchIcon {
  icon: LucideIcon
  tone: SearchTone
}

/** Semantic token styling for icon tiles */
export const TONE_TILE: Record<SearchTone, string> = {
  amber: "bg-primary/15 text-primary",
  violet: "bg-highlight/15 text-highlight",
  blue: "bg-link/15 text-link",
  green: "bg-run-completed/15 text-run-completed",
  rose: "bg-destructive/15 text-destructive",
  cyan: "bg-link/15 text-link",
  slate: "bg-muted text-muted-foreground",
}

export const ACTION_ICONS: Record<string, SearchIcon> = {
  "Actions:theme.dark": { icon: Moon, tone: "violet" },
  "Actions:theme.light": { icon: Sun, tone: "amber" },
  "Actions:theme.system": { icon: Monitor, tone: "slate" },
  "Actions:sidebar.toggle": { icon: PanelLeft, tone: "slate" },
  "Actions:auth.signout": { icon: LogOut, tone: "rose" },
  "Actions:project.new": { icon: FolderGit2, tone: "amber" },
  "Actions:org.new": { icon: Users, tone: "blue" },
}

export const PAGE_ICONS: Record<string, SearchIcon> = {
  [paths.dashboard]: { icon: LayoutDashboard, tone: "blue" },
  [paths.projects.root]: { icon: FolderGit2, tone: "amber" },
  [paths.runs]: { icon: Play, tone: "green" },
  [paths.dashboardAgents]: { icon: Bot, tone: "violet" },
  [paths.settings.organization]: { icon: Settings, tone: "slate" },
  [paths.settings.members]: { icon: Users, tone: "blue" },
  [paths.settings.apiKeys]: { icon: KeyRound, tone: "amber" },
  [paths.account]: { icon: UserRound, tone: "violet" },
  [paths.agents]: { icon: Bot, tone: "violet" },
  [paths.setup]: { icon: Settings, tone: "slate" },
}

const GROUP_ICONS: Record<SearchGroup, SearchIcon> = {
  Actions: { icon: Zap, tone: "amber" },
  Pages: { icon: FileCode2, tone: "slate" },
  Repositories: { icon: FolderGit2, tone: "amber" },
  Runs: { icon: Play, tone: "green" },
}

/** Return an item's icon and tone */
export function searchItemIcon(item: SearchItem): SearchIcon {
  const page =
    item.group === "Pages" && "path" in item ? PAGE_ICONS[item.path] : undefined
  return ACTION_ICONS[item.id] ?? page ?? GROUP_ICONS[item.group]
}
