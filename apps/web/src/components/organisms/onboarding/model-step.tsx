import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Cpu } from "lucide-react"
import { getAvailableModels, type AvailableModels } from "@/api/settings.api"
import { ApplicationButton } from "@/components/molecules/application/application-button"
import { ApiKeyManager } from "@/components/organisms/settings/api-key-manager"
import { paths } from "@/lib/common/paths"

/** Step 2: the agents need a model — your own key, or local Ollama */
export function ModelStep({
  onDone,
}: {
  onDone: (choice: { useLocalModels: boolean }) => void
}) {
  const [hasKey, setHasKey] = useState(false)
  const [models, setModels] = useState<AvailableModels | null>(null)

  useEffect(() => {
    getAvailableModels()
      .then(setModels)
      .catch(() => setModels(null))
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <ApiKeyManager
        onChange={(keys) => setHasKey(keys.some((k) => k.configured))}
      />

      <div className="flex flex-col gap-3 rounded-xl border border-dashed p-4">
        <div className="flex items-center gap-2">
          <Cpu className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Running locally instead?</h3>
        </div>
        {models?.ollama_available ? (
          <>
            <p className="text-xs/relaxed text-muted-foreground">
              Ollama is running on this server with {models.local_models.length}{" "}
              tool-capable model
              {models.local_models.length === 1 ? "" : "s"}
              {models.recommended_coding_model && (
                <>
                  {" "}
                  — best fit for coding:{" "}
                  <code className="text-foreground">
                    {models.recommended_coding_model}
                  </code>
                </>
              )}
              . No key, no quota — slower, and less reliable at tool calling
              than cloud models.
            </p>
            <ApplicationButton
              variant="secondary"
              className="self-start"
              onClick={() => onDone({ useLocalModels: true })}
            >
              Use local Ollama models
            </ApplicationButton>
          </>
        ) : (
          <p className="text-xs/relaxed text-muted-foreground">
            Self-hosting? Install Ollama on the machine running the API and pull
            a tool-capable model, then reload this page.{" "}
            <Link to={paths.setup} className="text-link hover:underline">
              See the setup guide
            </Link>
            .
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ApplicationButton
          size="lg"
          variant="highlight"
          onClick={() => onDone({ useLocalModels: false })}
          iconRight={hasKey ? <ArrowRight /> : undefined}
        >
          {hasKey ? "Continue" : "Skip for now"}
        </ApplicationButton>
        {!hasKey && (
          <span className="text-xs text-muted-foreground">
            You can add an API key at any time in Settings.
          </span>
        )}
      </div>
    </div>
  )
}
