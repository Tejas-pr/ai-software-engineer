import { cn } from "@workspace/ui/lib/utils"

export const BRAND_NAME = "AI Software Engineer"

/** The square mark: an ink tile with an amber prompt and a blinking caret */
export function BrandMark({
  className,
  ...props
}: React.ComponentProps<"svg">) {
  return (
    <svg
      data-slot="brand-mark"
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-7 shrink-0", className)}
      {...props}
    >
      <rect width="32" height="32" rx="8" fill="var(--brand-ink)" />
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="7.5"
        fill="none"
        stroke="white"
        strokeOpacity="0.1"
      />
      <path
        d="M9 11.5 13.5 16 9 20.5"
        fill="none"
        stroke="var(--brand-amber)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="16.5"
        y="18.5"
        width="7"
        height="2.6"
        rx="1"
        fill="var(--brand-amber)"
        className="animate-caret"
      />
    </svg>
  )
}

export function BrandLogo({
  variant = "full",
  className,
  ...props
}: React.ComponentProps<"span"> & { variant?: "full" | "icon" }) {
  return (
    <span
      data-slot="brand-logo"
      className={cn("inline-flex items-center gap-2.5", className)}
      {...props}
    >
      <BrandMark />
      {variant === "full" && (
        <span className="text-[0.9375rem] font-semibold tracking-tight text-foreground">
          {BRAND_NAME}
        </span>
      )}
    </span>
  )
}
