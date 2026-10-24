import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Spinner } from "@workspace/ui/components/spinner"
import { toast } from "@workspace/ui/components/toast"
import {
  deleteOrganization,
  removeMember,
  renameOrganization,
} from "@/api/organizations.api"
import { ApplicationButton } from "@/components/molecules/application/application-button"
import { ApplicationInput } from "@/components/molecules/application/application-input"
import { ApplicationPopup } from "@/components/molecules/application/application-popup"
import { PageHeader } from "@/components/molecules/common/page-header"
import { useAuth } from "@/hooks/auth/use-auth"
import { useOrganization } from "@/hooks/organization/use-organization"
import { describeError } from "@/lib/common/api-error"
import { formatDateTime } from "@/lib/common/dates"
import { paths } from "@/lib/common/paths"

function Section({
  title,
  description,
  children,
  tone,
}: {
  title: string
  description: string
  children: React.ReactNode
  tone?: "danger"
}) {
  return (
    <section
      className={
        tone === "danger"
          ? "flex flex-col overflow-hidden rounded-xl border border-destructive/30 bg-card"
          : "flex flex-col overflow-hidden rounded-xl border bg-card shadow-[0_1px_0_0_var(--border)]"
      }
    >
      <div className="flex flex-col gap-1 border-b px-5 py-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs/relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

export function OrganizationSettingsPage() {
  const { user } = useAuth()
  const { current, refresh, switchTo } = useOrganization()
  const navigate = useNavigate()
  const isOwner = current.role === "owner"
  const [name, setName] = useState(current.name)
  const [nameError, setNameError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [confirming, setConfirming] = useState<"delete" | "leave" | null>(null)
  const [isWorking, setIsWorking] = useState(false)

  async function handleRename(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setNameError("Name can't be empty")
      return
    }
    setIsSaving(true)
    setNameError(null)
    try {
      await renameOrganization(current.id, name.trim())
      await refresh()
      toast.add({ title: "Organization renamed", type: "success" })
    } catch (err) {
      setNameError(describeError(err, "Couldn't rename it"))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleConfirm() {
    if (!user) return
    setIsWorking(true)
    try {
      if (confirming === "delete") await deleteOrganization(current.id)
      else await removeMember(current.id, user.id)
      const remaining = await refresh()
      const next = remaining.find((o) => o.id !== current.id)
      if (next) switchTo(next.id)
      setConfirming(null)
      navigate(paths.dashboard)
    } catch (err) {
      toast.add({
        title:
          confirming === "delete" ? "Couldn't delete it" : "Couldn't leave it",
        description: describeError(err, ""),
        type: "error",
      })
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Settings"
        title="Organization"
        description="Name and lifecycle of the organization you're working in."
      />

      <Section
        title="Name"
        description={
          isOwner
            ? "Shown in the switcher and on every page."
            : "Only owners can rename the organization."
        }
      >
        <form
          onSubmit={handleRename}
          className="flex flex-col gap-3 sm:flex-row sm:items-start"
        >
          <ApplicationInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={nameError}
            disabled={!isOwner}
            maxLength={60}
            containerClassName="flex-1"
          />
          {isOwner && (
            <ApplicationButton
              type="submit"
              disabled={isSaving || name.trim() === current.name}
              iconLeft={isSaving ? <Spinner /> : undefined}
            >
              Save
            </ApplicationButton>
          )}
        </form>
      </Section>

      <Section title="Details" description="For reference.">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-[0.8125rem]">
          <dt className="text-muted-foreground">Slug</dt>
          <dd className="truncate">{current.slug}</dd>
          <dt className="text-muted-foreground">Type</dt>
          <dd>{current.is_personal ? "Personal" : "Team"}</dd>
          <dt className="text-muted-foreground">Your role</dt>
          <dd className="capitalize">{current.role}</dd>
          <dt className="text-muted-foreground">Members</dt>
          <dd>{current.member_count}</dd>
          <dt className="text-muted-foreground">Repositories</dt>
          <dd>{current.project_count}</dd>
          <dt className="text-muted-foreground">Created</dt>
          <dd>{formatDateTime(current.created_at)}</dd>
        </dl>
      </Section>

      <Section
        tone="danger"
        title="Danger zone"
        description={
          current.is_personal
            ? "Your personal organization can't be deleted or left."
            : isOwner
              ? "Deleting removes every repository, run, index and workspace in it, for everyone."
              : "Leaving removes your access; your runs stay with the organization."
        }
      >
        {!current.is_personal && (
          <div className="flex flex-wrap gap-2">
            {isOwner && (
              <ApplicationButton
                variant="destructive"
                onClick={() => setConfirming("delete")}
              >
                Delete organization
              </ApplicationButton>
            )}
            <ApplicationButton
              variant="outline"
              onClick={() => setConfirming("leave")}
            >
              Leave organization
            </ApplicationButton>
          </div>
        )}
      </Section>

      <ApplicationPopup
        isOpen={confirming !== null}
        onClose={() => setConfirming(null)}
        size="sm"
        title={
          confirming === "delete"
            ? `Delete ${current.name}?`
            : `Leave ${current.name}?`
        }
        description={
          confirming === "delete"
            ? "This can't be undone. Repositories on GitHub aren't touched."
            : "An owner can add you back later."
        }
        secondaryAction={{
          label: "Cancel",
          onClick: () => setConfirming(null),
        }}
        primaryAction={{
          label: isWorking
            ? "Working…"
            : confirming === "delete"
              ? "Delete"
              : "Leave",
          variant: "destructive",
          disabled: isWorking,
          onClick: handleConfirm,
        }}
      />
    </div>
  )
}
