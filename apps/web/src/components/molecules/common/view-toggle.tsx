import { motion } from "motion/react"
import { LayoutGrid, List } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

export type ListView = "list" | "grid"

const OPTIONS = [
  { id: "grid" as const, label: "Grid view", icon: LayoutGrid },
  { id: "list" as const, label: "List view", icon: List },
]

/** Grid / list segmented control with a sliding thumb */
export function ViewToggle({
  value,
  onChange,
}: {
  value: ListView
  onChange: (view: ListView) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="View"
      className="flex h-9 shrink-0 items-center gap-0.5 rounded-lg border bg-card p-0.5"
    >
      {OPTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          aria-label={label}
          title={label}
          onClick={() => onChange(id)}
          className={cn(
            "relative flex size-8 items-center justify-center rounded-md transition-colors",
            value === id
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {value === id && (
            <motion.span
              layoutId="view-toggle-thumb"
              className="absolute inset-0 rounded-md bg-muted"
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
            />
          )}
          <Icon className="relative size-4" />
        </button>
      ))}
    </div>
  )
}
