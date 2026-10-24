import { Link } from "react-router-dom"
import { motion, useReducedMotion } from "motion/react"
import { ArrowDown, ArrowRight } from "lucide-react"
import { ApplicationBadge } from "@/components/molecules/application/application-badge"
import { applicationButtonVariants } from "@/components/molecules/application/application-button"
import { GithubAuthButton } from "@/components/molecules/common/github-auth-button"
import { RunPreview } from "@/components/organisms/landing/run-preview"
import { useAuth } from "@/hooks/auth/use-auth"
import { SIGNED_IN_HOME } from "@/lib/auth/auth-redirect"

const EASE = [0.22, 1, 0.36, 1] as const

// The headline arrives word by word, each one sharpening out of a blur.
// One claim per line; the second is the accent
const HEADLINE = [
  { words: ["Issues", "in."], accent: false },
  { words: ["Pull", "requests", "out."], accent: true },
]

export function LandingHero() {
  const { isAuthenticated, isPending } = useAuth()
  const reduceMotion = useReducedMotion()

  const rise = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: EASE },
        }

  return (
    <section
      data-slot="landing-hero"
      className="relative isolate overflow-hidden"
    >
      {/* Engineering-paper grid, an amber wash from the top, paper grain */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid" />
      <div
        aria-hidden="true"
        className="absolute -top-48 left-1/2 -z-10 h-[36rem] w-[64rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand-amber)_22%,transparent),transparent)] dark:bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand-amber)_12%,transparent),transparent)]"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grain" />

      <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)] items-start gap-14 px-4 pt-14 pb-20 sm:px-6 sm:pt-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12 lg:pt-24 lg:pb-28">
        <div className="flex flex-col items-start">
          <motion.div {...rise(0)}>
            <ApplicationBadge
              variant="hero"
              size="lg"
              className="text-2xs font-medium"
              iconLeft={
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
              }
            >
              Gemini · Claude · GPT · or local Ollama
            </ApplicationBadge>
          </motion.div>

          <h1 className="mt-7 font-serif text-[3.5rem] leading-[0.95] tracking-[-0.02em] text-foreground sm:text-7xl lg:text-[5.5rem]">
            {HEADLINE.map(({ words, accent }, line) => (
              <span
                key={line}
                className={
                  accent
                    ? "block text-[color-mix(in_oklab,var(--brand-amber-deep),var(--foreground)_10%)] italic dark:text-primary"
                    : "block"
                }
              >
                {words.map((word, i) => {
                  // Count across lines, so the stagger runs on
                  const order = line * 2 + i
                  return (
                    <motion.span
                      key={word}
                      className="inline-block pe-[0.22em] last:pe-0"
                      initial={
                        reduceMotion
                          ? false
                          : { opacity: 0, y: 24, filter: "blur(10px)" }
                      }
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{
                        duration: 0.8,
                        delay: 0.12 + order * 0.09,
                        ease: EASE,
                      }}
                    >
                      {word}
                    </motion.span>
                  )
                })}
              </span>
            ))}
          </h1>

          <motion.p
            {...rise(0.6)}
            className="mt-7 max-w-[34rem] text-base/relaxed text-muted-foreground sm:text-lg/relaxed"
          >
            Point an agent at a GitHub issue. It reads your codebase, proposes a
            plan and{" "}
            <span className="text-foreground">waits for your approval</span> —
            then writes the code, runs your tests, reviews its own diff and
            opens the pull request.
          </motion.p>

          <motion.div
            {...rise(0.72)}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            {isAuthenticated ? (
              <Link
                to={SIGNED_IN_HOME}
                className={applicationButtonVariants({
                  variant: "cta",
                  size: "xl",
                })}
              >
                Open your repositories
                <ArrowRight />
              </Link>
            ) : (
              <GithubAuthButton
                variant="cta"
                size="xl"
                label="Start with GitHub"
                disabled={isPending}
              />
            )}
            <a
              href="#how-it-works"
              className={applicationButtonVariants({
                variant: "glass",
                size: "xl",
              })}
            >
              How it works
              <ArrowDown className="transition-transform group-hover/app-button:translate-y-0.5" />
            </a>
          </motion.div>

          <motion.p
            {...rise(0.85)}
            className="mt-5 text-xs text-muted-foreground"
          >
            No password · your GitHub account is the account
          </motion.p>
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 32, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1, delay: 0.35, ease: EASE }}
          style={{ transformPerspective: 1200 }}
          className="relative lg:mt-6"
        >
          {/* A second sheet peeking out behind, slightly turned */}
          <div
            aria-hidden="true"
            className="absolute inset-x-6 -top-3 -z-10 h-full rotate-[1.5deg] rounded-2xl border bg-card/60"
          />
          <RunPreview />
          <p className="mt-3 text-end text-2xs text-muted-foreground/70">
            illustrative run · repository and output are examples
          </p>
        </motion.div>
      </div>
    </section>
  )
}
