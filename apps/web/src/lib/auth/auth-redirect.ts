import {
  readStorage,
  STORAGE_KEYS,
  writeStorage,
} from "@/lib/common/local-storage"
import { paths } from "@/lib/common/paths"

/** Where a signed-in user goes when nothing asked for somewhere else */
export const SIGNED_IN_HOME = paths.dashboard

// Only paths inside this app: "/x" yes, "//evil.com" or "https://…" no
function isSafePath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith(paths.auth.signin) &&
    !value.startsWith(paths.auth.signout)
  )
}

/** The page a guarded route sent the user away from (router state.from) */
export function redirectFrom(state: unknown): string | null {
  const from = (state as { from?: unknown } | null)?.from
  return isSafePath(from) ? from : null
}

/**
 * GitHub sign-in is a full-page round trip, so router state doesn't survive
 * it: keep the destination in this tab's sessionStorage until the callback.
 */
export function rememberRedirect(to: string | null) {
  writeStorage(STORAGE_KEYS.afterSignin, isSafePath(to) ? to : null, "session")
}

/** The remembered destination, cleared once read */
export function takeRedirect(): string | null {
  const to = readStorage(STORAGE_KEYS.afterSignin, "session")
  writeStorage(STORAGE_KEYS.afterSignin, null, "session")
  return isSafePath(to) ? to : null
}
