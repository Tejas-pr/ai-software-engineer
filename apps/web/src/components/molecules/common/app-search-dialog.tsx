import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  CommandDialog,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import { Kbd, KbdGroup } from "@workspace/ui/components/kbd"
import { cn } from "@workspace/ui/lib/utils"
import { useSearchItems } from "@/hooks/common/use-search-items"
import { useTheme } from "@/hooks/common/use-theme"
import { paths } from "@/lib/common/paths"
import { TONE_TILE, searchItemIcon } from "@/lib/search/search-icons"
import {
  readSearchRecents,
  saveSearchRecent,
} from "@/lib/search/search-recents"
import {
  SEARCH_GROUPS,
  type SearchCommand,
  type SearchItem,
} from "@/lib/search/types"

const QUICK_ACTIONS = 4
const SUGGESTED_PAGES = 6

export interface AppSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Sidebar toggle callback; if omitted, sidebar toggle action is hidden */
  onToggleSidebar?: () => void
}

/**
 * Global ⌘K command palette for AI Software Engineer.
 *
 * Search across actions, pages, connected repositories, and recent runs.
 * Spotlight-like frosted glass styling with semantic token icon tiles.
 */
export function AppSearchDialog({
  open,
  onOpenChange,
  onToggleSidebar,
}: AppSearchDialogProps) {
  const navigate = useNavigate()
  const { setTheme } = useTheme()
  const items = useSearchItems(open, {
    canToggleSidebar: Boolean(onToggleSidebar),
  })
  const [query, setQuery] = useState("")
  const [recents, setRecents] = useState(readSearchRecents)

  const runCommand = (command: SearchCommand) => {
    switch (command) {
      case "theme.light":
        return setTheme("light")
      case "theme.dark":
        return setTheme("dark")
      case "theme.system":
        return setTheme("system")
      case "sidebar.toggle":
        return onToggleSidebar?.()
      case "auth.signout":
        return navigate(paths.auth.signout)
      case "project.new":
        return navigate(`${paths.projects.root}?connect=1`)
      case "org.new":
        return navigate(paths.onboarding)
    }
  }

  const handleSelect = (item: SearchItem) => {
    setRecents(saveSearchRecent(item))
    onOpenChange(false)
    if ("command" in item) {
      runCommand(item.command)
    } else {
      navigate(item.path)
    }
  }

  const offered = new Set(items.map((item) => item.id))
  const shownRecents = recents.filter(
    (r) => (r.group !== "Actions" && r.group !== "Pages") || offered.has(r.id)
  )
  const notRecent = (item: SearchItem) =>
    !shownRecents.some((r) => r.id === item.id)

  const isSearching = query.trim().length > 0
  const groups = isSearching
    ? SEARCH_GROUPS.map((group) => ({
        heading: group,
        items: items.filter((item) => item.group === group),
      }))
    : [
        { heading: "Recent", items: shownRecents },
        {
          heading: "Quick actions",
          items: items
            .filter((i) => i.group === "Actions" && notRecent(i))
            .slice(0, QUICK_ACTIONS),
        },
        {
          heading: "Suggested",
          items: items
            .filter((i) => i.group === "Pages" && notRecent(i))
            .slice(0, SUGGESTED_PAGES),
        },
      ]

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      variant="glass"
      title="Search"
      description="Find a repository, run, page, or run an action"
    >
      <Command>
        <CommandInput
          placeholder="Search repositories, runs, pages, or type a command…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            Nothing found. Try &ldquo;dark mode&rdquo;, &ldquo;connect&rdquo;,
            or &ldquo;runs&rdquo;.
          </CommandEmpty>
          {groups
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <CommandGroup key={group.heading} heading={group.heading}>
                {group.items.map((item) => {
                  const { icon: Icon, tone } = searchItemIcon(item)
                  return (
                    <CommandItem
                      key={`${group.heading}:${item.id}`}
                      value={`${item.label} ${item.id}`}
                      keywords={[item.hint ?? "", item.label, ...item.keywords]}
                      onSelect={() => handleSelect(item)}
                    >
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-lg",
                          TONE_TILE[tone]
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <span className="truncate">{item.label}</span>
                      {item.hint && (
                        <span className="ms-auto truncate text-2xs text-muted-foreground group-data-selected/command-item:text-glass-selected-foreground/70">
                          {item.hint}
                        </span>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
        </CommandList>
        <div className="hidden items-center gap-4 border-t border-glass-border px-4 py-2 text-2xs text-muted-foreground sm:flex">
          <span className="flex items-center gap-1.5">
            <KbdGroup>
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
            </KbdGroup>
            to move
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd>
            to select
          </span>
          <span className="ms-auto flex items-center gap-1.5">
            <Kbd>esc</Kbd>
            to close
          </span>
        </div>
      </Command>
    </CommandDialog>
  )
}
