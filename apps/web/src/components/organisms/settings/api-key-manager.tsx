import { useEffect, useState } from "react"
import { ExternalLink, KeyRound, Trash2 } from "lucide-react"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"
import {
  deleteApiKey,
  listApiKeys,
  PROVIDERS,
  setApiKey,
  type ApiKeyStatus,
} from "@/api/settings.api"
import { ApplicationBadge } from "@/components/molecules/application/application-badge"
import { ApplicationButton } from "@/components/molecules/application/application-button"
import { ApplicationInput } from "@/components/molecules/application/application-input"
import { describeError } from "@/lib/common/api-error"

/**
 * One card per provider: status, where to get a key, paste + save (the API
 * checks it with the provider first), remove. Used by onboarding and by
 * Settings → API keys. `onChange` gets the fresh list after any change.
 */
export function ApiKeyManager({
  onChange,
  className,
}: {
  onChange?: (keys: ApiKeyStatus[]) => void
  className?: string
}) {
  const [keys, setKeys] = useState<ApiKeyStatus[] | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    listApiKeys()
      .then((list) => {
        setKeys(list)
        onChange?.(list)
      })
      .catch(() => setKeys([]))
    // Load once; onChange is a notification, not an input
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function reload() {
    const list = await listApiKeys()
    setKeys(list)
    onChange?.(list)
  }

  async function handleSave(provider: string) {
    const value = drafts[provider]?.trim()
    if (!value) {
      setErrors((e) => ({ ...e, [provider]: "Paste a key first" }))
      return
    }
    setBusy(provider)
    setErrors((e) => ({ ...e, [provider]: null }))
    try {
      await setApiKey(provider, value)
      setDrafts((d) => ({ ...d, [provider]: "" }))
      await reload()
    } catch (err) {
      setErrors((e) => ({
        ...e,
        [provider]: describeError(err, "Couldn't save this key"),
      }))
    } finally {
      setBusy(null)
    }
  }

  async function handleRemove(provider: string) {
    setBusy(provider)
    try {
      await deleteApiKey(provider)
      await reload()
    } catch (err) {
      setErrors((e) => ({
        ...e,
        [provider]: describeError(err, "Couldn't remove this key"),
      }))
    } finally {
      setBusy(null)
    }
  }

  if (keys === null) {
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        {PROVIDERS.map((p) => (
          <Skeleton key={p.id} className="h-32 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div
      data-slot="api-key-manager"
      className={cn("flex flex-col gap-3", className)}
    >
      {PROVIDERS.map((provider) => {
        const status = keys.find((k) => k.provider === provider.id)
        const isBusy = busy === provider.id
        return (
          <section
            key={provider.id}
            className={cn(
              "flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-[0_1px_0_0_var(--border)] transition-colors",
              status?.configured && "border-run-completed/30"
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <KeyRound className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">{provider.label}</h3>
              {status?.configured ? (
                <ApplicationBadge variant="completed" size="sm" dot>
                  Saved {status.masked_key}
                </ApplicationBadge>
              ) : (
                <ApplicationBadge variant="neutral" size="sm">
                  Not set
                </ApplicationBadge>
              )}
              <a
                href={provider.keyUrl}
                target="_blank"
                rel="noreferrer"
                className="ms-auto inline-flex items-center gap-1 text-xs text-link hover:underline"
              >
                Get a key <ExternalLink className="size-3" />
              </a>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <ApplicationInput
                type="password"
                autoComplete="off"
                placeholder={
                  status?.configured
                    ? "Paste a new key to replace it"
                    : "Paste your API key"
                }
                value={drafts[provider.id] ?? ""}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [provider.id]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSave(provider.id)
                }}
                error={errors[provider.id]}
                containerClassName="flex-1"
                disabled={isBusy}
              />
              <div className="flex gap-2">
                <ApplicationButton
                  onClick={() => handleSave(provider.id)}
                  disabled={isBusy}
                  iconLeft={isBusy ? <Spinner /> : undefined}
                >
                  {isBusy ? "Checking…" : "Save"}
                </ApplicationButton>
                {status?.configured && (
                  <ApplicationButton
                    variant="outline"
                    size="icon"
                    aria-label={`Remove ${provider.label} key`}
                    title="Remove key"
                    onClick={() => handleRemove(provider.id)}
                    disabled={isBusy}
                  >
                    <Trash2 />
                  </ApplicationButton>
                )}
              </div>
            </div>
          </section>
        )
      })}
      <p className="text-xs/relaxed text-muted-foreground">
        Keys are checked with the provider, encrypted before they're stored, and
        never sent back to the browser — only the last four characters are
        shown.
      </p>
    </div>
  )
}
