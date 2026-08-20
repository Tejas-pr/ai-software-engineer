import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getUser } from "@/api/user.api"

/**
 * Auth lives in an httpOnly cookie, so the client can't just read a token —
 * the only way to know "am I logged in" is to ask the server. Use this on
 * public-only pages (login/signup) to bounce an already-authed user to `to`.
 * Protected pages don't need this: they call the API directly and the
 * central 401 handler in api.ts already redirects to /login on failure.
 */
export function useRedirectIfAuthed(to: string) {
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    getUser()
      .then(() => {
        if (!cancelled) navigate(to)
      })
      .catch(() => {
        // not logged in — stay on the page
      })
    return () => {
      cancelled = true
    }
  }, [navigate, to])
}
