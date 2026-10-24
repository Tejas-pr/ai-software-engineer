import { motion, useReducedMotion } from "motion/react"

const EASE = [0.22, 1, 0.36, 1] as const

/** A landing section's mono eyebrow and serif title, rising into view */
export function SectionHeading({
  eyebrow,
  title,
  className,
}: {
  eyebrow: string
  title: React.ReactNode
  className?: string
}) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.7, ease: EASE }}
      className={className}
    >
      <span className="flex items-center gap-2 text-2xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
        <span className="h-px w-5 bg-primary" aria-hidden="true" />
        {eyebrow}
      </span>
      <h2 className="mt-4 max-w-2xl font-serif text-4xl leading-[1.05] tracking-[-0.01em] text-balance sm:text-5xl">
        {title}
      </h2>
    </motion.div>
  )
}
