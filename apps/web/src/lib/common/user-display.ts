import type { User } from "@/api/user.api"

/** Two letters for an avatar fallback */
export function userInitials(user: User) {
  return (user.display_name || user.username).slice(0, 2).toUpperCase()
}

/** The stored GitHub avatar, or GitHub's own URL for the login until the
 * next sign-in stores it */
export function avatarUrl(user: Pick<User, "avatar_url" | "username">) {
  return (
    user.avatar_url ??
    `https://github.com/${encodeURIComponent(user.username)}.png?size=80`
  )
}
