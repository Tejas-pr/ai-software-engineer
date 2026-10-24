import { useState } from "react"
import { createOrganization, type Organization } from "@/api/organizations.api"
import { ApplicationButton } from "@/components/molecules/application/application-button"
import { ApplicationInput } from "@/components/molecules/application/application-input"
import { ApplicationPopup } from "@/components/molecules/application/application-popup"
import { describeError } from "@/lib/common/api-error"
import { Spinner } from "@workspace/ui/components/spinner"

export function CreateOrganizationPopup({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean
  onClose: () => void
  onCreated: (organization: Organization) => void
}) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError("Give it a name")
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const organization = await createOrganization(name.trim())
      setName("")
      onCreated(organization)
    } catch (err) {
      setError(describeError(err, "Couldn't create the organization"))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ApplicationPopup
      isOpen={isOpen}
      onClose={onClose}
      title="Create an organization"
      description="A separate workspace with its own repositories, runs and members. You'll be its owner."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ApplicationInput
          label="Name"
          placeholder="Acme engineering"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
          autoFocus
          maxLength={60}
        />
        <div className="flex justify-end gap-2">
          <ApplicationButton variant="outline" onClick={onClose}>
            Cancel
          </ApplicationButton>
          <ApplicationButton
            type="submit"
            disabled={isSaving}
            iconLeft={isSaving ? <Spinner /> : undefined}
          >
            Create organization
          </ApplicationButton>
        </div>
      </form>
    </ApplicationPopup>
  )
}
