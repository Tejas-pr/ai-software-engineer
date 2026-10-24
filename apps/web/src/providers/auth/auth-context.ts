import { createContext } from "react"
import type { User } from "@/api/user.api"

export type AuthStatus = "pending" | "authenticated" | "unauthenticated"

export type AuthContextValue = {
  /** The signed-in user, or null when signed out (or not known yet) */
  user: User | null
  status: AuthStatus
  isAuthenticated: boolean
  /** True until the first /me answer */
  isPending: boolean
  /** Asks the API again (after the GitHub callback set the cookies) */
  refresh: () => Promise<User | null>
  /**
   * Ends the session: the API clears the cookies, then the user is dropped
   * here even if that call failed, so the UI never shows a half-signed-out
   * state. Resolves false when the API call failed.
   */
  signOut: () => Promise<boolean>
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
)
