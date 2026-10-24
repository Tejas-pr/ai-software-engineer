import { useNavigate } from "react-router-dom"
import { KeyRound, LogOut, Moon, Sun, UserRound } from "lucide-react"
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
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import type { User } from "@/api/user.api"
import { useTheme } from "@/hooks/common/use-theme"
import { paths } from "@/lib/common/paths"
import { avatarUrl, userInitials } from "@/lib/common/user-display"

const ITEM = "cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem]"

/** The account menu at the foot of the sidebar's icon rail */
export function NavUser({ user }: { user: User }) {
  const { isMobile } = useSidebar()
  const { resolvedTheme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const name = user.display_name || user.username

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                aria-label="Account menu"
                className="md:h-8 md:p-0 data-open:bg-sidebar-accent"
              />
            }
          >
            <Avatar className="size-8 rounded-lg after:rounded-lg">
              <AvatarImage
                src={avatarUrl(user)}
                alt=""
                className="rounded-lg"
              />
              <AvatarFallback className="rounded-lg bg-brand-soft text-2xs font-semibold text-foreground">
                {userInitials(user)}
              </AvatarFallback>
            </Avatar>
            <span className="grid flex-1 text-start text-sm leading-tight">
              <span className="truncate font-medium">{name}</span>
              <span className="truncate text-2xs text-muted-foreground">
                {user.email}
              </span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-60 rounded-xl p-1.5"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            <div className="flex items-center gap-3 px-2.5 pt-2 pb-2.5">
              <Avatar className="size-9">
                <AvatarImage src={avatarUrl(user)} alt="" />
                <AvatarFallback className="bg-brand-soft text-xs font-semibold text-foreground">
                  {userInitials(user)}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold">{name}</span>
                <span className="truncate text-2xs text-muted-foreground">
                  @{user.username}
                </span>
              </div>
            </div>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className={ITEM}
              onClick={() => navigate(paths.account)}
            >
              <UserRound className="size-4 text-muted-foreground" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className={ITEM}
              onClick={() => navigate(paths.settings.apiKeys)}
            >
              <KeyRound className="size-4 text-muted-foreground" />
              API keys
            </DropdownMenuItem>
            <DropdownMenuItem className={ITEM} onClick={() => toggleTheme()}>
              {resolvedTheme === "dark" ? (
                <Sun className="size-4 text-muted-foreground" />
              ) : (
                <Moon className="size-4 text-muted-foreground" />
              )}
              {resolvedTheme === "dark" ? "Light theme" : "Dark theme"}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              variant="destructive"
              className={ITEM}
              onClick={() => navigate(paths.auth.signout)}
            >
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
