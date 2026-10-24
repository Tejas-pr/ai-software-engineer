import { createContext } from "react"

export type Theme = "dark" | "light" | "system"
export type ResolvedTheme = "dark" | "light"

/** Where the switch starts on screen (the toggle's center), in px */
export type ThemeOrigin = { x: number; y: number }

export type ThemeContextValue = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme, origin?: ThemeOrigin) => void
  toggleTheme: (origin?: ThemeOrigin) => void
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined
)
