import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"
import { API_ENDPOINTS } from "./endpoints"

const rawBaseURL =
  import.meta.env.VITE_API_URL !== undefined
    ? import.meta.env.VITE_API_URL
    : "http://localhost:8000"

// On Cloudflare Pages (*.pages.dev), always use relative paths so API requests and auth cookies
// stay strictly first-party (avoiding Chrome's third-party cookie blocker).
// In local development (localhost), use rawBaseURL (http://localhost:8000).
export const baseURL =
  typeof window !== "undefined" && window.location.hostname.endsWith(".pages.dev")
    ? ""
    : rawBaseURL === "/"
      ? ""
      : rawBaseURL.replace(/\/+$/, "")

// Auth is entirely httpOnly cookies (access + refresh) set by the backend —
// no token ever touches localStorage or JS-readable state.
export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

/** Fired on window when the session is gone (refresh failed too) */
export const AUTH_EXPIRED_EVENT = "auth:expired"

// Response interceptor: on 401, try one silent refresh (via the refresh
// cookie) and retry the original request; if that fails, announce
// AUTH_EXPIRED_EVENT. AuthProvider clears the user and the guarded layout
// sends them to sign in, so public pages (the landing) can ask "who am I?"
// without being bounced. The refresh call itself is excluded to avoid an
// infinite loop.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }
    const isRefreshCall = originalRequest?.url?.includes(
      API_ENDPOINTS.AUTH.REFRESH
    )

    if (error.response?.status !== 401 || isRefreshCall) {
      return Promise.reject(error)
    }

    if (!originalRequest._retry) {
      originalRequest._retry = true
      try {
        await apiClient.post(API_ENDPOINTS.AUTH.REFRESH)
        return apiClient(originalRequest)
      } catch {
        // fall through to logout redirect below
      }
    }

    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    return Promise.reject(error)
  }
)
