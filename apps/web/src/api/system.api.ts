import { apiClient } from "./api"
import { API_ENDPOINTS } from "./endpoints"

export interface SystemConfig {
  restrict_clone_run_project: boolean
  environment: string
}

export async function getSystemConfig(): Promise<SystemConfig> {
  const res = await apiClient.get<SystemConfig>(API_ENDPOINTS.SYSTEM_CONFIG)
  return res.data
}
