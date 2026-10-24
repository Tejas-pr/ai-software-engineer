import { apiClient } from "./api"
import { API_ENDPOINTS } from "./endpoints"

const BASE = API_ENDPOINTS.SETTINGS

export interface ApiKeyStatus {
  provider: string
  configured: boolean
  masked_key: string | null
  updated_at: string | null
}

export interface LocalModel {
  id: string
  size_gb: number | null
  parameter_size: string | null
  family: string | null
}

export interface AvailableModels {
  user_providers: string[]
  platform_providers: string[]
  // Ollama models actually installed on this machine right now (queried
  // live — see app/services/ollama.py), not a hardcoded list.
  local_models: LocalModel[]
  // Whichever installed local model is the best fit for the Coder step,
  // or null if none are installed / Ollama isn't reachable.
  recommended_coding_model: string | null
  /** Ollama answered and has tool-capable models installed (local_models
   * may otherwise be the server's static fallback list) */
  ollama_available: boolean
}

export const PROVIDERS = [
  {
    id: "gemini",
    label: "Google Gemini",
    keyUrl: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "claude",
    label: "Anthropic Claude",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "gpt",
    label: "OpenAI GPT",
    keyUrl: "https://platform.openai.com/api-keys",
  },
] as const

export async function listApiKeys(): Promise<ApiKeyStatus[]> {
  const res = await apiClient.get<ApiKeyStatus[]>(`${BASE}/api-keys`)
  return res.data
}

export async function getAvailableModels(): Promise<AvailableModels> {
  const res = await apiClient.get<AvailableModels>(`${BASE}/available-models`)
  return res.data
}

export async function setApiKey(
  provider: string,
  apiKey: string
): Promise<ApiKeyStatus> {
  const res = await apiClient.put<ApiKeyStatus>(
    `${BASE}/api-keys/${provider}`,
    {
      api_key: apiKey,
    }
  )
  return res.data
}

export async function deleteApiKey(provider: string): Promise<void> {
  await apiClient.delete(`${BASE}/api-keys/${provider}`)
}

export interface SystemTelemetry {
  cpu_count: number
  platform: string
  arch: string
  accelerator: "metal" | "cuda" | "rocm" | "none"
  accelerator_name: string
  memory: {
    total_gb: number
    available_gb: number
    percent_used: number
  } | null
  disk: {
    total_gb: number
    used_gb: number
    free_gb: number
    percent_used: number
  }
  workspaces_used_bytes: number
  workspaces_used_mb: number
}

export interface OllamaLoadedModel {
  name: string
  model: string
  size: number
  size_vram: number
  expires_at?: string
}

export interface OllamaHardwareInfo {
  available: boolean
  host: string
  version: string | null
  loaded_models: OllamaLoadedModel[]
  error: string | null
}

export interface ResourceLimitsPayload {
  ollama_num_gpu: number
  ollama_num_thread: number
  ollama_vram_budget_gb: number
  ollama_keep_alive: string
  max_context_window: number
  max_tokens_per_run: number
  max_run_timeout_seconds: number
  max_concurrent_runs: number
  workspace_storage_limit_gb: number
  auto_prune_workspaces: boolean
}

export interface ResourceSettingsResponse {
  telemetry: SystemTelemetry
  ollama: OllamaHardwareInfo
  limits: ResourceLimitsPayload
}

export interface PruneStorageResponse {
  pruned_runs_count: number
  reclaimed_bytes: number
  reclaimed_mb: number
  workspaces_remaining_mb: number
}

export async function getResourceSettings(): Promise<ResourceSettingsResponse> {
  const res = await apiClient.get<ResourceSettingsResponse>(`${BASE}/resources`)
  return res.data
}

export async function updateResourceSettings(
  payload: ResourceLimitsPayload
): Promise<ResourceLimitsPayload> {
  const res = await apiClient.put<ResourceLimitsPayload>(
    `${BASE}/resources`,
    payload
  )
  return res.data
}

export async function pruneStorageCache(): Promise<PruneStorageResponse> {
  const res = await apiClient.post<PruneStorageResponse>(
    `${BASE}/resources/prune-cache`
  )
  return res.data
}
