import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { ChevronDown } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPrimitive,
  SelectValue,
} from "@workspace/ui/components/select"

export type ApplicationInputSize = "default" | "sm" | "lg"

export type ApplicationInputIconPosition = "left" | "right"

export interface ApplicationInputVariantsProps {
  size?: ApplicationInputSize
  hasLeftIcon?: boolean
  hasRightIcon?: boolean
  isError?: boolean
  isDisabled?: boolean
  hasSelection?: boolean
  className?: string
}

// eslint-disable-next-line react-refresh/only-export-components
export const applicationInputVariants = ({
  size = "default",
  isError = false,
  isDisabled = false,
  className,
}: ApplicationInputVariantsProps = {}) => {
  const base =
    "group/app-input relative flex w-full shrink-0 items-center overflow-hidden transition-all duration-200 border bg-card shadow-xs outline-none text-foreground dark:bg-card/40"

  const sizeClasses: Record<ApplicationInputSize, string> = {
    // Form inputs: Fill (36px), Radius 8px (rounded-lg from globals.css)
    default: "h-9 rounded-lg text-xs",
    // Compact: 28px, Radius 6px (rounded-md from globals.css)
    sm: "h-7 rounded-md text-xs",
    // Large inputs: 40px, Radius 12px (rounded-xl from globals.css)
    lg: "h-10 rounded-xl text-xs sm:text-sm",
  }

  const stateClass = isError
    ? "border-destructive focus-within:border-destructive focus-within:ring-2 focus-within:ring-destructive/20"
    : "border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-primary/25"

  const disabledClass = isDisabled
    ? "opacity-50 cursor-not-allowed bg-muted/40"
    : ""

  return cn(base, sizeClasses[size], stateClass, disabledClass, className)
}

export interface ApplicationInputSelectionOption {
  label: React.ReactNode
  value: string
  disabled?: boolean
}

export interface ApplicationInputSelectionProps {
  /** Array of selectable options in the dropdown */
  options: ApplicationInputSelectionOption[]
  /** Controlled value */
  value?: string | null
  /** Default uncontrolled value */
  defaultValue?: string | null
  /** Change callback */
  onValueChange?: (value: string | null) => void
  /** Placeholder text when nothing is selected */
  placeholder?: string
  /** Disabled state */
  disabled?: boolean
  /** Width class for the dropdown addon (e.g. "w-28", "w-32", "w-auto") */
  width?: string
  /** Name attribute */
  name?: string
  /** Custom classes for dropdown trigger */
  className?: string
}

export interface ApplicationInputProps extends Omit<
  React.ComponentProps<"input">,
  "size"
> {
  /**
   * Field label displayed above the input.
   */
  label?: React.ReactNode

  /**
   * Indicates if the field is required. Renders a red asterisk (*) next to label.
   */
  required?: boolean

  /**
   * Action or secondary element shown on the right side of the label row
   * (e.g. "Forgot password?" link).
   */
  labelAction?: React.ReactNode

  /**
   * Helper description text displayed beneath the input.
   */
  description?: React.ReactNode

  /**
   * Error message displayed beneath the input. Automatically sets input to error styling.
   */
  error?: React.ReactNode

  /**
   * Input size preset:
   * - `"default"`: 36px height, 8px radius
   * - `"lg"`: 40px height, 12px radius
   * - `"sm"`: 28px compact
   * @default "default"
   */
  size?: ApplicationInputSize

  /**
   * Custom padding override for the input container.
   */
  padding?: string

  /**
   * Icon element to display inside the input.
   */
  icon?: React.ReactNode

  /**
   * Position of `icon` (`"left"` or `"right"`).
   * @default "left"
   */
  iconPosition?: ApplicationInputIconPosition

  /**
   * Dedicated slot for an icon placed at the start (left).
   */
  iconLeft?: React.ReactNode

  /**
   * Dedicated slot for an icon or action button placed at the end (right).
   */
  iconRight?: React.ReactNode

  /**
   * Integrated unit/selection dropdown addon (e.g. Pint/Day, MERV, kg, lbs, %, sq ft).
   * Renders a connected select dropdown separated by a vertical border.
   */
  selection?: ApplicationInputSelectionProps

  /**
   * Position of the selection dropdown (`"right"` or `"left"`).
   * @default "right"
   */
  selectionPosition?: "left" | "right"

  /**
   * Custom addon element (e.g. button, badge, unit text).
   */
  addon?: React.ReactNode

  /**
   * Custom classes applied to the outer wrapper container.
   */
  containerClassName?: string

  /**
   * Custom classes applied directly to the `<input>` element.
   */
  inputClassName?: string

  /**
   * Custom classes applied to the label text (e.g. uppercase tracking-wider).
   */
  labelClassName?: string

  /**
   * Custom styles applied to the label text.
   */
  labelStyle?: React.CSSProperties
}

/**
 * Standard Application Input.
 *
 * Design:
 * - 40px (default) or 44px (lg) height
 * - 8px (default) or 12px (lg) rounded border radius
 * - Integrated start/end icons from Lucide React
 * - Integrated selection dropdown addon (Pint/Day, MERV, kg, lbs, etc.)
 * - Red required asterisk (*) and optional labelAction slot
 * - Accessible error and helper description messaging
 */
export function ApplicationInput({
  id,
  label,
  required,
  labelAction,
  description,
  error,
  size = "default",
  padding,
  icon,
  iconPosition = "left",
  iconLeft,
  iconRight,
  selection,
  selectionPosition = "right",
  addon,
  className,
  containerClassName,
  inputClassName,
  labelClassName,
  labelStyle,
  disabled,
  type = "text",
  ...props
}: ApplicationInputProps) {
  const generatedId = React.useId()
  const inputId = id ?? (label ? generatedId : undefined)
  const messageId = `${inputId ?? generatedId}-message`
  const hasMessage = Boolean(error || description)

  const startIcon = iconLeft ?? (icon && iconPosition === "left" ? icon : null)
  const endIcon = iconRight ?? (icon && iconPosition === "right" ? icon : null)

  const hasLeftIcon = Boolean(startIcon)
  const hasRightIcon = Boolean(endIcon)

  const iconSizes: Record<ApplicationInputSize, string> = {
    default: "left-3 [&_svg]:size-3.5 sm:[&_svg]:size-4",
    sm: "left-2 [&_svg]:size-3",
    lg: "left-3.5 [&_svg]:size-4",
  }

  const endIconSizes: Record<ApplicationInputSize, string> = {
    default: "right-2.5 [&_svg]:size-3.5 sm:[&_svg]:size-4",
    sm: "right-2 [&_svg]:size-3",
    lg: "right-3 [&_svg]:size-4",
  }

  const inputPaddings: Record<
    ApplicationInputSize,
    { default: string; withLeftIcon: string; withRightIcon: string }
  > = {
    default: {
      default: "px-3",
      withLeftIcon: "ps-9 pe-3",
      withRightIcon: "ps-3 pe-9",
    },
    sm: {
      default: "px-2",
      withLeftIcon: "ps-7 pe-2",
      withRightIcon: "ps-2 pe-7",
    },
    lg: {
      default: "px-3.5",
      withLeftIcon: "ps-10 pe-3.5",
      withRightIcon: "ps-3.5 pe-10",
    },
  }

  const getInputPadding = () => {
    if (padding) return padding
    if (hasLeftIcon && hasRightIcon && !selection) {
      return size === "sm"
        ? "ps-9 pe-9"
        : size === "lg"
          ? "ps-12 pe-12"
          : "ps-11 pe-11"
    }
    if (hasLeftIcon) return inputPaddings[size].withLeftIcon
    if (hasRightIcon && !selection) return inputPaddings[size].withRightIcon
    return inputPaddings[size].default
  }

  const selectionDropdown = selection ? (
    <Select
      value={selection.value}
      defaultValue={selection.defaultValue}
      onValueChange={selection.onValueChange}
      disabled={disabled || selection.disabled}
      name={selection.name}
    >
      <SelectPrimitive.Trigger
        data-slot="application-input-selection-trigger"
        className={cn(
          "flex h-full shrink-0 cursor-pointer items-center justify-between gap-1.5 px-3 text-xs font-medium text-foreground transition-colors outline-none select-none hover:bg-muted/30 focus-visible:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50",
          selectionPosition === "right"
            ? "border-s border-input"
            : "border-e border-input",
          selection.width ?? "w-auto min-w-24",
          selection.className
        )}
      >
        <SelectValue
          placeholder={selection.placeholder ?? "Select"}
          className="flex-1 truncate text-start data-placeholder:text-muted-foreground"
        />
        <SelectPrimitive.Icon
          render={
            <span className="flex shrink-0 items-center justify-center ps-1 text-inherit">
              <ChevronDown className="size-3.5" />
            </span>
          }
        />
      </SelectPrimitive.Trigger>

      <SelectContent align="end" side="bottom" sideOffset={6}>
        {selection.options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : null

  // Standalone mode: if no label, labelAction, description, or error, the
  // control is the outer element, so it takes containerClassName too
  const isStandalone = !label && !labelAction && !description && !error

  const inputControl = (
    <motion.div
      data-slot="application-input-control"
      animate={error ? { x: [0, -3, 3, -2, 2, 0] } : { x: 0 }}
      transition={{ duration: 0.28, ease: "easeInOut" }}
      className={applicationInputVariants({
        size,
        hasLeftIcon,
        hasRightIcon,
        isError: Boolean(error),
        isDisabled: Boolean(disabled),
        hasSelection: Boolean(selection),
        className: cn(isStandalone && containerClassName, className),
      })}
    >
      {/* Left selection dropdown if selectionPosition === "left" */}
      {selectionPosition === "left" && selectionDropdown}

      {/* Start icon */}
      {startIcon && (
        <span
          className={cn(
            "pointer-events-none absolute flex items-center justify-center text-muted-foreground",
            iconSizes[size]
          )}
          aria-hidden="true"
        >
          {startIcon}
        </span>
      )}

      {/* Main input element */}
      <input
        id={inputId}
        type={type}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={hasMessage ? messageId : undefined}
        className={cn(
          "size-full min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-xs placeholder:text-muted-foreground disabled:cursor-not-allowed",
          size === "lg" && "sm:text-sm sm:placeholder:text-sm",
          getInputPadding(),
          inputClassName
        )}
        {...props}
      />

      {/* Right icon when no selection dropdown */}
      {!selectionDropdown && endIcon && (
        <span
          className={cn(
            "absolute flex items-center justify-center text-muted-foreground",
            endIconSizes[size]
          )}
        >
          {endIcon}
        </span>
      )}

      {/* Optional custom addon */}
      {addon}

      {/* Right selection dropdown if selectionPosition === "right" */}
      {selectionPosition === "right" && selectionDropdown}
    </motion.div>
  )

  if (isStandalone) {
    return inputControl
  }

  return (
    <div
      data-slot="application-input"
      className={cn(
        "flex w-full flex-col gap-1.5 sm:gap-2",
        containerClassName
      )}
    >
      {(label || labelAction) && (
        <div className="flex min-h-7 items-center justify-between gap-2 font-sans text-[0.875rem] leading-5 font-medium tracking-[-0.15px] text-foreground">
          {label && (
            <label
              htmlFor={inputId}
              className={cn("cursor-pointer select-none", labelClassName)}
              style={labelStyle}
            >
              {label}
              {required && (
                <span
                  className="ms-0.5 font-semibold text-destructive"
                  aria-hidden="true"
                >
                  *
                </span>
              )}
            </label>
          )}
          {labelAction && <div>{labelAction}</div>}
        </div>
      )}

      {inputControl}

      {/* Only a message that appears or changes later animates: one that's
          there when the field mounts (a page or dialog opening) just shows */}
      <AnimatePresence mode="wait" initial={false}>
        {error ? (
          <motion.p
            key="input-error"
            id={messageId}
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mt-0.5 overflow-hidden text-xs font-medium text-destructive"
          >
            {error}
          </motion.p>
        ) : description ? (
          <motion.p
            key="input-desc"
            id={messageId}
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mt-0.5 overflow-hidden text-xs text-muted-foreground"
          >
            {description}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default ApplicationInput
