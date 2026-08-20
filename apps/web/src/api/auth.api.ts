import { apiClient } from "./api"
import { API_ENDPOINTS } from "./endpoints"

export const logout = () => apiClient.post(API_ENDPOINTS.AUTH.LOGOUT)
