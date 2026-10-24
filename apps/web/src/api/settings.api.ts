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
