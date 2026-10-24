import { useRef } from "react"
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react"
import {
  FolderGit2,
  GitPullRequestArrow,
  ListChecks,
  PenLine,
} from "lucide-react"
import { SectionHeading } from "@/components/molecules/common/section-heading"

const STEPS = [
  {
    icon: FolderGit2,
    title: "Connect a repository",
    body: "Sign in with GitHub and pick a repo. It's cloned into its own workspace and indexed so the agent can search it.",
  },
  {
    icon: PenLine,
    title: "Hand it a task",
    body: "Choose an open issue or write the task yourself, then pick the model that should do the work.",
  },
  {
    icon: ListChecks,
    title: "Approve the plan",
    body: "It researches the code and proposes steps with the files they touch. Approve, or ask for changes and it plans again.",
    // The step that makes this different: the human gate
    gate: true,
  },
  {
    icon: GitPullRequestArrow,
    title: "Review the pull request",
    body: "It writes the code, runs your tests until they pass, reviews its own diff and opens a PR on a fresh branch.",
  },
]

const EASE = [0.22, 1, 0.36, 1] as const

export function HowItWorks() {
  const reduceMotion = useReducedMotion()
  const ref = useRef<HTMLOListElement>(null)
  // The connector draws as the steps scroll through the middle of the screen
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 85%", "end 55%"],
  })
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })
  const scaleX = useTransform(progress, [0, 1], [0, 1])

  return (
    <section
      id="how-it-works"
      data-slot="how-it-works"
      className="scroll-mt-20 border-t border-border/70"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              Four steps.{" "}
              <em className="text-muted-foreground">One of them is yours.</em>
            </>
          }
        />

        <ol
          ref={ref}
          className="relative mt-16 grid gap-10 md:grid-cols-4 md:gap-6"
        >
          {/* Connector behind the step numbers (desktop) */}
          <div
            aria-hidden="true"
            className="absolute top-5 right-[12.5%] left-[12.5%] hidden h-px bg-border md:block"
          >
            <motion.div
              style={reduceMotion ? undefined : { scaleX }}
              className="h-full origin-left bg-primary"
            />
          </div>

          {STEPS.map(({ icon: Icon, title, body, gate }, i) => (
            <motion.li
              key={title}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
              className="relative flex flex-col gap-4 md:items-center md:text-center"
            >
              <span
                className={
                  gate
                    ? "relative flex size-10 items-center justify-center rounded-xl border border-[color-mix(in_oklab,var(--primary),black_14%)] bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_rgb(255_255_255/0.45),0_6px_16px_-6px_var(--brand-amber)]"
                    : "relative flex size-10 items-center justify-center rounded-xl border bg-card text-foreground shadow-[0_1px_0_0_var(--border)]"
                }
              >
                <Icon className="size-[1.125rem]" />
              </span>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                  {gate && <span className="text-link"> · you decide</span>}
                </span>
                <h3 className="text-base font-semibold tracking-tight">
                  {title}
                </h3>
                <p className="text-sm/relaxed text-muted-foreground md:px-2">
                  {body}
                </p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
