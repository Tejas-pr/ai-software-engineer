import { useEffect, useState } from "react"
import { Cpu } from "lucide-react"
import { getAvailableModels, type AvailableModels } from "@/api/settings.api"
import { PageHeader } from "@/components/molecules/common/page-header"
import { ApiKeyManager } from "@/components/organisms/settings/api-key-manager"

/** Your own provider keys (they're yours, not the organization's) */
export function ApiKeysPage() {
  const [models, setModels] = useState<AvailableModels | null>(null)

  useEffect(() => {
    getAvailableModels()
      .then(setModels)
      .catch(() => setModels(null))
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Settings"
        title="API keys"
        description="Runs you start use your own key for the model you pick, so they count against your quota. Keys belong to you, not to the organization."
      />
      <ApiKeyManager />
      <section className="flex gap-3 rounded-xl border border-dashed p-4">
        <Cpu className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">Local models</h2>
          <p className="text-xs/relaxed text-muted-foreground">
            {models?.ollama_available
              ? `Ollama is available with ${models.local_models.length} tool-capable model${models.local_models.length === 1 ? "" : "s"} — pick one in the model picker when you start a run. No key needed.`
              : "Ollama isn't reachable from the API right now. Install it on the API's machine and pull a tool-capable model to run without a key."}
            {models && models.platform_providers.length > 0 && (
              <>
                {" "}
                This server also provides a shared key for:{" "}
                {models.platform_providers.join(", ")}.
              </>
            )}
          </p>
        </div>
      </section>
    </div>
  )
}
