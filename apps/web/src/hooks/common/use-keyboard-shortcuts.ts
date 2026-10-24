import { useEffect, useLayoutEffect, useRef, useState } from "react"

export interface KeyboardShortcut {
  /** `KeyboardEvent.key`, compared case-insensitively ("a", "k", "escape") */
  key?: string
  /** `KeyboardEvent.code`, for keys Shift changes ("Digit1" for Shift+1) */
  code?: string
  /** Ctrl on Windows/Linux, ⌘ on macOS */
  mod?: boolean
  shift?: boolean
  /** Allow triggering even when focused on an input or textarea (e.g. ⌘K) */
  allowInInput?: boolean
  /** Allow triggering even when a dialog is currently open */
  allowInDialog?: boolean
  run: (event: KeyboardEvent) => void
}

function isBusy(
  event: KeyboardEvent,
  options?: { allowInInput?: boolean; allowInDialog?: boolean }
): boolean {
  const target = event.target
  if (!(target instanceof HTMLElement)) return false

  if (!options?.allowInInput) {
    if (target.isContentEditable) return true
    if (target.closest("input, textarea, select, [role='combobox']"))
      return true
  }

  if (!options?.allowInDialog) {
    if (
      document.querySelector("[role='dialog'], [role='alertdialog']") !== null
    ) {
      return true
    }
  }

  return false
}

function matches(shortcut: KeyboardShortcut, event: KeyboardEvent): boolean {
  const keyMatches =
    shortcut.code !== undefined
      ? shortcut.code === event.code
      : shortcut.key?.toLowerCase() === event.key.toLowerCase()
  return (
    keyMatches &&
    Boolean(shortcut.mod) === (event.ctrlKey || event.metaKey) &&
    (shortcut.shift === undefined || shortcut.shift === event.shiftKey) &&
    !event.altKey
  )
}

/**
 * Page-wide keyboard shortcuts while the component is mounted. The first
 * matching shortcut runs and the browser's own action is prevented.
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const latest = useRef(shortcuts)
  useLayoutEffect(() => {
    latest.current = shortcuts
  })
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const shortcut = latest.current.find(
        (item) =>
          matches(item, event) &&
          !isBusy(event, {
            allowInInput: item.allowInInput,
            allowInDialog: item.allowInDialog,
          })
      )
      if (!shortcut) return
      event.preventDefault()
      shortcut.run(event)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])
}

/** Whether a key is held down right now */
export function useKeyHeld(key: string): boolean {
  const [held, setHeld] = useState(false)

  useEffect(() => {
    const handleDown = (event: KeyboardEvent) => {
      if (event.key === key && !isBusy(event)) {
        event.preventDefault()
        setHeld(true)
      }
    }
    const handleUp = (event: KeyboardEvent) => {
      if (event.key === key) setHeld(false)
    }
    const handleBlur = () => setHeld(false)
    window.addEventListener("keydown", handleDown)
    window.addEventListener("keyup", handleUp)
    window.addEventListener("blur", handleBlur)
    return () => {
      window.removeEventListener("keydown", handleDown)
      window.removeEventListener("keyup", handleUp)
      window.removeEventListener("blur", handleBlur)
    }
  }, [key])

  return held
}

/** How the modifier key is written on this device */
export const MOD_KEY =
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad/i.test(navigator.userAgent)
    ? "⌘"
    : "Ctrl"
