import {
  STORAGE_KEYS,
  readStorage,
  writeStorage,
} from "@/lib/common/local-storage"
import { searchRecentsSchema, type SearchItem } from "@/lib/search/types"

export const MAX_RECENTS = 5

/** The user's last picks, newest first; empty if missing or corrupted */
export function readSearchRecents(): SearchItem[] {
  try {
    const raw = readStorage(STORAGE_KEYS.searchRecents)
    if (!raw) return []
    const result = searchRecentsSchema.safeParse(JSON.parse(raw))
    return result.success ? result.data.slice(0, MAX_RECENTS) : []
  } catch (error) {
    console.warn("Ignoring unreadable search history", error)
    return []
  }
}

/** Put a pick first, keeping MAX_RECENTS items */
export function saveSearchRecent(item: SearchItem): SearchItem[] {
  const current = readSearchRecents()
  const recents = [item, ...current.filter((r) => r.id !== item.id)].slice(
    0,
    MAX_RECENTS
  )
  writeStorage(STORAGE_KEYS.searchRecents, JSON.stringify(recents))
  return recents
}
