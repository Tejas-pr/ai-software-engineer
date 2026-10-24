import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { Spinner } from "@workspace/ui/components/spinner"
import { saveOnboardingOrganization } from "@/api/account.api"
import type { Organization } from "@/api/organizations.api"
import { ApplicationButton } from "@/components/molecules/application/application-button"
import { ApplicationInput } from "@/components/molecules/application/application-input"
import { describeError } from "@/lib/common/api-error"

export function OrganizationStep({
  initialName,
  onDone,
}: {
  initialName: string
  onDone: (organization: Organization) => void
}) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError("Give your organization a name")
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      onDone(await saveOnboardingOrganization(name.trim()))
    } catch (err) {
      setError(describeError(err, "Couldn't save the organization"))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <ApplicationInput
        label="Organization name"
        description="Your repositories, runs and teammates live here. You can rename it and create more later."
        placeholder="Acme engineering"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error}
        maxLength={60}
        autoFocus
        size="lg"
      />
      <ApplicationButton
        type="submit"
        size="lg"
        className="self-start"
        disabled={isSaving}
        iconLeft={isSaving ? <Spinner /> : undefined}
        iconRight={isSaving ? undefined : <ArrowRight />}
      >
        Continue
      </ApplicationButton>
    </form>
  )
}
