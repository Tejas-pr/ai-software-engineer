/**
 * ApplicationTabs — Reusable underline-style tab bar.
 *
 * Each tab has a label, an optional count badge, and an optional icon.
 * The active tab is underlined with the brand primary colour.
 * The active tab key is meant to be stored in a URL query param by the caller.
 *
 * Usage:
 *   <ApplicationTabs
 *     tabs={[
 *       { key: "config",  label: "Room Configuration" },
 *       { key: "tables",  label: "Tables",  count: 4, icon: <TableIcon /> },
 *       { key: "sensors", label: "Sensors", count: 3, icon: <RadioIcon /> },
 *     ]}
 *     activeKey="sensors"
 *     onChange={(key) => setSearchParam("tab", key)}
 *   />
 */
import { useId, type ReactNode } from "react"
import { motion } from "motion/react"
import { cn } from "@workspace/ui/lib/utils"

export interface ApplicationTabItem {
  key: string
  label: string
  /** Optional numeric badge shown after the label, e.g. "(4)" */
  count?: number
  /** Optional icon placed before the label */
  icon?: ReactNode
  /** When true the tab is rendered but not clickable */
  disabled?: boolean
}

export interface ApplicationTabsProps {
  tabs: ApplicationTabItem[]
  activeKey: string
  onChange: (key: string) => void
  className?: string
  /** Extra classes applied to each trigger button */
  triggerClassName?: string
}

/**
 * Underline tab bar (project detail sections, settings)
 * (and anywhere else a line-style tab navigation is needed).
 *
 * - Active tab: `text-foreground` + a 2px amber underline that slides
 *   between tabs (motion layoutId)
 * - Inactive tab: `text-muted-foreground` + hover highlight
 * - Count badge: parenthesised number, muted
 * - Horizontal scroll on narrow viewports
 */
export function ApplicationTabs({
  tabs,
  activeKey,
  onChange,
  className,
  triggerClassName,
}: ApplicationTabsProps) {
  // One underline per tab bar, so two bars on a page don't trade it
  const underlineId = useId()
  return (
    <div
      data-slot="application-tabs"
      role="tablist"
      aria-label={"Page sections"}
      className={cn(
        "flex scrollbar-none items-end gap-1 overflow-x-auto border-b border-border",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={tab.disabled}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.key)}
            className={cn(
              // Base: compact, tight text, no inner border flash
              "relative -mb-px flex shrink-0 items-center gap-1.5 px-3.5 pt-3 pb-2.5 text-xs font-medium outline-hidden transition-colors duration-150 select-none",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
              tab.disabled && "cursor-not-allowed opacity-40",
              triggerClassName
            )}
          >
            {tab.icon && (
              <span
                className="inline-flex items-center justify-center [&_svg]:size-3.5"
                aria-hidden="true"
              >
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
            {typeof tab.count === "number" && tab.count > 0 && (
              <span className="rounded-full bg-muted px-1.5 font-mono text-2xs text-muted-foreground tabular-nums">
                {tab.count}
              </span>
            )}
            {isActive && (
              <motion.span
                layoutId={underlineId}
                aria-hidden="true"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

export default ApplicationTabs
