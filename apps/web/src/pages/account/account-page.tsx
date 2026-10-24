import { useState } from "react"
import { Link } from "react-router-dom"
import { LogOut } from "lucide-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Spinner } from "@workspace/ui/components/spinner"
import { toast } from "@workspace/ui/components/toast"
import { updateProfile } from "@/api/account.api"
import { GithubIcon } from "@/components/atoms/github-icon"
import {
  ApplicationButton,
  applicationButtonVariants,
} from "@/components/molecules/application/application-button"
import { ApplicationInput } from "@/components/molecules/application/application-input"
import { PageHeader } from "@/components/molecules/common/page-header"
import { useAuth } from "@/hooks/auth/use-auth"
import { describeError } from "@/lib/common/api-error"
import { formatDateTime } from "@/lib/common/dates"
import { paths } from "@/lib/common/paths"
import { avatarUrl, userInitials } from "@/lib/common/user-display"

/** The signed-in user's profile */
export function AccountPage() {
  const { user, refresh } = useAuth()
  const [name, setName] = useState(user?.display_name ?? "")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  if (!user) return null

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError("Name can't be empty")
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await updateProfile(name.trim())
      await refresh()
      toast.add({ title: "Profile saved", type: "success" })
    } catch (err) {
      setError(describeError(err, "Couldn't save your profile"))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Settings"
        title="Profile"
        description="How you appear to your teammates."
      />

      <section className="flex flex-col gap-5 rounded-xl border bg-card p-5 shadow-[0_1px_0_0_var(--border)]">
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarImage src={avatarUrl(user)} alt="" />
            <AvatarFallback className="bg-brand-soft text-base font-semibold text-foreground">
              {userInitials(user)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate font-serif text-3xl leading-none">
              {user.display_name || user.username}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              @{user.username} · {user.email}
            </span>
          </div>
        </div>

        <form
          onSubmit={handleSave}
          className="flex flex-col gap-3 sm:flex-row sm:items-start"
        >
          <ApplicationInput
            label="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={error}
            maxLength={80}
            containerClassName="flex-1"
          />
          <ApplicationButton
            type="submit"
            className="sm:mt-9"
            disabled={isSaving || name.trim() === (user.display_name ?? "")}
            iconLeft={isSaving ? <Spinner /> : undefined}
          >
            Save
          </ApplicationButton>
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-[0_1px_0_0_var(--border)]">
        <h2 className="text-sm font-semibold">GitHub</h2>
        <p className="text-xs/relaxed text-muted-foreground">
          Your account is your GitHub account. Its email and avatar refresh
          every time you sign in; the agents use its token to clone, push and
          open pull requests.
          {user.onboarded_at && (
            <> Member since {formatDateTime(user.onboarded_at)}.</>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={`https://github.com/${user.username}`}
            target="_blank"
            rel="noreferrer"
            className={applicationButtonVariants({ variant: "outline" })}
          >
            <GithubIcon className="size-4" />
            View on GitHub
          </a>
          <a
            href="https://github.com/settings/applications"
            target="_blank"
            rel="noreferrer"
            className={applicationButtonVariants({ variant: "ghost" })}
          >
            Manage authorized apps
          </a>
        </div>
      </section>

      <Link
        to={paths.auth.signout}
        className={applicationButtonVariants({
          variant: "outline",
          className: "self-start",
        })}
      >
        <LogOut className="size-4" />
        Log out
      </Link>
    </div>
  )
}
