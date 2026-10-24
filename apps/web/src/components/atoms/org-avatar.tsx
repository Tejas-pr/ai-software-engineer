import { cn } from "@workspace/ui/lib/utils"

/** A square with the organization's initials — its "logo" until it has one */
export function OrgAvatar({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const initials =
    name
      .split(/[\s'_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "?"

  return (
    <span
      data-slot="org-avatar"
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_oklab,var(--primary),black_14%)] bg-primary text-xs font-semibold text-primary-foreground shadow-[inset_0_1px_0_0_rgb(255_255_255/0.45)]",
        className
      )}
    >
      {initials}
    </span>
  )
}
