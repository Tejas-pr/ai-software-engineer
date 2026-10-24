import { motion } from "motion/react"
import { Check } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

export interface OnboardingStepInfo {
  title: string
  optional?: boolean
}

/** Numbered steps across the top; done ones get a check, the current one
 * an amber ring, and the connector fills as you go */
export function OnboardingStepper({
  steps,
  current,
}: {
  steps: OnboardingStepInfo[]
  current: number
}) {
  return (
    <ol
      data-slot="onboarding-stepper"
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((step, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={step.title} className="flex flex-col gap-2">
            <div className="relative h-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-primary"
                initial={false}
                animate={{ width: done ? "100%" : active ? "35%" : "0%" }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border text-2xs tabular-nums transition-colors",
                  done &&
                    "border-transparent bg-primary text-primary-foreground",
                  active && "border-primary text-foreground",
                  !done && !active && "text-muted-foreground"
                )}
              >
                {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={cn(
                  "truncate text-xs",
                  active
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {step.title}
                {step.optional && (
                  <span className="hidden text-muted-foreground sm:inline">
                    {" "}
                    · optional
                  </span>
                )}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
