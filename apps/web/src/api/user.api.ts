import { apiClient } from "./api"
import { API_ENDPOINTS } from "./endpoints"

export interface User {
  id: number
  username: string
  email: string
  is_active: boolean
  display_name: string | null
  avatar_url: string | null
  /** null until onboarding is finished (organization + a model to run on) */
  onboarded_at: string | null
}

/** The signed-in user; rejects (401) when signed out */
export const getUser = async () => {
  const response = await apiClient.get<User>(API_ENDPOINTS.AUTH.ME)
  return response.data
}
