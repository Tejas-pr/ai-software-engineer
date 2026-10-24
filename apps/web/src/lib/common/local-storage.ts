/**
 * The only place the app touches web storage: use these helpers, never
 * `localStorage` / `sessionStorage` directly.
 *
 * Storage can be blocked by privacy settings or full, so reads fall back to
 * null and writes report failure instead of throwing. Anything read back is
 * user-editable: validate it before trusting it.
 */
export const STORAGE_KEYS = {
  theme: "theme",
  /** Where to land after GitHub sign-in (sessionStorage, one tab) */
  afterSignin: "ase:after_signin",
  /** The organization picked in the switcher (its id) */
  organization: "ase:organization",
  /** Recents stored from the ⌘K command palette */
  searchRecents: "ase:search_recents",
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

type Area = "local" | "session"

const storage = (area: Area) =>
  area === "local" ? window.localStorage : window.sessionStorage

/** The stored string, or null when missing or storage is unavailable */
export function readStorage(key: StorageKey, area: Area = "local") {
  try {
    return storage(area).getItem(key)
  } catch {
    return null
  }
}

/** Saves `value` (null removes the key). False when storage refused it. */
export function writeStorage(
  key: StorageKey,
  value: string | null,
  area: Area = "local"
) {
  try {
    if (value === null) storage(area).removeItem(key)
    else storage(area).setItem(key, value)
    return true
  } catch {
    return false
  }
}

/** Calls `listener` when another tab changes `key`; returns the unsubscribe */
export function onStorageChange(
  key: StorageKey,
  listener: (value: string | null) => void
) {
  const handle = (event: StorageEvent) => {
    if (event.storageArea !== window.localStorage || event.key !== key) return
    listener(event.newValue)
  }
  window.addEventListener("storage", handle)
  return () => window.removeEventListener("storage", handle)
}
