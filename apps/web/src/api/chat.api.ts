import { apiClient, baseURL } from "./api"
import { API_ENDPOINTS } from "./endpoints"

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface ChatRequest {
  model: string
  messages: ChatMessage[]
  system_instruction?: string
  temperature?: number
}

export interface ChatResponse {
  response: string
}

export async function sendChatMessage(
  data: ChatRequest
): Promise<ChatResponse> {
  const res = await apiClient.post<ChatResponse>(API_ENDPOINTS.CHAT, data)
  return res.data
}

export async function sendChatMessageStream(
  data: ChatRequest
): Promise<Response> {
  const url = `${baseURL}${API_ENDPOINTS.CHAT_STREAM}`
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    credentials: "include",
  })
}
