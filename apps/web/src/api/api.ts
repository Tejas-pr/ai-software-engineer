import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"
import { API_ENDPOINTS } from "./endpoints"
import {
  removeLocalStorageItem,
  setLocalStorageItem,
} from "@/utils/localstorage"

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000"

export const apiClient = axios.create({
  baseURL,
  withCredentials: true, // Send cookies with requests
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => config,
  (error) => Promise.reject(error)
)

// Response interceptor to handle 401s and auto-refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    // If error is 401 and we haven't already retried
    // Skip retrying if the request was for auth endpoints like login or signup
    const authEndpoints = Object.values(API_ENDPOINTS.AUTH)
    const isAuthEndpoint =
      originalRequest.url &&
      authEndpoints.some((ep) => originalRequest.url!.includes(ep))

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true

      try {
        // Try to refresh the token via cookie
        const refreshResponse = await axios.post(
          `${baseURL}${API_ENDPOINTS.AUTH.REFRESH}`,
          {},
          {
            withCredentials: true,
          }
        )

        // Update localStorage with the latest permissions and user state returned by refresh
        if (refreshResponse.data && refreshResponse.data.user) {
          setLocalStorageItem("user", refreshResponse.data.user)
          const newRole =
            refreshResponse.data.user.is_superuser ||
            refreshResponse.data.user.is_marketplace_admin
              ? "admin"
              : "buyer"
          setLocalStorageItem("role", newRole)
        }

        // Retry the original request
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Refresh token is expired or invalid, log user out
        removeLocalStorageItem("user")
        removeLocalStorageItem("role")
        window.location.href = "/login"
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)
