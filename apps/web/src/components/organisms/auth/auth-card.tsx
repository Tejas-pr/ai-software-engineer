import { motion, useReducedMotion } from "motion/react"
import { cn } from "@workspace/ui/lib/utils"

type AuthCardProps = Omit<React.ComponentProps<"section">, "title"> & {
  /** Small mono label above the title, e.g. "Sign in" */
  eyebrow?: string
  title: React.ReactNode
  description: React.ReactNode
  footer?: React.ReactNode
  /** Replaces the eyebrow above the title (e.g. a status icon) */
  media?: React.ReactNode
}

// Header, body and footer arrive one after another
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
} as const
const fade = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
}

/**
 * The column every auth screen renders into: no box around it, the page is
 * the card. Height hugs the content; AuthLayout centers it.
 */
export function AuthCard({
  eyebrow,
  title,
  description,
  footer,
  media,
  className,
  children,
  ...props
}: AuthCardProps) {
  const reduceMotion = useReducedMotion()
  const variant = reduceMotion ? fade : item

  return (
    <motion.section
      data-slot="auth-card"
      variants={container}
      initial="hidden"
      animate="show"
      className={cn("flex w-full flex-col gap-8", className)}
      {...(props as React.ComponentProps<typeof motion.section>)}
    >
      <motion.div variants={variant} className="flex flex-col gap-3">
        {media ??
          (eyebrow && (
            <span className="flex items-center gap-2 text-2xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              <span className="h-px w-5 bg-primary" aria-hidden="true" />
              {eyebrow}
            </span>
          ))}
        <h1 className="font-serif text-[2.5rem] leading-[1.05] tracking-[-0.01em] text-foreground sm:text-5xl">
          {title}
        </h1>
        <p className="max-w-sm text-sm/relaxed text-muted-foreground">
          {description}
        </p>
      </motion.div>

      <motion.div variants={variant} className="flex flex-col gap-4">
        {children}
      </motion.div>

      {footer ? (
        <motion.div
          variants={variant}
          className="border-t border-dashed pt-5 text-[0.8125rem] text-muted-foreground"
        >
          {footer}
        </motion.div>
      ) : null}
    </motion.section>
  )
}
