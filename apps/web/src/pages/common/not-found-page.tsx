import { Link } from "react-router-dom"
import { motion, useReducedMotion } from "motion/react"
import { applicationButtonVariants } from "@/components/molecules/application/application-button"
import { paths } from "@/lib/common/paths"

export function NotFoundPage() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="relative isolate flex flex-1 items-center justify-center overflow-hidden px-4 py-24">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid" />
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex max-w-md flex-col items-center text-center"
      >
        <p className="text-xs text-muted-foreground">
          <span className="text-run-failed">error</span> 404 · not found
        </p>
        <h1 className="mt-4 font-serif text-6xl leading-none tracking-[-0.02em] sm:text-7xl">
          This page isn't in the <em>repo</em>
          <span
            aria-hidden="true"
            className="ms-1 inline-block h-[0.75em] w-[0.36em] animate-caret bg-primary"
          />
        </h1>
        <p className="mt-5 text-sm/relaxed text-muted-foreground">
          The address may be mistyped, or the page has moved.
        </p>
        <div className="mt-8 flex gap-3">
          <Link to={paths.home} className={applicationButtonVariants()}>
            Back to home
          </Link>
          <Link
            to={paths.projects.root}
            className={applicationButtonVariants({ variant: "outline" })}
          >
            Your repositories
          </Link>
        </div>
      </motion.div>
    </section>
  )
}
