import { motion, useReducedMotion } from "motion/react"
import { cn } from "@workspace/ui/lib/utils"

/** Every app page's title block: mono eyebrow, serif title, description,
 * actions on the right */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.header
      data-slot="page-header"
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow && (
          <span className="truncate text-2xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            {eyebrow}
          </span>
        )}
        <h1 className="font-serif text-4xl leading-none tracking-[-0.01em]">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm/relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      )}
    </motion.header>
  )
}
