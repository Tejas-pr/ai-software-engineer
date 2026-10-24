import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { ChevronsUpDown, ChevronDown } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import {
  ApplicationCombobox,
  type ApplicationComboboxOption,
} from "@/components/molecules/application/application-combobox"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectPrimitive,
  SelectSeparator,
  SelectValue,
} from "@workspace/ui/components/select"

export type ApplicationSelectionSize = "default" | "sm" | "lg"
export type ApplicationSelectionIndicator =
  "chevrons-up-down" | "chevron-down" | "none"

export type ApplicationSelectionOption = ApplicationComboboxOption

export interface ApplicationSelectionProps {
  /** Field label displayed above the select */
  label?: React.ReactNode
  /** Classes for the label, e.g. a compact label in a dense panel */
  labelClassName?: string
  /** Required field indicator (adds red asterisk *) */
  required?: boolean
  /** Action element rendered at the end of the label row */
  labelAction?: React.ReactNode
  /** Helper text displayed beneath the select */
  description?: React.ReactNode
  /** Error message displayed beneath the select with error styling */
  error?: React.ReactNode

  /** Placeholder text shown when no value is selected */
  placeholder?: string
  /** Selected value */
  value?: string | null
  /** Default selected value (uncontrolled) */
  defaultValue?: string | null
  /** Callback fired when selection changes */
  onValueChange?: (value: string | null) => void

  /** Array of simple options. Alternatively, pass `<SelectItem>` children. */
  options?: readonly ApplicationSelectionOption[]
  /** Custom children (e.g. `<SelectItem>`, `<SelectGroup>`) */
  children?: React.ReactNode

  /**
   * Selection size preset:
   * - `"default"`: 36px height, 8px radius
   * - `"lg"`: 40px height, 12px radius
   * - `"sm"`: 28px compact
   * @default "default"
   */
  size?: ApplicationSelectionSize

  /**
   * Indicator icon on the right side:
   * - `"chevrons-up-down"`: Dual up/down arrows
   * - `"chevron-down"`: Single downward arrow
   * - `"none"`: No indicator icon
   * @default "chevrons-up-down"
   */
  indicator?: ApplicationSelectionIndicator

  /** Optional icon rendered on the left of the select trigger */
  iconLeft?: React.ReactNode
  /** Custom right icon overriding the indicator */
  iconRight?: React.ReactNode

  /** Disabled state */
  disabled?: boolean
  /** HTML name attribute for form submission */
  name?: string
  /** Custom padding override */
  padding?: string
  /** Custom classes for outer container */
  className?: string
  /** Custom classes for the select trigger button */
  triggerClassName?: string
  /** Custom classes for the dropdown popup content */
  contentClassName?: string
  /** Custom classes for dropdown items */
  itemClassName?: string
  /** Gap offset in px between trigger and popup content (default 6, 4px grid) */
  sideOffset?: number
  /** Enable search / filtering in the dropdown via ApplicationCombobox */
  searchable?: boolean
  /** Placeholder for the search input when searchable is enabled */
  searchPlaceholder?: string
  /** ARIA label for the select trigger */
  "aria-label"?: string
}

/**
 * Standard Application Selection.
 *
 * Design:
 * - 36px (default) or 40px (lg) height
 * - 8px (rounded-lg) or 12px (rounded-xl) radius
 * - ChevronsUpDown or ChevronDown indicators
 * - Accessible error and helper description messaging
 * - Optional searchable combobox mode via ApplicationCombobox
 */
export function ApplicationSelection({
  label,
  required,
  labelAction,
  description,
  error,
  placeholder: placeholderProp,
  value,
  defaultValue,
  onValueChange,
  options,
  children,
  size = "default",
  indicator = "chevrons-up-down",
  iconLeft,
  iconRight,
  disabled,
  name,
  padding,
  className,
  triggerClassName,
  labelClassName,
  contentClassName,
  itemClassName,
  sideOffset = 6,
  searchable,
  searchPlaceholder,
  "aria-label": ariaLabel,
}: ApplicationSelectionProps) {
  const generatedId = React.useId()

  const [internalValue, setInternalValue] = React.useState<string | null>(
    defaultValue ?? null
  )
  const [prevDefaultValue, setPrevDefaultValue] = React.useState(defaultValue)
  if (defaultValue !== prevDefaultValue) {
    setPrevDefaultValue(defaultValue)
    if (value === undefined) {
      setInternalValue(defaultValue ?? null)
    }
  }

  const isControlled = value !== undefined
  const currentValue = isControlled ? value : internalValue

  const handleValueChange = (val: string | null) => {
    if (!isControlled) {
      setInternalValue(val)
    }
    onValueChange?.(val)
  }

  const placeholder = placeholderProp ?? "Select ..."

  // Delegate to ApplicationCombobox when searchable is requested
  if (searchable && options) {
    return (
      <ApplicationCombobox
        label={label}
        required={required}
        labelAction={labelAction}
        description={description}
        error={error}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        options={options}
        size={size}
        indicator={indicator}
        iconLeft={iconLeft}
        iconRight={iconRight}
        disabled={disabled}
        name={name}
        padding={padding}
        className={className}
        triggerClassName={triggerClassName}
        contentClassName={contentClassName}
        itemClassName={itemClassName}
        sideOffset={sideOffset}
      />
    )
  }

  const sizeClasses: Record<ApplicationSelectionSize, string> = {
    default: "h-9 rounded-lg px-3 text-xs gap-1.5",
    sm: "h-7 rounded-md px-2 text-xs gap-1",
    lg: "h-10 rounded-xl px-3.5 text-xs sm:text-sm gap-2",
  }

  const itemSizeClasses: Record<ApplicationSelectionSize, string> = {
    default: "min-h-8 px-3.5 py-1.5 text-xs gap-2 rounded-lg",
    sm: "min-h-[30px] px-3 py-1.5 text-[0.75rem] gap-1.5 rounded-lg",
    lg: "min-h-9 px-4 py-2 text-sm gap-2.5 rounded-lg",
  }

  const iconSizes: Record<ApplicationSelectionSize, string> = {
    default: "size-4",
    sm: "size-3.5",
    lg: "size-4.5",
  }

  const renderIndicatorIcon = () => {
    if (iconRight) return iconRight
    if (indicator === "none") return null
    if (indicator === "chevron-down") {
      return (
        <ChevronDown
          className={cn(
            "pointer-events-none shrink-0 text-muted-foreground",
            iconSizes[size]
          )}
        />
      )
    }
    return (
      <ChevronsUpDown
        className={cn(
          "pointer-events-none shrink-0 text-muted-foreground",
          iconSizes[size]
        )}
      />
    )
  }

  const stateClass = error
    ? "border-destructive focus-visible:border-destructive focus-visible:ring-2 focus-visible:ring-destructive/20"
    : "border-input focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-primary/25"

  const triggerControl = (
    <div className="relative w-full">
      {name && <input type="hidden" name={name} value={currentValue ?? ""} />}
      <Select
        items={options ? [...options] : undefined}
        // Always controlled here (this component owns the value): null is
        // "nothing selected". undefined would make Base UI treat it as
        // uncontrolled, then warn when a value is picked.
        value={currentValue}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          // The label's htmlFor: names the select for screen readers
          id={generatedId}
          aria-label={ariaLabel}
          aria-invalid={error ? true : undefined}
          data-slot="application-selection-trigger"
          className={cn(
            "flex w-full cursor-pointer items-center justify-between border bg-background text-foreground shadow-xs transition-all duration-200 outline-none select-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
            sizeClasses[size],
            stateClass,
            padding,
            triggerClassName
          )}
        >
          <div className="flex flex-1 items-center gap-2.5 overflow-hidden">
            {iconLeft && (
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4",
                  iconSizes[size]
                )}
                aria-hidden="true"
              >
                {iconLeft}
              </span>
            )}
            <SelectValue
              placeholder={placeholder}
              className={cn(
                "flex-1 truncate text-start text-xs data-placeholder:text-xs data-placeholder:text-muted-foreground",
                size === "lg" && "sm:text-sm sm:data-placeholder:text-sm"
              )}
            />
          </div>

          <SelectPrimitive.Icon
            render={
              <span className="flex shrink-0 items-center justify-center ps-2">
                {renderIndicatorIcon()}
              </span>
            }
          />
        </SelectPrimitive.Trigger>

        <SelectContent
          alignItemWithTrigger={false}
          side="bottom"
          sideOffset={sideOffset}
          align="start"
          className={cn(
            "w-auto min-w-[max(var(--anchor-width),180px)] rounded-xl border border-border/70 bg-popover p-1.5 text-popover-foreground shadow-xl",
            contentClassName
          )}
        >
          {options
            ? options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={cn(
                    "cursor-pointer rounded-lg font-medium transition-colors hover:bg-muted/70 data-selected:font-semibold data-selected:text-link",
                    itemSizeClasses[size],
                    itemClassName
                  )}
                >
                  <div className="flex flex-col">
                    <span>
                      {typeof option.label === "string"
                        ? option.label
                        : option.label}
                    </span>
                    {option.description && (
                      <span className="text-xs font-normal text-muted-foreground">
                        {option.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))
            : children}
        </SelectContent>
      </Select>
    </div>
  )

  if (!label && !labelAction && !description && !error) {
    return (
      <div
        data-slot="application-selection"
        className={cn("w-full", className)}
      >
        {triggerControl}
      </div>
    )
  }

  return (
    <div
      data-slot="application-selection"
      className={cn("flex w-full flex-col gap-1.5 sm:gap-2", className)}
    >
      {(label || labelAction) && (
        <div className="flex min-h-7 items-center justify-between gap-2 font-sans text-[0.875rem] leading-5 font-medium tracking-[-0.15px] text-foreground">
          {label && (
            <label
              htmlFor={generatedId}
              className={cn("cursor-pointer select-none", labelClassName)}
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

      {triggerControl}

      {/* Only a message that appears or changes later animates: one that's
          there when the field mounts (a page or dialog opening) just shows */}
      <AnimatePresence mode="wait" initial={false}>
        {error ? (
          <motion.p
            key="select-error"
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
            key="select-desc"
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

export { SelectItem, SelectGroup, SelectLabel, SelectSeparator }
export { ApplicationCombobox }
export default ApplicationSelection
