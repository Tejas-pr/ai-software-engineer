import { apiClient } from "./api"
import { API_ENDPOINTS } from "./endpoints"

export interface User {
  id: number
  username: string
  email: string
  is_active: boolean
}

/** The signed-in user; rejects (401) when signed out */
export const getUser = async () => {
  const response = await apiClient.get<User>(API_ENDPOINTS.AUTH.ME)
  return response.data
}
