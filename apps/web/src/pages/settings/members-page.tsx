import { useCallback, useEffect, useState } from "react"
import { UserPlus, X } from "lucide-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Spinner } from "@workspace/ui/components/spinner"
import { toast } from "@workspace/ui/components/toast"
import {
  addMember,
  changeMemberRole,
  listMembers,
  removeMember,
  type Member,
  type OrgRole,
} from "@/api/organizations.api"
import { ApplicationBadge } from "@/components/molecules/application/application-badge"
import { ApplicationButton } from "@/components/molecules/application/application-button"
import { ApplicationInput } from "@/components/molecules/application/application-input"
import { ApplicationSelection } from "@/components/molecules/application/application-selection"
import { PageHeader } from "@/components/molecules/common/page-header"
import { useAuth } from "@/hooks/auth/use-auth"
import { useOrganization } from "@/hooks/organization/use-organization"
import { describeError } from "@/lib/common/api-error"
import { timeAgo } from "@/lib/common/dates"
import { avatarUrl } from "@/lib/common/user-display"

const ROLE_OPTIONS = [
  {
    value: "member",
    label: "Member",
    description: "Connect repos, run agents",
  },
  {
    value: "owner",
    label: "Owner",
    description: "Also manage members and the organization",
  },
]

export function MembersPage() {
  const { user } = useAuth()
  const { current, refresh } = useOrganization()
  const isOwner = current.role === "owner"
  const [members, setMembers] = useState<Member[] | null>(null)
  const [username, setUsername] = useState("")
  const [role, setRole] = useState<OrgRole>("member")
  const [addError, setAddError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const load = useCallback(() => {
    listMembers(current.id)
      .then(setMembers)
      .catch(() => setMembers([]))
  }, [current.id])

  useEffect(load, [load])

  async function run(action: () => Promise<void>, failure: string) {
    try {
      await action()
      load()
      void refresh()
    } catch (err) {
      toast.add({
        title: failure,
        description: describeError(err, ""),
        type: "error",
      })
    }
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault()
    if (!username.trim()) {
      setAddError("Enter a GitHub username")
      return
    }
    setIsAdding(true)
    setAddError(null)
    try {
      await addMember(current.id, username.trim(), role)
      setUsername("")
      load()
      void refresh()
    } catch (err) {
      setAddError(describeError(err, "Couldn't add them"))
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow={current.name}
        title="Members"
        description="Everyone here can connect repositories and run agents. Owners also manage members and the organization."
      />

      {isOwner && !current.is_personal && (
        <form
          onSubmit={handleAdd}
          className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-[0_1px_0_0_var(--border)] sm:flex-row sm:items-start"
        >
          <ApplicationInput
            placeholder="GitHub username"
            iconLeft={<UserPlus />}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={addError}
            description="They need to have signed in here once."
            containerClassName="flex-1"
          />
          <ApplicationSelection
            aria-label="Role"
            options={ROLE_OPTIONS}
            value={role}
            onValueChange={(v) => setRole((v as OrgRole) ?? "member")}
            className="sm:w-36"
          />
          <ApplicationButton
            type="submit"
            disabled={isAdding}
            iconLeft={isAdding ? <Spinner /> : undefined}
          >
            Add
          </ApplicationButton>
        </form>
      )}
      {current.is_personal && (
        <p className="rounded-xl border border-dashed px-4 py-3 text-xs/relaxed text-muted-foreground">
          This is your personal organization. To work with others, create a team
          organization from the switcher and add them there.
        </p>
      )}

      <ul className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-[0_1px_0_0_var(--border)]">
        {members === null
          ? Array.from({ length: 3 }).map((_, i) => (
              <li
                key={i}
                className="flex items-center gap-3 border-b p-4 last:border-b-0"
              >
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </li>
            ))
          : members.map((member) => {
              const isMe = member.user_id === user?.id
              return (
                <li
                  key={member.user_id}
                  className="flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-b-0"
                >
                  <Avatar className="size-9">
                    <AvatarImage src={avatarUrl(member)} alt="" />
                    <AvatarFallback className="bg-brand-soft text-2xs font-semibold text-foreground">
                      {member.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {member.display_name || member.username}
                      {isMe && (
                        <span className="text-muted-foreground"> (you)</span>
                      )}
                    </span>
                    <span className="truncate text-2xs text-muted-foreground">
                      @{member.username} · joined {timeAgo(member.joined_at)}
                    </span>
                  </span>
                  {isOwner && !isMe ? (
                    <ApplicationSelection
                      aria-label={`Role for ${member.username}`}
                      size="sm"
                      options={ROLE_OPTIONS}
                      value={member.role}
                      onValueChange={(v) =>
                        v &&
                        run(
                          () =>
                            changeMemberRole(
                              current.id,
                              member.user_id,
                              v as OrgRole
                            ),
                          "Couldn't change the role"
                        )
                      }
                      className="w-28"
                    />
                  ) : (
                    <ApplicationBadge
                      variant={member.role === "owner" ? "brand" : "neutral"}
                      size="sm"
                    >
                      {member.role}
                    </ApplicationBadge>
                  )}
                  {isOwner && !isMe && (
                    <ApplicationButton
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${member.username}`}
                      title="Remove from organization"
                      onClick={() =>
                        run(
                          () => removeMember(current.id, member.user_id),
                          "Couldn't remove them"
                        )
                      }
                    >
                      <X />
                    </ApplicationButton>
                  )}
                </li>
              )
            })}
      </ul>
    </div>
  )
}
