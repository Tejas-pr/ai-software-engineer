import { paths } from "@/lib/common/paths"
import type { Theme, ResolvedTheme } from "@/providers/theme/theme-context"
import type { SearchCommand, SearchItem } from "@/lib/search/types"

export interface ActionContext {
  theme: Theme
  resolvedTheme: ResolvedTheme
  canToggleSidebar: boolean
}

const THEMES: {
  theme: Theme
  command: SearchCommand
  label: string
  keywords: string[]
}[] = [
  {
    theme: "dark",
    command: "theme.dark",
    label: "Switch to dark mode",
    keywords: ["dark mode", "night", "appearance", "theme"],
  },
  {
    theme: "light",
    command: "theme.light",
    label: "Switch to light mode",
    keywords: ["light mode", "white", "day", "appearance", "theme"],
  },
  {
    theme: "system",
    command: "theme.system",
    label: "Use system theme",
    keywords: ["auto", "device", "appearance", "theme"],
  },
]

const run = (
  command: SearchCommand,
  label: string,
  keywords: string[]
): SearchItem => ({
  id: `Actions:${command}`,
  group: "Actions",
  label,
  command,
  keywords,
})

const open = (
  key: string,
  label: string,
  path: string,
  keywords: string[]
): SearchItem => ({
  id: `Actions:${key}`,
  group: "Actions",
  label,
  path,
  keywords,
})

/**
 * Commands and quick actions available from the ⌘K command palette.
 */
export function actionItems({
  theme,
  resolvedTheme,
  canToggleSidebar,
}: ActionContext): SearchItem[] {
  return [
    ...THEMES.filter((t) =>
      t.theme === "system" ? theme !== "system" : t.theme !== resolvedTheme
    ).map((t) => run(t.command, t.label, t.keywords)),
    open(
      "new-project",
      "Connect a repository",
      `${paths.projects.root}?connect=1`,
      ["add repo", "import github", "git", "new repository"]
    ),
    open("api-keys", "Manage API keys", paths.settings.apiKeys, [
      "keys",
      "gemini",
      "anthropic",
      "claude",
      "openai",
      "tokens",
    ]),
    open("resources", "Hardware & resource limits", paths.settings.resources, [
      "hardware",
      "resources",
      "cpu",
      "gpu",
      "vram",
      "threads",
      "ollama",
      "tokens",
      "storage",
      "prune",
    ]),
    open("profile", "Edit profile", paths.account, [
      "account",
      "github",
      "user",
      "name",
    ]),
    ...(canToggleSidebar
      ? [
          run("sidebar.toggle", "Toggle sidebar", [
            "collapse sidebar",
            "expand sidebar",
            "menu",
            "navigation",
          ]),
        ]
      : []),
    run("auth.signout", "Sign out", ["log out", "logout", "exit"]),
  ]
}
