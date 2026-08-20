import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"
import { API_ENDPOINTS } from "./endpoints"

export const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000"

// Auth is entirely httpOnly cookies (access + refresh) set by the backend —
// no token ever touches localStorage or JS-readable state.
export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

// Response interceptor: on 401, try one silent refresh (via the refresh
// cookie) and retry the original request; if that fails, send the user to
// /login. The refresh call itself is excluded to avoid an infinite loop.
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

    if (window.location.pathname !== "/login") {
      window.location.href = "/login"
    }
    return Promise.reject(error)
  }
)
