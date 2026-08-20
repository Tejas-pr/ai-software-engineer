import { apiClient } from "./api"
import { API_ENDPOINTS } from "./endpoints"

export const getUser = async () => {
  try {
    const response = await apiClient.get(`${API_ENDPOINTS.AUTH.ME}`)
    return response.data
  } catch (error) {
    console.error("Failed to get user:", error)
    throw error
  }
}
