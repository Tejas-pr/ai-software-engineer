import { motion, useReducedMotion } from "motion/react"
import { CircleAlert, Info } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

/** A one-line message above an auth action: why they're here, what failed */
export function AuthNotice({
  tone = "info",
  className,
  children,
}: {
  tone?: "info" | "error"
  className?: string
  children: React.ReactNode
}) {
  const reduceMotion = useReducedMotion()
  const Icon = tone === "error" ? CircleAlert : Info

  return (
    <motion.div
      data-slot="auth-notice"
      role={tone === "error" ? "alert" : "status"}
      initial={reduceMotion ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[0.8125rem]/relaxed",
        tone === "error"
          ? "border-destructive/25 bg-destructive/5 text-destructive"
          : "border-border bg-muted/50 text-muted-foreground",
        className
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </motion.div>
  )
}
