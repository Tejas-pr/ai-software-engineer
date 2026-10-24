import * as React from "react"
import { motion, type HTMLMotionProps } from "motion/react"
import { cn } from "@workspace/ui/lib/utils"

export type ApplicationButtonVariant =
  | "primary"
  | "secondary"
  | "highlight"
  | "cta"
  | "glass"
  | "outline"
  | "ghost"
  | "destructive"

export type ApplicationButtonSize =
  "default" | "sm" | "lg" | "xl" | "icon" | "icon-sm"

export type ApplicationButtonIconPosition = "left" | "right"

export interface ApplicationButtonVariantsProps {
  variant?: ApplicationButtonVariant
  size?: ApplicationButtonSize
  className?: string
}

// eslint-disable-next-line react-refresh/only-export-components
export const applicationButtonVariants = ({
  variant = "primary",
  size = "default",
  className,
}: ApplicationButtonVariantsProps = {}) => {
  const base =
    "group/app-button relative inline-flex items-center justify-center font-medium tracking-[-0.01em] whitespace-nowrap select-none outline-none transition-[background-color,border-color,color,box-shadow,opacity] duration-150 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"

  const variants: Record<ApplicationButtonVariant, string> = {
    // Amber key-cap: a lit top edge and a darker lip underneath, so it reads
    // as something you can press rather than a flat colored box
    primary:
      "bg-primary text-primary-foreground border border-[color-mix(in_oklab,var(--primary),black_14%)] shadow-[inset_0_1px_0_0_rgb(255_255_255/0.45),0_1px_0_0_color-mix(in_oklab,var(--primary),black_30%),0_2px_6px_-2px_color-mix(in_oklab,var(--primary),black_40%)] hover:bg-[color-mix(in_oklab,var(--primary),white_10%)]",
    // Quiet bordered action on the card surface
    secondary:
      "bg-card text-foreground border border-border shadow-[0_1px_0_0_var(--border)] hover:border-foreground/20 hover:bg-muted/50",
    // Ink solid: the confident action next to an amber one
    highlight:
      "bg-highlight text-highlight-foreground border border-transparent shadow-[inset_0_1px_0_0_rgb(255_255_255/0.12),0_2px_8px_-3px_rgb(0_0_0/0.4)] hover:bg-highlight/90",
    // Warm amber gradient (landing hero)
    cta: "bg-linear-160/oklab from-cta-from to-cta-to text-primary-foreground border border-[color-mix(in_oklab,var(--cta-to),black_12%)] shadow-[inset_0_1px_0_0_rgb(255_255_255/0.5),0_6px_20px_-8px_var(--cta-to)] hover:brightness-105",
    // Translucent, over artwork or the hero grid
    glass:
      "bg-card/60 text-foreground border border-border backdrop-blur-sm hover:bg-card hover:border-foreground/15",
    outline:
      "bg-transparent text-foreground border border-border hover:bg-muted/60",
    ghost:
      "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/70",
    destructive:
      "bg-destructive text-destructive-foreground border border-transparent hover:bg-destructive/90 shadow-sm",
  }

  // 4px grid, mobile first:
  // - default: 32px / 36px desktop, 8px radius
  // - sm: 28px, 6px radius
  // - lg: 36px / 40px desktop, 10px radius
  // - xl: 48px, 16px text (landing hero)
  // - icon: 32 / 36px square; icon-sm: 28px square
  const sizes: Record<ApplicationButtonSize, string> = {
    default:
      "min-h-8 sm:min-h-9 px-3 sm:px-3.5 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg gap-1.5",
    sm: "min-h-7 px-2.5 py-1 text-xs rounded-md gap-1",
    lg: "min-h-9 sm:min-h-10 px-3.5 sm:px-4 py-1.5 sm:py-2 text-sm rounded-[10px] gap-2",
    xl: "min-h-12 px-6 sm:px-7 py-3 text-[0.9375rem] rounded-xl gap-2",
    icon: "size-8 sm:size-9 p-0 rounded-lg justify-center [&_svg:not([class*='size-'])]:size-4",
    "icon-sm":
      "size-7 min-h-0 p-0 rounded-md justify-center [&_svg:not([class*='size-'])]:size-3.5 sm:[&_svg:not([class*='size-'])]:size-4",
  }

  return cn(base, variants[variant], sizes[size], className)
}

export interface ApplicationButtonProps extends Omit<
  HTMLMotionProps<"button">,
  "children"
> {
  /**
   * Visual variant of the button:
   * - `"primary"`: Amber key-cap (the main action)
   * - `"secondary"`: Bordered card-surface button
   * - `"highlight"`: Ink solid, for the confident action beside an amber one
   * - `"cta"`: Warm amber gradient (landing)
   * - `"glass"`: Translucent, over artwork
   * - `"outline"`: Neutral subtle border
   * - `"ghost"`: Transparent; header and icon actions
   * - `"destructive"`: Danger action
   * @default "primary"
   */
  variant?: ApplicationButtonVariant

  /**
   * Button size preset:
   * - `"default"`: 36px height, 8px radius
   * - `"sm"`: 28px compact
   * - `"lg"`: 40px large
   * - `"xl"`: 48px, 15px text (landing hero)
   * - `"icon"`: 36px square icon button
   * - `"icon-sm"`: 28px compact square icon button
   * @default "default"
   */
  size?: ApplicationButtonSize

  /**
   * Custom padding class override (e.g. `"px-8 py-4"` or `"p-3"`).
   */
  padding?: string

  /**
   * Icon element to display alongside the button label.
   */
  icon?: React.ReactNode

  /**
   * Position of `icon` relative to button text (`"left"` or `"right"`).
   * @default "left"
   */
  iconPosition?: ApplicationButtonIconPosition

  /**
   * Dedicated icon slot placed before children (left / start).
   */
  iconLeft?: React.ReactNode

  /**
   * Dedicated icon slot placed after children (right / end).
   */
  iconRight?: React.ReactNode

  /**
   * Whether to enable motion micro-interactions (whileHover, whileTap).
   * @default true
   */
  animated?: boolean

  children?: React.ReactNode

  ref?: React.Ref<HTMLButtonElement>
}

/**
 * Standard Application Button with Motion micro-interactions (motion.dev).
 *
 * - Amber key-cap primary, ink highlight, quiet secondary
 * - A press that dips 1px and squeezes slightly, like a real key
 * - Radius on the 4px grid
 */
export function ApplicationButton({
  className,
  variant = "primary",
  size = "default",
  padding,
  icon,
  iconPosition = "left",
  iconLeft,
  iconRight,
  children,
  type = "button",
  animated = true,
  whileHover,
  whileTap,
  transition,
  disabled,
  ref,
  ...props
}: ApplicationButtonProps) {
  const startIcon = iconLeft ?? (icon && iconPosition === "left" ? icon : null)
  const endIcon = iconRight ?? (icon && iconPosition === "right" ? icon : null)

  const defaultHover = animated && !disabled ? { y: -1 } : undefined
  const defaultTap = animated && !disabled ? { y: 1, scale: 0.98 } : undefined
  const defaultTransition = {
    type: "spring" as const,
    stiffness: 600,
    damping: 32,
  }

  return (
    <motion.button
      ref={ref}
      data-slot="application-button"
      type={type}
      disabled={disabled}
      whileHover={whileHover !== undefined ? whileHover : defaultHover}
      whileTap={whileTap !== undefined ? whileTap : defaultTap}
      transition={transition ?? defaultTransition}
      className={cn(
        applicationButtonVariants({ variant, size }),
        padding,
        className
      )}
      {...props}
    >
      {startIcon && (
        <span
          className="inline-flex shrink-0 items-center justify-center [&_svg]:size-3.5 sm:[&_svg]:size-4"
          aria-hidden="true"
        >
          {startIcon}
        </span>
      )}
      {children}
      {endIcon && (
        <span
          className="inline-flex shrink-0 items-center justify-center transition-transform duration-200 group-hover/app-button:translate-x-0.5 [&_svg]:size-3.5 sm:[&_svg]:size-4"
          aria-hidden="true"
        >
          {endIcon}
        </span>
      )}
    </motion.button>
  )
}

export default ApplicationButton
