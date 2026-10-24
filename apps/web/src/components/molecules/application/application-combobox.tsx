import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { ChevronsUpDown, ChevronDown, Check } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import { useDebounce } from "@/hooks/common/use-debounce"

export type ApplicationComboboxSize = "default" | "sm" | "lg"
export type ApplicationComboboxIndicator =
  "chevrons-up-down" | "chevron-down" | "none"

export interface ApplicationComboboxOption {
  label: React.ReactNode
  value: string
  disabled?: boolean
  description?: string
}

export interface ApplicationComboboxProps {
  /** Field label displayed above the combobox */
  label?: React.ReactNode
  /** Required field indicator (adds red asterisk *) */
  required?: boolean
  /** Action element rendered at the end of the label row */
  labelAction?: React.ReactNode
  /** Helper text displayed beneath the combobox */
  description?: React.ReactNode
  /** Error message displayed beneath the combobox with error styling */
  error?: React.ReactNode

  /** Placeholder text shown when no value is selected */
  placeholder?: string
  /** Search input placeholder */
  searchPlaceholder?: string
  /** Debounce delay for search in milliseconds (default 200ms) */
  searchDebounceMs?: number
  /** Callback fired when search query changes (debounced) */
  onSearchChange?: (search: string) => void
  /** Empty state message */
  emptyText?: string

  /** Selected value */
  value?: string | null
  /** Default selected value (uncontrolled) */
  defaultValue?: string | null
  /** Callback fired when selection changes */
  onValueChange?: (value: string | null) => void

  /** Array of selectable options */
  options: readonly ApplicationComboboxOption[]

  /**
   * Selection size preset:
   * - `"default"`: 36px height, 8px radius
   * - `"lg"`: 40px height, 12px radius
   * - `"sm"`: 28px compact
   * @default "default"
   */
  size?: ApplicationComboboxSize

  /**
   * Indicator icon on the right side:
   * - `"chevrons-up-down"`: Dual up/down arrows
   * - `"chevron-down"`: Single downward arrow
   * - `"none"`: No indicator icon
   * @default "chevrons-up-down"
   */
  indicator?: ApplicationComboboxIndicator

  /** Optional icon rendered on the left of the trigger */
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
  /** Custom classes for trigger button */
  triggerClassName?: string
  /** Custom classes for popup content */
  contentClassName?: string
  /** Custom classes for items */
  itemClassName?: string
  /** Gap offset in px between trigger and popup content (default 6) */
  sideOffset?: number
}

/**
 * Reusable Application Combobox.
 *
 * Implements searchable dropdowns with full keyboard navigation,
 * real-time filtering, native form input syncing.
 */
export function ApplicationCombobox({
  label,
  required,
  labelAction,
  description,
  error,
  placeholder,
  searchPlaceholder,
  searchDebounceMs = 200,
  onSearchChange,
  emptyText,
  value,
  defaultValue,
  onValueChange,
  options,
  size = "default",
  indicator = "chevrons-up-down",
  iconLeft,
  iconRight,
  disabled,
  name,
  padding,
  className,
  triggerClassName,
  contentClassName,
  itemClassName,
  sideOffset = 6,
}: ApplicationComboboxProps) {
  const generatedId = React.useId()
  const [open, setOpen] = React.useState(false)
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

  const [searchValue, setSearchValue] = React.useState("")
  const debouncedSearch = useDebounce(searchValue, searchDebounceMs)

  React.useEffect(() => {
    onSearchChange?.(debouncedSearch)
  }, [debouncedSearch, onSearchChange])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setSearchValue("")
    }
  }

  const isControlled = value !== undefined
  const currentValue = isControlled ? value : internalValue

  const selectedOption = React.useMemo(() => {
    return options.find((opt) => opt.value === currentValue)
  }, [options, currentValue])

  const handleSelect = (val: string) => {
    const nextVal = val === currentValue ? null : val
    if (!isControlled) {
      setInternalValue(nextVal)
    }
    onValueChange?.(nextVal)
    setOpen(false)
  }

  const sizeClasses: Record<ApplicationComboboxSize, string> = {
    default: "h-9 rounded-lg px-3 text-xs gap-1.5",
    sm: "h-7 rounded-md px-2 text-xs gap-1",
    lg: "h-10 rounded-xl px-3.5 text-xs sm:text-sm gap-2",
  }

  const iconSizes: Record<ApplicationComboboxSize, string> = {
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
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <button
              id={generatedId}
              type="button"
              disabled={disabled}
              data-slot="application-combobox-trigger"
              className={cn(
                "flex w-full cursor-pointer items-center justify-between border bg-card text-foreground shadow-xs transition-all duration-200 outline-none select-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-card/40",
                sizeClasses[size],
                stateClass,
                padding,
                triggerClassName
              )}
            />
          }
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
            <span
              className={cn(
                "flex-1 truncate text-start text-xs",
                size === "lg" && "sm:text-sm",
                !selectedOption && "text-muted-foreground"
              )}
            >
              {selectedOption
                ? typeof selectedOption.label === "string"
                  ? selectedOption.label
                  : selectedOption.label
                : (placeholder ?? "Select ...")}
            </span>
          </div>

          <span className="flex shrink-0 items-center justify-center ps-2">
            {renderIndicatorIcon()}
          </span>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={sideOffset}
          className={cn(
            "w-(--anchor-width) min-w-[var(--anchor-width)] overflow-hidden rounded-lg border border-border/80 bg-popover p-0 text-popover-foreground shadow-lg",
            contentClassName
          )}
        >
          <Command className="w-full">
            <CommandInput
              placeholder={searchPlaceholder ?? "Search..."}
              value={searchValue}
              onValueChange={setSearchValue}
              className="h-8 text-xs placeholder:text-xs"
            />
            <CommandList className="max-h-[min(240px,calc(100svh-12rem))] scroll-py-1 overflow-y-auto">
              <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                {emptyText ?? "No results found."}
              </CommandEmpty>
              <CommandGroup className="p-1">
                {options.map((option) => {
                  const isSelected = option.value === currentValue
                  return (
                    <CommandItem
                      key={option.value}
                      value={`${typeof option.label === "string" ? option.label : ""} ${option.value}`}
                      disabled={option.disabled}
                      onSelect={() => handleSelect(option.value)}
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm font-medium transition-colors hover:bg-accent/70 aria-selected:bg-accent sm:py-1.5 sm:text-xs",
                        isSelected &&
                          "bg-brand-soft/60 font-semibold text-foreground",
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
                          <span className="text-2xs font-normal text-muted-foreground">
                            {option.description}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="size-3.5 stroke-[2.5] text-link" />
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )

  if (!label && !labelAction && !description && !error) {
    return (
      <div data-slot="application-combobox" className={cn("w-full", className)}>
        {triggerControl}
      </div>
    )
  }

  return (
    <div
      data-slot="application-combobox"
      className={cn("flex w-full flex-col gap-1.5 sm:gap-2", className)}
    >
      {(label || labelAction) && (
        <div className="flex min-h-7 items-center justify-between gap-2 font-sans text-[0.875rem] leading-5 font-medium tracking-[-0.15px] text-foreground">
          {label && (
            <label htmlFor={generatedId} className="cursor-pointer select-none">
              {label}
              {required && (
                <span
                  className="ml-0.5 font-semibold text-destructive"
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
            key="combobox-error"
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
            key="combobox-desc"
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

export default ApplicationCombobox
