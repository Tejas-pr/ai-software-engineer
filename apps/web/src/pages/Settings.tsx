import { useEffect, useState } from "react"
import axios from "axios"
import { Link } from "react-router-dom"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  deleteApiKey,
  listApiKeys,
  setApiKey,
  type ApiKeyStatus,
} from "@/api/settings.api"

const PROVIDER_LABELS: Record<string, string> = {
  gemini: "Google Gemini",
  claude: "Anthropic Claude",
  gpt: "OpenAI GPT",
}

function describeError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return (
      (err.response?.data as { detail?: string } | undefined)?.detail ||
      fallback
    )
  }
  return fallback
}

export function SettingsPage() {
  const [keys, setKeys] = useState<ApiKeyStatus[]>([])
  const [keysLoading, setKeysLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busyProvider, setBusyProvider] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = () => {
    setKeysLoading(true)
    return listApiKeys()
      .then(setKeys)
      .catch(() => {})
      .finally(() => setKeysLoading(false))
  }

  useEffect(() => {
    listApiKeys()
      .then(setKeys)
      .catch(() => {})
      .finally(() => setKeysLoading(false))
  }, [])

  const handleSave = async (provider: string) => {
    const value = drafts[provider]?.trim()
    if (!value) return
    setBusyProvider(provider)
    setError(null)
    try {
      await setApiKey(provider, value)
      setDrafts((prev) => ({ ...prev, [provider]: "" }))
      refresh()
    } catch (err) {
      setError(describeError(err, "Couldn't save that key. Try again."))
    } finally {
      setBusyProvider(null)
    }
  }

  const handleRemove = async (provider: string) => {
    setBusyProvider(provider)
    setError(null)
    try {
      await deleteApiKey(provider)
      refresh()
    } catch (err) {
      setError(describeError(err, "Couldn't remove that key. Try again."))
    } finally {
      setBusyProvider(null)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-10 flex items-center justify-between border-b border-border pb-6">
          <div>
            <Link
              to="/"
              className="text-xs text-muted-foreground hover:underline"
            >
              ← All repositories
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Bring your own API key to use your own quota instead of the shared
              platform default — useful once the free tier runs out.
            </p>
          </div>
        </header>

        <p className="mb-6 rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
          Keys are encrypted before storage and never sent back to the browser —
          only a masked preview (last 4 characters) is shown after saving. Local
          Ollama models need no key and always stay available regardless of
          what's configured here.
        </p>

        {error && (
          <p className="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="space-y-4">
          {keysLoading
            ? [1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="space-y-3 rounded-lg border border-border bg-card p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-7 flex-1 rounded-lg" />
                    <Skeleton className="h-7 w-14 rounded-lg" />
                  </div>
                </div>
              ))
            : keys.map((key) => (
                <div
                  key={key.provider}
                  className="space-y-3 rounded-lg border border-border bg-card p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">
                      {PROVIDER_LABELS[key.provider] ?? key.provider}
                    </h2>
                    {key.configured && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {key.masked_key}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder={
                        key.configured
                          ? "Replace key..."
                          : "Paste your API key..."
                      }
                      value={drafts[key.provider] ?? ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [key.provider]: e.target.value,
                        }))
                      }
                      className="flex-1 rounded-lg"
                    />
                    <Button
                      className="rounded-lg"
                      disabled={
                        busyProvider === key.provider ||
                        !drafts[key.provider]?.trim()
                      }
                      onClick={() => handleSave(key.provider)}
                    >
                      Save
                    </Button>
                    {key.configured && (
                      <Button
                        variant="outline"
                        className="rounded-lg"
                        disabled={busyProvider === key.provider}
                        onClick={() => handleRemove(key.provider)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  )
}
