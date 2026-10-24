import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { cn } from "@workspace/ui/lib/utils"
import { CheckIcon } from "lucide-react"

export interface CheckboxProps extends CheckboxPrimitive.Root.Props {
  variant?: "primary" | "highlight"
}

function Checkbox({ className, variant = "primary", ...props }: CheckboxProps) {
  const variantClasses =
    variant === "highlight"
      ? "data-checked:border-highlight data-checked:bg-highlight data-checked:text-highlight-foreground dark:data-checked:bg-highlight focus-visible:border-highlight focus-visible:ring-highlight/30"
      : "data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary focus-visible:border-ring focus-visible:ring-ring/30"

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input transition-shadow outline-none group-has-disabled/field:opacity-50 group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-input after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        variantClasses,
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
