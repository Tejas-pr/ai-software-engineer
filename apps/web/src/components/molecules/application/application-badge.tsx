import * as React from "react"
import { motion, type HTMLMotionProps } from "motion/react"
import { cn } from "@workspace/ui/lib/utils"

export type ApplicationBadgeVariant =
  // Agent run / project status presets
  | "pending"
  | "running"
  | "awaiting"
  | "completed"
  | "failed"
  // General status presets
  | "default"
  | "brand"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "neutral"
  | "outline"
  | "hero"
  // Count / number badge presets
  | "count-solid"
  | "count-medium"
  | "count-light"

export type ApplicationBadgeColor =
  | "red"
  | "green"
  | "amber"
  | "yellow"
  | "blue"
  | "sky"
  | "orange"
  | "purple"
  | "emerald"
  | "rose"
  | "brand"
  | "gray"

export type ApplicationBadgeMode = "subtle" | "solid" | "outline"
export type ApplicationBadgeSize =
  "sm" | "default" | "lg" | "count" | "count-sm"
export type ApplicationBadgeShape = "pill" | "rounded" | "square"

export interface ApplicationBadgeProps extends Omit<
  HTMLMotionProps<"span">,
  "children"
> {
  /**
   * Preset variant:
   * - `"pending"` / `"running"` / `"awaiting"` / `"completed"` / `"failed"`:
   *   agent run states, each in its own --run-* tone
   * - `"success"` / `"warning"` / `"destructive"` / `"info"`: general status
   * - `"hero"`: translucent pill over the landing grid
   * - `"count-solid"` / `"count-medium"` / `"count-light"`: numeric badges
   * @default "default"
   */
  variant?: ApplicationBadgeVariant

  /**
   * Explicit color override:
   * - `"red"` | `"green"` | `"amber"` | `"blue"` | `"orange"` | `"purple"` | `"brand"` | `"gray"`
   */
  color?: ApplicationBadgeColor

  /**
   * Visual presentation mode:
   * - `"subtle"`: Soft tint + deep colored text (default)
   * - `"solid"`: Filled background
   * - `"outline"`: Transparent bg + colored border
   * @default "subtle"
   */
  mode?: ApplicationBadgeMode

  /**
   * Size preset:
   * - `"default"`: 24px height, text-xs
   * - `"sm"`: 20px compact
   * - `"lg"`: 28px large
   * - `"count"`: 32x32px count badge
   * - `"count-sm"`: 24x24px compact count badge
   * @default "default"
   */
  size?: ApplicationBadgeSize

  /**
   * Corner radius shape:
   * - `"pill"`: Fully rounded
   * - `"rounded"`: 8px rounded rectangle
   * - `"square"`: 6px compact radius
   * @default "pill"
   */
  shape?: ApplicationBadgeShape

  /**
   * Optional status indicator dot before the content
   */
  dot?: boolean

  /**
   * Pulsating animation for the status dot
   */
  pulseDot?: boolean

  /** Left icon element */
  iconLeft?: React.ReactNode
  /** Right icon element */
  iconRight?: React.ReactNode
  /** General icon slot (defaults to left) */
  icon?: React.ReactNode

  /** Badge content */
  children?: React.ReactNode
}

// A run state: tinted with its own tone, text in the same tone. Written out
// in full so Tailwind sees every class
const RUN_TONES = {
  pending:
    "bg-run-pending/10 text-run-pending border-run-pending/25 font-medium",
  running:
    "bg-run-running/10 text-run-running border-run-running/25 font-medium",
  awaiting:
    "bg-run-awaiting/12 text-run-awaiting border-run-awaiting/30 font-medium",
  completed:
    "bg-run-completed/10 text-run-completed border-run-completed/25 font-medium",
  failed: "bg-run-failed/10 text-run-failed border-run-failed/25 font-medium",
} as const
const runTone = (tone: keyof typeof RUN_TONES) => RUN_TONES[tone]

/**
 * Standard Application Badge.
 *
 * - Agent run states (pending → running → awaiting → completed / failed)
 * - Flexible color + mode for anything else
 * - Motion hover/tap micro-interactions when clickable
 */
export function ApplicationBadge({
  variant = "default",
  color,
  mode = "subtle",
  size = "default",
  shape = "pill",
  dot = false,
  pulseDot = false,
  iconLeft,
  iconRight,
  icon,
  children,
  className,
  whileHover,
  whileTap,
  ...props
}: ApplicationBadgeProps) {
  const startIcon = iconLeft ?? icon

  // Resolves color preset classes based on color + mode
  const getColorClasses = (
    c: ApplicationBadgeColor,
    m: ApplicationBadgeMode
  ): string => {
    if (m === "solid") {
      switch (c) {
        case "red":
        case "rose":
          return "bg-rose-600 text-white border-transparent"
        case "green":
        case "emerald":
          return "bg-emerald-600 text-white border-transparent"
        case "amber":
        case "yellow":
        case "orange":
          return "bg-amber-400 text-amber-950 border-transparent"
        case "blue":
        case "sky":
          return "bg-blue-600 text-white border-transparent"
        case "purple":
          return "bg-violet-600 text-white border-transparent"
        case "brand":
          return "bg-primary text-primary-foreground border-transparent"
        case "gray":
        default:
          return "bg-foreground text-background border-transparent"
      }
    }

    if (m === "outline") {
      switch (c) {
        case "red":
        case "rose":
          return "border-rose-400 text-rose-700 dark:border-rose-700 dark:text-rose-300 bg-transparent"
        case "green":
        case "emerald":
          return "border-emerald-400 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300 bg-transparent"
        case "amber":
        case "yellow":
        case "orange":
          return "border-amber-400 text-amber-800 dark:border-amber-600 dark:text-amber-300 bg-transparent"
        case "blue":
        case "sky":
          return "border-blue-400 text-blue-700 dark:border-blue-700 dark:text-blue-300 bg-transparent"
        case "purple":
          return "border-violet-400 text-violet-700 dark:border-violet-700 dark:text-violet-300 bg-transparent"
        case "brand":
          return "border-primary text-link bg-transparent"
        case "gray":
        default:
          return "border-border text-foreground bg-transparent"
      }
    }

    // "subtle": soft tint with deep colored text
    switch (c) {
      case "red":
      case "rose":
        return "bg-rose-100/70 text-rose-800 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50"
      case "green":
      case "emerald":
        return "bg-emerald-100/60 text-emerald-800 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50"
      case "amber":
      case "yellow":
      case "orange":
        return "bg-amber-100/80 text-amber-900 border-amber-200/70 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/60"
      case "blue":
      case "sky":
        return "bg-sky-100/70 text-sky-800 border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/50"
      case "purple":
        return "bg-violet-100/70 text-violet-800 border-violet-200/60 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/50"
      case "brand":
        return "bg-brand-soft text-foreground border-primary/30"
      case "gray":
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  const variantClasses: Record<ApplicationBadgeVariant, string> = {
    pending: runTone("pending"),
    running: runTone("running"),
    awaiting: runTone("awaiting"),
    completed: runTone("completed"),
    failed: runTone("failed"),

    default: "bg-muted text-foreground border-border",
    brand: "bg-brand-soft text-foreground font-medium border-primary/30",
    success: runTone("completed"),
    warning: runTone("awaiting"),
    destructive: runTone("failed"),
    info: runTone("running"),
    neutral: "bg-muted text-muted-foreground border-border",
    outline: "border-border text-foreground bg-transparent",
    hero: "bg-card/70 text-foreground border-border font-medium backdrop-blur-sm shadow-[0_1px_0_0_var(--border)]",

    "count-solid":
      "bg-primary text-primary-foreground font-semibold border-transparent",
    "count-medium":
      "bg-brand-soft text-foreground font-semibold border-primary/30",
    "count-light": "bg-muted text-foreground font-semibold border-border",
  }

  const sizeClasses: Record<ApplicationBadgeSize, string> = {
    default: "h-6 px-2.5 text-xs gap-1.5",
    sm: "h-5 px-2 text-2xs gap-1",
    lg: "h-7 px-3 text-xs gap-2",
    count: "min-w-8 h-8 px-2 text-sm justify-center font-semibold tabular-nums",
    "count-sm":
      "min-w-6 h-6 px-1.5 text-xs justify-center font-semibold tabular-nums",
  }

  const shapeClasses: Record<ApplicationBadgeShape, string> = {
    pill: "rounded-full",
    rounded: "rounded-lg",
    square: "rounded-md",
  }

  // Count badges default to a rounded rectangle
  const resolvedShape =
    shape === "pill" &&
    (size === "count" || size === "count-sm" || variant.startsWith("count-"))
      ? "rounded"
      : shape

  const styleClass = color
    ? getColorClasses(color, mode)
    : variantClasses[variant]

  const isClickable = Boolean(props.onClick)
  const defaultHover = isClickable ? { scale: 1.04 } : undefined
  const defaultTap = isClickable ? { scale: 0.96 } : undefined

  return (
    <motion.span
      data-slot="application-badge"
      whileHover={whileHover !== undefined ? whileHover : defaultHover}
      whileTap={whileTap !== undefined ? whileTap : defaultTap}
      transition={{ type: "spring", stiffness: 450, damping: 25 }}
      className={cn(
        "inline-flex w-fit shrink-0 items-center border whitespace-nowrap transition-colors duration-150 select-none",
        sizeClasses[size],
        shapeClasses[resolvedShape],
        styleClass,
        isClickable && "cursor-pointer",
        className
      )}
      {...props}
    >
      {dot && (
        <span className="relative flex size-1.5 shrink-0">
          {pulseDot && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
          )}
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      )}

      {startIcon && (
        <span
          className="inline-flex shrink-0 items-center justify-center [&_svg]:size-3.5"
          aria-hidden="true"
        >
          {startIcon}
        </span>
      )}

      {children}

      {iconRight && (
        <span
          className="inline-flex shrink-0 items-center justify-center [&_svg]:size-3.5"
          aria-hidden="true"
        >
          {iconRight}
        </span>
      )}
    </motion.span>
  )
}

export default ApplicationBadge
