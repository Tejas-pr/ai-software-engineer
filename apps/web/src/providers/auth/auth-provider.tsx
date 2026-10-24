import * as React from "react"
import axios from "axios"
import { AUTH_EXPIRED_EVENT } from "@/api/api"
import { logout } from "@/api/auth.api"
import { getUser, type User } from "@/api/user.api"
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
} from "./auth-context"

const ME_RETRIES = 3

// Auth lives in httpOnly cookies, so the client can't read a token: the
// only way to know "am I signed in" is to ask the server (/me).
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [status, setStatus] = React.useState<AuthStatus>("pending")

  const refresh = React.useCallback(async () => {
    try {
      const me = await getUser()
      setUser(me)
      setStatus("authenticated")
      return me
    } catch {
      setUser(null)
      setStatus("unauthenticated")
      return null
    }
  }, [])

  const signOut = React.useCallback(async () => {
    let ok = true
    try {
      await logout()
    } catch {
      // The cookies expire on their own; the UI signs out regardless
      ok = false
    }
    setUser(null)
    setStatus("unauthenticated")
    return ok
  }, [])

  // Who's here, once per page load. Only a 401 means "signed out": a rate
  // limit, a restarting API or a network blip is retried a few times
  // before giving up, so a hiccup never logs anyone out
  React.useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    const attempt = (n: number) => {
      getUser()
        .then((me) => {
          if (cancelled) return
          setUser(me)
          setStatus("authenticated")
        })
        .catch((err) => {
          if (cancelled) return
          const isSignedOut =
            axios.isAxiosError(err) && err.response?.status === 401
          if (!isSignedOut && n < ME_RETRIES) {
            timer = window.setTimeout(() => attempt(n + 1), 1500 * (n + 1))
            return
          }
          setUser(null)
          setStatus("unauthenticated")
        })
    }
    attempt(0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  // Any request that 401s after a failed refresh: the session is over
  React.useEffect(() => {
    const handleExpired = () => {
      setUser(null)
      setStatus("unauthenticated")
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired)
  }, [])

  const value: AuthContextValue = React.useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated",
      isPending: status === "pending",
      refresh,
      signOut,
    }),
    [user, status, refresh, signOut]
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
