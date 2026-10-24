import * as React from "react"
import { useState } from "react"
import { format, isValid } from "date-fns"
import { Clock, Check } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Calendar, type DateRange } from "@workspace/ui/components/calendar"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@workspace/ui/components/popover"
import ApplicationButton from "./application-button"

export type ScheduleFrequency = "one-time" | "daily" | "weekly"

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat"

export type { DateRange }

const WEEKDAYS: { id: Weekday; label: string }[] = [
  { id: "sun", label: "Sun" },
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
]

/**
 * Custom calendar icon:
 * Two vertical binder tabs at top, a solid filled top header band,
 * and a clean hollow rectangular outline body.
 */
export function CalendarIcon({
  className,
  ...props
}: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-4 shrink-0", className)}
      aria-hidden="true"
      {...props}
    >
      {/* Top hanger tabs */}
      <rect x="5" y="1.5" width="2" height="3.5" rx="0.6" />
      <rect x="13" y="1.5" width="2" height="3.5" rx="0.6" />

      {/* Calendar body: solid top header bar + hollow rectangular frame */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.5 4H15.5C16.6 4 17.5 4.9 17.5 6V16C17.5 17.1 16.6 18 15.5 18H4.5C3.4 18 2.5 17.1 2.5 16V6C2.5 4.9 3.4 4 4.5 4ZM4.2 8H15.8V15.5C15.8 16 15.4 16.4 14.9 16.4H5.1C4.6 16.4 4.2 16 4.2 15.5V8Z"
      />
    </svg>
  )
}

export interface ApplicationScheduleValue {
  frequency: ScheduleFrequency
  date?: Date | null
  startDate?: Date | null
  endDate?: Date | null
  time: string
  weekdays?: Weekday[]
}

export interface ApplicationScheduleDatePickerProps {
  /** Initial or controlled schedule value */
  value?: ApplicationScheduleValue
  /** Default uncontrolled schedule value */
  defaultValue?: Partial<ApplicationScheduleValue>
  /** Callback fired when schedule value changes */
  onChange?: (value: ApplicationScheduleValue) => void
  /** Callback fired when Done / Save button is clicked */
  onSave?: (value: ApplicationScheduleValue) => void
  /** Callback fired when Cancel is clicked */
  onCancel?: () => void
  /** Custom date format string for display (default "MM/dd/yyyy") */
  dateFormat?: string
  /** Container CSS classes */
  className?: string
  /** Disable interactions */
  disabled?: boolean
}

/**
 * Standard Application Schedule & Date Picker.
 *
 * Design:
 * - 3 Segmented Tabs: "One Time", "Daily", "Weekly"
 * - One Time: Single Date + Time (09:00AM) with "Done" action
 * - Daily: Start Date + End Date + Time with "Save" action
 * - Weekly: Start Date + End Date + Time + Weekday pill selector
 * - Interactive Calendar Popover backed by Base UI / react-day-picker
 * - 4px grid, amber brand accents
 */
export function ApplicationScheduleDatePicker({
  value: controlledValue,
  defaultValue,
  onChange,
  onSave,
  onCancel,
  dateFormat = "MM/dd/yyyy",
  className,
  disabled = false,
}: ApplicationScheduleDatePickerProps) {
  const isControlled = controlledValue !== undefined

  const [internalValue, setInternalValue] = useState<ApplicationScheduleValue>(
    () => ({
      frequency: defaultValue?.frequency ?? "one-time",
      date: defaultValue?.date ?? null,
      startDate: defaultValue?.startDate ?? null,
      endDate: defaultValue?.endDate ?? null,
      time: defaultValue?.time ?? "09:00AM",
      weekdays: defaultValue?.weekdays ?? ["sat"],
    })
  )

  const currentValue = isControlled ? controlledValue : internalValue

  const updateValue = (updates: Partial<ApplicationScheduleValue>) => {
    const next = { ...currentValue, ...updates }
    if (!isControlled) {
      setInternalValue(next)
    }
    onChange?.(next)
  }

  // Active popover tracker for date fields
  const [openDateField, setOpenDateField] = useState<
    "date" | "startDate" | "endDate" | null
  >(null)
  const [openTimeField, setOpenTimeField] = useState(false)

  const formatDateDisplay = (date?: Date | null): string => {
    if (!date || !isValid(date)) return ""
    try {
      return format(date, dateFormat)
    } catch {
      return ""
    }
  }

  const toggleWeekday = (day: Weekday) => {
    const currentDays = currentValue.weekdays ?? []
    const nextDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day]
    updateValue({ weekdays: nextDays })
  }

  // Pre-defined quick time presets
  const timePresets = [
    "06:00AM",
    "07:00AM",
    "08:00AM",
    "09:00AM",
    "10:00AM",
    "11:00AM",
    "12:00PM",
    "01:00PM",
    "02:00PM",
    "03:00PM",
    "04:00PM",
    "05:00PM",
    "06:00PM",
    "07:00PM",
    "08:00PM",
    "09:00PM",
  ]

  const handleSave = () => {
    onSave?.(currentValue)
  }

  return (
    <div
      className={cn(
        "flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-xs transition-all duration-200 select-none",
        disabled && "pointer-events-none opacity-60",
        className
      )}
    >
      {/* 1. Frequency Tabs (One Time | Daily | Weekly) */}
      <div className="grid grid-cols-3 rounded-lg border border-border bg-muted/30 p-1">
        {(
          [
            { id: "one-time", label: "One Time" },
            { id: "daily", label: "Daily" },
            { id: "weekly", label: "Weekly" },
          ] as const
        ).map((tab) => {
          const isActive = currentValue.frequency === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => updateValue({ frequency: tab.id })}
              className={cn(
                "relative flex h-8 cursor-pointer items-center justify-center rounded-md text-xs font-semibold transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 2. Frequency Fields Body */}
      <div className="flex flex-col gap-3.5">
        {/* ONE TIME MODE: Single DATE */}
        {currentValue.frequency === "one-time" && (
          <div className="flex flex-col gap-1.5">
            <span className="text-2xs font-bold tracking-wider text-muted-foreground uppercase">
              {"Date"}
            </span>
            <Popover
              open={openDateField === "date"}
              onOpenChange={(open) => setOpenDateField(open ? "date" : null)}
            >
              <PopoverTrigger
                className="flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground shadow-2xs transition-colors hover:border-border focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-primary/25"
                aria-label={"Pick single date"}
              >
                <span>
                  {formatDateDisplay(currentValue.date) || "Select date..."}
                </span>
                <CalendarIcon className="size-4 shrink-0 text-foreground/80 transition-colors group-hover:text-foreground" />
              </PopoverTrigger>
              <PopoverContent
                align="center"
                sideOffset={4}
                className="z-50 w-auto rounded-xl border border-border bg-popover p-0 shadow-md"
              >
                <Calendar
                  mode="single"
                  selected={currentValue.date ?? undefined}
                  onSelect={(d) => {
                    updateValue({ date: d ?? null })
                    setOpenDateField(null)
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* DAILY & WEEKLY MODES: START DATE & END DATE */}
        {(currentValue.frequency === "daily" ||
          currentValue.frequency === "weekly") && (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="text-2xs font-bold tracking-wider text-muted-foreground uppercase">
                {"Start Date"}
              </span>
              <Popover
                open={openDateField === "startDate"}
                onOpenChange={(open) =>
                  setOpenDateField(open ? "startDate" : null)
                }
              >
                <PopoverTrigger
                  className="group flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground shadow-2xs transition-colors hover:border-border focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-primary/25"
                  aria-label={"Pick start date"}
                >
                  <span>
                    {formatDateDisplay(currentValue.startDate) ||
                      "Select start date..."}
                  </span>
                  <CalendarIcon className="size-4 shrink-0 text-foreground/80 transition-colors group-hover:text-foreground" />
                </PopoverTrigger>
                <PopoverContent
                  align="center"
                  sideOffset={4}
                  className="z-50 w-auto rounded-xl border border-border bg-popover p-0 shadow-md"
                >
                  <Calendar
                    mode="single"
                    selected={currentValue.startDate ?? undefined}
                    onSelect={(d) => {
                      updateValue({ startDate: d ?? null })
                      setOpenDateField(null)
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-2xs font-bold tracking-wider text-muted-foreground uppercase">
                {"End Date"}
              </span>
              <Popover
                open={openDateField === "endDate"}
                onOpenChange={(open) =>
                  setOpenDateField(open ? "endDate" : null)
                }
              >
                <PopoverTrigger
                  className="group flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground shadow-2xs transition-colors hover:border-border focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-primary/25"
                  aria-label={"Pick end date"}
                >
                  <span>
                    {formatDateDisplay(currentValue.endDate) ||
                      "Select end date..."}
                  </span>
                  <CalendarIcon className="size-4 shrink-0 text-foreground/80 transition-colors group-hover:text-foreground" />
                </PopoverTrigger>
                <PopoverContent
                  align="center"
                  sideOffset={4}
                  className="z-50 w-auto rounded-xl border border-border bg-popover p-0 shadow-md"
                >
                  <Calendar
                    mode="single"
                    selected={currentValue.endDate ?? undefined}
                    onSelect={(d) => {
                      updateValue({ endDate: d ?? null })
                      setOpenDateField(null)
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </>
        )}

        {/* TIME FIELD (common to all modes) */}
        <div className="flex flex-col gap-1.5">
          <span className="text-2xs font-bold tracking-wider text-muted-foreground uppercase">
            {"Time"}
          </span>
          <Popover open={openTimeField} onOpenChange={setOpenTimeField}>
            <PopoverTrigger
              className="group flex h-10 w-full cursor-pointer items-center justify-between rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground shadow-2xs transition-colors hover:border-border focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-primary/25"
              aria-label={"Pick time"}
            >
              <span>{currentValue.time || "09:00AM"}</span>
              <Clock className="size-4 shrink-0 text-foreground/80 transition-colors group-hover:text-foreground" />
            </PopoverTrigger>
            <PopoverContent
              align="center"
              sideOffset={4}
              className="z-50 w-48 rounded-xl border border-border bg-popover p-2 shadow-md"
            >
              <div className="flex flex-col gap-1">
                <span className="px-2 py-1 text-2xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {"Select Time"}
                </span>
                <div className="flex max-h-48 [scrollbar-width:thin] flex-col gap-0.5 overflow-y-auto">
                  {timePresets.map((time) => {
                    const isSelected = currentValue.time === time
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => {
                          updateValue({ time })
                          setOpenTimeField(false)
                        }}
                        className={cn(
                          "flex h-7 cursor-pointer items-center justify-between rounded-md px-2.5 text-left text-xs font-medium transition-colors",
                          isSelected
                            ? "bg-brand-soft/70 font-semibold text-foreground"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <span>{time}</span>
                        {isSelected && (
                          <Check className="size-3 stroke-[2.5] text-link" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* WEEKDAYS SELECTOR (Only in Weekly mode) */}
        {currentValue.frequency === "weekly" && (
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-xs font-semibold text-muted-foreground">
              {"Weekdays"}
            </span>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => {
                const isSelected = (currentValue.weekdays ?? []).includes(
                  day.id
                )
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleWeekday(day.id)}
                    className={cn(
                      "flex h-8 cursor-pointer items-center justify-center rounded-lg border text-xs font-medium transition-all",
                      isSelected
                        ? "border-primary bg-brand-soft/70 font-bold text-foreground shadow-2xs"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    {day.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Action Buttons (Done / Save & Cancel) */}
      <div className="flex items-center gap-4 pt-2">
        <ApplicationButton
          size="sm"
          variant="primary"
          onClick={handleSave}
          className="min-w-20"
        >
          {currentValue.frequency === "one-time" ? "Done" : "Save"}
        </ApplicationButton>

        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer text-xs font-semibold text-destructive hover:underline"
        >
          {"Cancel"}
        </button>
      </div>
    </div>
  )
}

export interface ApplicationDatePickerProps {
  /** Selected date */
  value?: Date | null
  /** Default uncontrolled date */
  defaultValue?: Date | null
  /** Change callback */
  onChange?: (date: Date | undefined) => void
  /** Field label */
  label?: React.ReactNode
  /** Required indicator */
  required?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Date format string (default "MM/dd/yyyy") */
  dateFormat?: string
  /** Min selectable date */
  minDate?: Date
  /** Max selectable date */
  maxDate?: Date
  /** Disabled state */
  disabled?: boolean
  /** Error message */
  error?: React.ReactNode
  /** Description hint */
  description?: React.ReactNode
  /** Custom classes for trigger input */
  className?: string
}

/**
 * Standard Single Date Picker Input.
 */
export function ApplicationDatePicker({
  value: controlledValue,
  defaultValue,
  onChange,
  label,
  required,
  placeholder,
  dateFormat = "MM/dd/yyyy",
  minDate,
  maxDate,
  disabled = false,
  error,
  description,
  className,
}: ApplicationDatePickerProps) {
  const isControlled = controlledValue !== undefined
  const [internalDate, setInternalDate] = useState<Date | undefined>(
    defaultValue ?? undefined
  )
  const [open, setOpen] = useState(false)

  const selectedDate = isControlled
    ? (controlledValue ?? undefined)
    : internalDate

  const handleSelect = (date: Date | undefined) => {
    if (!isControlled) {
      setInternalDate(date)
    }
    onChange?.(date)
    setOpen(false)
  }

  const formattedDate =
    selectedDate && isValid(selectedDate)
      ? format(selectedDate, dateFormat)
      : ""

  return (
    <div className="flex w-full flex-col gap-2.5">
      {label && (
        <label className="flex items-center gap-1 text-xs font-semibold text-foreground select-none">
          {label}
          {required && <span className="font-bold text-destructive">*</span>}
        </label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          className={cn(
            "flex h-9 w-full cursor-pointer items-center justify-between rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-2xs transition-colors hover:border-border focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-primary/25",
            disabled && "cursor-not-allowed opacity-50",
            error &&
              "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
            className
          )}
          aria-label={label ? String(label) : "Date picker"}
        >
          <span className={cn(!formattedDate && "text-muted-foreground")}>
            {formattedDate || (placeholder ?? "Select date...")}
          </span>
          <CalendarIcon className="size-4 shrink-0 text-foreground/80 transition-colors group-hover:text-foreground" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="z-50 w-auto rounded-xl border border-border bg-popover p-0 shadow-md"
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={(d) => {
              if (minDate && d < minDate) return true
              if (maxDate && d > maxDate) return true
              return false
            }}
          />
        </PopoverContent>
      </Popover>

      {description && !error && (
        <span className="text-xs text-muted-foreground">{description}</span>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}

export interface ApplicationDateRangePickerProps {
  /** Selected date range */
  value?: DateRange | null
  /** Default uncontrolled date range */
  defaultValue?: DateRange | null
  /** Change callback */
  onChange?: (range: DateRange | undefined) => void
  /** Field label */
  label?: React.ReactNode
  /** Required indicator */
  required?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Date format string (default "MM/dd/yyyy") */
  dateFormat?: string
  /** Number of calendar months to display (default 2) */
  numberOfMonths?: number
  /** Min selectable date */
  minDate?: Date
  /** Max selectable date */
  maxDate?: Date
  /** Disabled state */
  disabled?: boolean
  /** Error message */
  error?: React.ReactNode
  /** Description hint */
  description?: React.ReactNode
  /** Custom classes for trigger input */
  className?: string
}

/**
 * Standard Date Range Picker.
 */
export function ApplicationDateRangePicker({
  value: controlledValue,
  defaultValue,
  onChange,
  label,
  required,
  placeholder,
  dateFormat = "MM/dd/yyyy",
  numberOfMonths = 2,
  minDate,
  maxDate,
  disabled = false,
  error,
  description,
  className,
}: ApplicationDateRangePickerProps) {
  const isControlled = controlledValue !== undefined
  const [internalRange, setInternalRange] = useState<DateRange | undefined>(
    defaultValue ?? undefined
  )
  const [open, setOpen] = useState(false)

  const selectedRange = isControlled
    ? (controlledValue ?? undefined)
    : internalRange

  const handleSelect = (range: DateRange | undefined) => {
    if (!isControlled) {
      setInternalRange(range)
    }
    onChange?.(range)
  }

  const formattedRange = React.useMemo(() => {
    if (!selectedRange?.from) return ""
    if (!selectedRange.to) {
      return format(selectedRange.from, dateFormat)
    }
    return `${format(selectedRange.from, dateFormat)} - ${format(selectedRange.to, dateFormat)}`
  }, [selectedRange, dateFormat])

  return (
    <div className="flex w-full flex-col gap-2.5">
      {label && (
        <label className="flex items-center gap-1 text-xs font-semibold text-foreground select-none">
          {label}
          {required && <span className="font-bold text-destructive">*</span>}
        </label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          className={cn(
            "flex h-9 w-full cursor-pointer items-center justify-between rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-2xs transition-colors hover:border-border focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-primary/25",
            disabled && "cursor-not-allowed opacity-50",
            error &&
              "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
            className
          )}
          aria-label={label ? String(label) : "Date range picker"}
        >
          <span className={cn(!formattedRange && "text-muted-foreground")}>
            {formattedRange || (placeholder ?? "Select date range...")}
          </span>
          <CalendarIcon className="size-4 shrink-0 text-foreground/80 transition-colors group-hover:text-foreground" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="z-50 w-auto rounded-xl border border-border bg-popover p-0 shadow-md"
        >
          <div className="flex items-center justify-between border-b border-border p-3 text-xs">
            <span className="font-semibold text-foreground">
              {formattedRange || "Choose range"}
            </span>
            {selectedRange?.from && (
              <button
                type="button"
                onClick={() => handleSelect(undefined)}
                className="cursor-pointer font-medium text-link hover:underline"
              >
                {"Clear"}
              </button>
            )}
          </div>
          <Calendar
            mode="range"
            selected={selectedRange}
            onSelect={handleSelect}
            numberOfMonths={numberOfMonths}
            disabled={(d) => {
              if (minDate && d < minDate) return true
              if (maxDate && d > maxDate) return true
              return false
            }}
          />
        </PopoverContent>
      </Popover>

      {description && !error && (
        <span className="text-xs text-muted-foreground">{description}</span>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}

export default ApplicationDatePicker
