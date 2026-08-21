import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { getUser } from "@/api/user.api"
import { logout } from "@/api/auth.api"
import { sendChatMessageStream, type ChatMessage } from "@/api/chat.api"

interface User {
  id: number
  username: string
  email: string
  is_active: boolean
}

const AVAILABLE_MODELS = [
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash (Cloud)" },
  { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash (Cloud)" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Cloud)" },
  { id: "qwen2.5-coder:7b", name: "Qwen 2.5 Coder 7B (Local)" },
  { id: "deepseek-r1:8b", name: "DeepSeek R1 8B (Local)" },
  { id: "deepseek-r1:14b", name: "DeepSeek R1 14B (Local)" },
]

function parseMessageContent(content: string) {
  const thinkStart = content.indexOf("<think>")
  const thinkEnd = content.indexOf("</think>")

  if (thinkStart !== -1) {
    if (thinkEnd !== -1) {
      // Both start and end found
      const thinking = content.substring(thinkStart + 7, thinkEnd).trim()
      const answer = content.substring(thinkEnd + 8).trim()
      return { thinking, answer, isThinking: false }
    } else {
      // Start found, but still thinking
      const thinking = content.substring(thinkStart + 7).trim()
      return { thinking, answer: "", isThinking: true }
    }
  }

  // No thinking block found
  return { thinking: "", answer: content, isThinking: false }
}

export function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  // Chat Console state variables
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [chatErrorMsg, setChatErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    getUser()
      .then((res) => {
        setUser(res)
        setLoading(false)
      })
      .catch((err) => {
        // 401s are handled centrally by the api client (refresh-or-redirect
        // to /login) — just surface anything else here.
        if (err.response?.status !== 401) {
          setError(err.message || "Failed to load user session")
        }
        setLoading(false)
      })
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // best-effort — the cookies will simply expire on their own otherwise
    }
    navigate("/login", { state: { loggedOut: true } })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim()) return

    const userMsg: ChatMessage = { role: "user", content: inputMessage }
    const updatedMessages = [...messages, userMsg]

    setMessages(updatedMessages)
    setInputMessage("")
    setChatLoading(true)
    setChatErrorMsg(null)

    const assistantMsgIndex = updatedMessages.length
    let accumulatedResponse = ""

    try {
      const response = await sendChatMessageStream({
        model: selectedModel,
        messages: updatedMessages,
        system_instruction: systemPrompt.trim() || undefined,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          errorText || `Failed to start stream with status ${response.status}`
        )
      }

      if (!response.body) {
        throw new Error("No response body received for streaming")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      setMessages([...updatedMessages, { role: "assistant", content: "" }])

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        accumulatedResponse += chunk
        setChatLoading(false) // Stop spinner once real content actually arrives

        setMessages((prev) => {
          const newMessages = [...prev]
          if (newMessages[assistantMsgIndex]) {
            newMessages[assistantMsgIndex] = {
              role: "assistant",
              content: accumulatedResponse,
            }
          }
          return newMessages
        })
      }

      // Only inspect the error marker once the stream has fully closed —
      // checking mid-stream can catch the marker before its message text
      // has arrived in a later chunk, producing a blank error.
      const errorMatch = accumulatedResponse.match(
        /\n?\[STREAM_ERROR: ([\s\S]*)\]\s*$/
      )
      if (errorMatch) {
        setChatErrorMsg(errorMatch[1])
        const cleanContent = accumulatedResponse
          .slice(0, errorMatch.index)
          .trimEnd()
        setMessages((prev) => {
          const newMessages = [...prev]
          if (newMessages[assistantMsgIndex]) {
            newMessages[assistantMsgIndex] = {
              role: "assistant",
              content: cleanContent,
            }
          }
          return newMessages
        })
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to get AI response"
      setChatErrorMsg(message)
      setChatLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="animate-pulse text-sm font-medium text-muted-foreground">
            Loading workspace...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* Navigation Bar */}
        <header className="mb-12 flex items-center justify-between border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="m18 16 4-4-4-4" />
                <path d="m6 8-4 4 4 4" />
                <path d="m14.5 4-5 16" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">
              AI SWE Workspace
            </span>
          </div>

          <Button
            variant="outline"
            onClick={handleLogout}
            className="rounded-lg"
          >
            Logout
          </Button>
        </header>

        {/* Dashboard Content */}
        <main className="grid gap-8 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            <div className="rounded-lg border border-border bg-card p-8 text-card-foreground shadow-sm">
              <h2 className="mb-2 text-2xl font-bold tracking-tight">
                Project ready!
              </h2>
              <p className="mb-6 leading-relaxed text-muted-foreground">
                Your AI Software Engineer application dashboard is fully
                configured. You can now build workflows, integrate tools, and
                manage deployments.
              </p>
              <div className="flex gap-4">
                <Button className="rounded-lg">Launch Console</Button>
                <Button variant="outline" className="rounded-lg">
                  View Docs
                </Button>
              </div>
            </div>

            {/* LLM Chat Playground */}
            <div className="space-y-4 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-bold tracking-tight">
                  LLM Playground
                </h3>
                <p className="text-xs text-muted-foreground">
                  Direct communication with configured cloud and local LLM
                  models (Phase 2).
                </p>
              </div>

              {/* Model and System Prompt Settings */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Target Model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full cursor-pointer rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    {AVAILABLE_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    System Instructions (Optional)
                  </label>
                  <Input
                    placeholder="e.g. You are a Senior DevOps Engineer..."
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="rounded-lg"
                  />
                </div>
              </div>

              {/* Messages Panel */}
              <div className="h-[300px] space-y-4 overflow-y-auto rounded-lg border border-border bg-muted/30 p-4">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Start a conversation with{" "}
                    {AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.name}
                    ...
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isUser = msg.role === "user"
                    const { thinking, answer, isThinking } =
                      parseMessageContent(msg.content)

                    return (
                      <div
                        key={index}
                        className={`flex flex-col ${
                          isUser ? "items-end" : "items-start"
                        }`}
                      >
                        <div className="mb-1 font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                          {isUser ? "You" : "AI"}
                        </div>

                        {isUser ? (
                          <div className="max-w-[85%] rounded-lg bg-primary px-4 py-2 text-sm font-medium whitespace-pre-wrap text-primary-foreground">
                            {msg.content}
                          </div>
                        ) : (
                          <div className="w-full max-w-[85%] space-y-2">
                            {/* Thinking Block */}
                            {thinking && (
                              <div className="w-full space-y-1.5 rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-muted-foreground shadow-sm">
                                <div className="flex items-center gap-1.5 font-semibold text-muted-foreground/80">
                                  <span className="relative flex h-2 w-2">
                                    {isThinking && (
                                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75"></span>
                                    )}
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary/80"></span>
                                  </span>
                                  <span>
                                    {isThinking
                                      ? "Thinking..."
                                      : "Thought Process"}
                                  </span>
                                </div>
                                <div className="border-l-2 border-primary/20 pl-3 leading-relaxed whitespace-pre-wrap text-muted-foreground/90">
                                  {thinking}
                                </div>
                              </div>
                            )}

                            {/* Answer Block */}
                            {(answer || (!thinking && !isThinking)) && (
                              <div className="w-full rounded-lg border border-border bg-card px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap text-foreground shadow-sm">
                                {answer || msg.content}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
                {chatLoading && (
                  <div className="flex animate-pulse items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground delay-75" />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground delay-150" />
                    <span>AI is thinking...</span>
                  </div>
                )}
                {chatErrorMsg && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                    Error: {chatErrorMsg}
                  </div>
                )}
              </div>

              {/* Message Input Form */}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={`Send a message to ${selectedModel}...`}
                  disabled={chatLoading}
                  className="flex-1 rounded-lg"
                />
                <Button
                  type="submit"
                  disabled={chatLoading || !inputMessage.trim()}
                  className="rounded-lg px-6 font-semibold"
                >
                  Send
                </Button>
                {messages.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setMessages([])
                      setChatErrorMsg(null)
                    }}
                    className="rounded-lg"
                  >
                    Clear
                  </Button>
                )}
              </form>
            </div>
          </div>

          {/* User Profile Card */}
          <div className="space-y-6">
            {error ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
                Error: {error}
              </div>
            ) : (
              user && (
                <div className="space-y-4 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
                  <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                    User Session
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                      <span className="text-lg font-bold">
                        {(user.username || "?").substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold">{user.username}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 border-t border-border pt-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">User ID:</span>
                      <span className="font-mono text-muted-foreground">
                        {user.id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-semibold text-primary">
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
