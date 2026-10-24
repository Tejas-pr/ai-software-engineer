import { useNavigate } from "react-router-dom"
import { ChevronDown, FolderGit2, KeyRound, LogOut } from "lucide-react"
import type { User } from "@/api/user.api"
import { paths } from "@/lib/common/paths"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { cn } from "@workspace/ui/lib/utils"

const ITEM_CLASS =
  "cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem] font-medium"

// Accounts come from GitHub sign-in, so the GitHub avatar is theirs
const avatarUrl = (user: User) =>
  `https://github.com/${encodeURIComponent(user.username)}.png?size=80`

const initials = (user: User) => user.username.slice(0, 2).toUpperCase()

export interface UserMenuProps {
  user: User
  className?: string
}

export function UserMenu({ user, className }: UserMenuProps) {
  const navigate = useNavigate()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-slot="user-menu-trigger"
        aria-label="Account menu"
        className={cn(
          "group/user-trigger flex cursor-pointer items-center gap-2 rounded-full p-0.5 transition-colors outline-none hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring/50 data-popup-open:bg-muted/80 sm:rounded-xl sm:py-1 sm:ps-1 sm:pe-2",
          className
        )}
      >
        <Avatar size="sm" className="size-7">
          <AvatarImage src={avatarUrl(user)} alt="" />
          <AvatarFallback className="bg-brand-soft text-2xs font-semibold text-foreground">
            {initials(user)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate text-[0.8125rem] font-medium text-foreground sm:block">
          {user.username}
        </span>
        <ChevronDown className="hidden size-3.5 text-muted-foreground transition-transform duration-200 group-data-popup-open/user-trigger:rotate-180 sm:block" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 rounded-xl p-1.5"
      >
        <div className="flex items-center gap-3 px-2.5 pt-2 pb-2.5">
          <Avatar className="size-9">
            <AvatarImage src={avatarUrl(user)} alt="" />
            <AvatarFallback className="bg-brand-soft text-xs font-semibold text-foreground">
              {initials(user)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold tracking-tight text-foreground">
              {user.username}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          </div>
        </div>

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuItem
          className={ITEM_CLASS}
          onClick={() => navigate(paths.projects.root)}
        >
          <FolderGit2 className="size-4 text-muted-foreground" />
          Repositories
        </DropdownMenuItem>
        <DropdownMenuItem
          className={ITEM_CLASS}
          onClick={() => navigate(paths.settings)}
        >
          <KeyRound className="size-4 text-muted-foreground" />
          API keys
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1" />

        {/* Signing out is its own page: it ends the session, then says so */}
        <DropdownMenuItem
          variant="destructive"
          className={ITEM_CLASS}
          onClick={() => navigate(paths.auth.signout)}
        >
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
