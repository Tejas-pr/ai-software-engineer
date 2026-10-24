import * as React from "react"
import { flushSync } from "react-dom"
import {
  onStorageChange,
  readStorage,
  STORAGE_KEYS,
  writeStorage,
} from "@/lib/common/local-storage"
import {
  ThemeContext,
  type ResolvedTheme,
  type Theme,
  type ThemeOrigin,
} from "@/providers/theme/theme-context"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  disableTransitionOnChange?: boolean
}

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)"
const THEME_VALUES: Theme[] = ["dark", "light", "system"]

function isTheme(value: string | null): value is Theme {
  return value !== null && THEME_VALUES.includes(value as Theme)
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(COLOR_SCHEME_QUERY).matches ? "dark" : "light"
}

function resolve(theme: Theme): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme
}

function subscribeToSystemTheme(onChange: () => void) {
  const mediaQuery = window.matchMedia(COLOR_SCHEME_QUERY)
  mediaQuery.addEventListener("change", onChange)
  return () => mediaQuery.removeEventListener("change", onChange)
}

function disableTransitionsTemporarily() {
  const style = document.createElement("style")
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;transition:none!important}"
    )
  )
  document.head.appendChild(style)

  return () => {
    window.getComputedStyle(document.body)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        style.remove()
      })
    })
  }
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return (
    target.closest("input, textarea, select, [contenteditable='true']") !== null
  )
}

// Theme switch: an amber text caret pops up where the user clicked, blinks
// once, then "selects" its line (the new theme sweeps across at the caret's
// height) and "selects all" (it grows to fill the screen). Then the caret
// fades away.
const CARET_WIDTH = 10
const CARET_HEIGHT = 22
const POP_MS = 200
const BLINK_MS = 300
const SPREAD_MS = 760
// Share of SPREAD_MS spent sweeping across before growing down and up
const SWEEP_SHARE = 0.4
const FADE_MS = 220
// Above everything, dialogs included, while it plays
const TOP_LAYER = "2147483647"

let isSwitching = false

function createCaret({ x, y }: ThemeOrigin) {
  const caret = document.createElement("div")
  caret.setAttribute("aria-hidden", "true")
  Object.assign(caret.style, {
    position: "fixed",
    left: `${x - CARET_WIDTH / 2}px`,
    top: `${y - CARET_HEIGHT / 2}px`,
    width: `${CARET_WIDTH}px`,
    height: `${CARET_HEIGHT}px`,
    borderRadius: "2px",
    background: "var(--brand-amber)",
    boxShadow: "0 0 0 1px oklch(0 0 0 / 8%), 0 0 24px var(--brand-amber)",
    transformOrigin: "50% 100%",
    zIndex: TOP_LAYER,
    pointerEvents: "none",
  })
  document.body.append(caret)
  return caret
}

/** The new theme growing out of the caret: across its line, then everywhere */
function spreadFromCaret(caret: HTMLElement) {
  const r = caret.getBoundingClientRect()
  const top = r.top
  const right = window.innerWidth - r.right
  const bottom = window.innerHeight - r.bottom
  const left = r.left
  return document.documentElement.animate(
    [
      {
        clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round 2px)`,
        easing: "cubic-bezier(0.7, 0, 0.3, 1)",
      },
      {
        clipPath: `inset(${top}px 0px ${bottom}px 0px round 0px)`,
        offset: SWEEP_SHARE,
        easing: "cubic-bezier(0.65, 0, 0.25, 1)",
      },
      { clipPath: "inset(0px 0px 0px 0px round 0px)" },
    ],
    {
      duration: SPREAD_MS,
      pseudoElement: "::view-transition-new(root)",
    }
  )
}

/**
 * Runs `change` (which must update the DOM synchronously) as the caret
 * animation. The caret looks the same in both themes, so it shows in the
 * before and after snapshots alike. Without view transitions the theme
 * changes at once behind the caret; with reduced motion, instantly.
 */
async function caretThemeChange(change: () => void, origin?: ThemeOrigin) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    change()
    return
  }
  isSwitching = true
  const caret = createCaret(
    origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  )
  let changed = false
  const changeOnce = () => {
    if (changed) return
    changed = true
    change()
  }
  try {
    await caret.animate(
      [
        { transform: "scaleY(0)" },
        { transform: "scaleY(1.18)", offset: 0.7 },
        { transform: "scaleY(1)" },
      ],
      { duration: POP_MS, easing: "ease-out", fill: "forwards" }
    ).finished
    // One hard blink, like a real terminal caret
    await caret.animate([{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }], {
      duration: BLINK_MS,
      easing: "steps(1, end)",
    }).finished
    if ("startViewTransition" in document) {
      const transition = document.startViewTransition(changeOnce)
      await transition.ready
      await spreadFromCaret(caret).finished
    } else {
      changeOnce()
    }
    await caret.animate(
      [
        { opacity: 1, transform: "scaleY(1)" },
        { opacity: 0, transform: "scaleY(0.3)" },
      ],
      { duration: FADE_MS, easing: "ease-in", fill: "forwards" }
    ).finished
  } catch (error: unknown) {
    // Interrupted: the theme still changes
    console.warn("Theme animation interrupted", error)
    changeOnce()
  } finally {
    caret.remove()
    isSwitching = false
  }
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  disableTransitionOnChange = true,
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    const storedTheme = readStorage(STORAGE_KEYS.theme)
    return isTheme(storedTheme) ? storedTheme : defaultTheme
  })
  // The OS setting, live: "system" follows it without an effect
  const systemTheme = React.useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemTheme,
    () => "light" as const
  )
  const resolvedTheme: ResolvedTheme = theme === "system" ? systemTheme : theme

  // DOM only: the class on <html> that the CSS tokens key off
  const applyTheme = React.useCallback(
    (resolved: ResolvedTheme) => {
      const root = document.documentElement
      if (root.classList.contains(resolved)) return
      const restoreTransitions = disableTransitionOnChange
        ? disableTransitionsTemporarily()
        : null

      root.classList.remove("light", "dark")
      root.classList.add(resolved)

      restoreTransitions?.()
    },
    [disableTransitionOnChange]
  )

  const setTheme = React.useCallback(
    (nextTheme: Theme, origin?: ThemeOrigin) => {
      // A switch already playing finishes first
      if (isSwitching) return
      writeStorage(STORAGE_KEYS.theme, nextTheme)
      if (resolve(nextTheme) === resolve(theme)) {
        setThemeState(nextTheme)
        return
      }
      void caretThemeChange(() => {
        // Change the page while the caret covers it, not in a later effect
        flushSync(() => setThemeState(nextTheme))
        applyTheme(resolve(nextTheme))
      }, origin)
    },
    [applyTheme, theme]
  )

  const toggleTheme = React.useCallback(
    (origin?: ThemeOrigin) => {
      const current = document.documentElement.classList.contains("dark")
        ? "dark"
        : "light"
      setTheme(current === "dark" ? "light" : "dark", origin)
    },
    [setTheme]
  )

  React.useEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme, applyTheme])

  // "D" anywhere outside a text field flips the theme
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      if (isEditableTarget(event.target)) return
      if (event.key.toLowerCase() !== "d") return
      toggleTheme()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleTheme])

  // Another tab changed the theme
  React.useEffect(
    () =>
      onStorageChange(STORAGE_KEYS.theme, (value) => {
        setThemeState(isTheme(value) ? value : defaultTheme)
      }),
    [defaultTheme]
  )

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  )

  return (
    <ThemeContext {...props} value={value}>
      {children}
    </ThemeContext>
  )
}
