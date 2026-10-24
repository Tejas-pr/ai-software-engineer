import { Link } from "react-router-dom"
import { motion, useReducedMotion } from "motion/react"
import { ArrowRight } from "lucide-react"
import { applicationButtonVariants } from "@/components/molecules/application/application-button"
import { GithubAuthButton } from "@/components/molecules/common/github-auth-button"
import { useAuth } from "@/hooks/auth/use-auth"
import { SIGNED_IN_HOME } from "@/lib/auth/auth-redirect"

/** The closing band: always ink, whatever the theme */
export function LandingCta() {
  const { isAuthenticated } = useAuth()
  const reduceMotion = useReducedMotion()

  return (
    <section data-slot="landing-cta" className="px-4 pb-20 sm:px-6">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="dark relative isolate mx-auto flex w-full max-w-6xl flex-col items-start gap-8 overflow-hidden rounded-3xl bg-[var(--brand-ink)] px-6 py-16 text-foreground sm:px-12 sm:py-20 lg:flex-row lg:items-end lg:justify-between"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-grid opacity-50"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-48 -left-24 -z-10 size-[36rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand-amber)_25%,transparent),transparent)]"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grain" />

        <h2 className="max-w-xl font-serif text-5xl leading-[1] tracking-[-0.01em] sm:text-6xl">
          Your backlog has been <em className="text-primary">waiting</em>
          <span
            aria-hidden="true"
            className="ms-1 inline-block h-[0.8em] w-[0.38em] translate-y-[0.05em] animate-caret bg-primary"
          />
        </h2>

        {isAuthenticated ? (
          <Link
            to={SIGNED_IN_HOME}
            className={applicationButtonVariants({
              variant: "primary",
              size: "xl",
            })}
          >
            Open your repositories
            <ArrowRight />
          </Link>
        ) : (
          <GithubAuthButton
            variant="primary"
            size="xl"
            label="Connect your first repo"
          />
        )}
      </motion.div>
    </section>
  )
}
