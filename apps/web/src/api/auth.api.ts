import { apiClient, baseURL } from "./api"
import { API_ENDPOINTS } from "./endpoints"

export const logout = () => apiClient.post(API_ENDPOINTS.AUTH.LOGOUT)

/** A full-page navigation, not axios: the API redirects to GitHub and back */
export const githubLoginUrl = () =>
  `${baseURL}${API_ENDPOINTS.AUTH.GITHUB_LOGIN}`
