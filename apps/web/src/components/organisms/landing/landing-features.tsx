import { motion, useReducedMotion } from "motion/react"
import {
  Activity,
  Ban,
  Boxes,
  KeyRound,
  MessageSquareDiff,
  RotateCcw,
} from "lucide-react"
import { SectionHeading } from "@/components/molecules/common/section-heading"

// Each one is something the app does today (see app/agents/graph.py and
// the settings API), not a roadmap
const FEATURES = [
  {
    icon: MessageSquareDiff,
    label: "approval gate",
    title: "Nothing is written before you say so",
    body: "The plan comes to you first, with every file it means to touch. Approve it, ask for changes, or reject it outright.",
  },
  {
    icon: Activity,
    label: "live stream",
    title: "Watch the run as it happens",
    body: "Every step streams in as it happens — what it read, what it planned, which tests failed and how it fixed them.",
  },
  {
    icon: RotateCcw,
    label: "checkpoints",
    title: "Retry from where it stopped",
    body: "A failed run resumes from its last checkpoint instead of starting over, keeping the work that already succeeded.",
  },
  {
    icon: Boxes,
    label: "workspaces",
    title: "Each project in its own workspace",
    body: "Repositories are cloned into isolated workspaces, so one project's run never sees another's files.",
  },
  {
    icon: KeyRound,
    label: "your keys",
    title: "Bring your own API key",
    body: "Use your own Gemini, Claude or OpenAI quota. Keys are encrypted at rest and never sent back to the browser.",
  },
  {
    icon: Ban,
    label: "cancel",
    title: "Stop it at any point",
    body: "Changed your mind mid-run? Cancel it and it stops as soon as the current step finishes.",
  },
]

const EASE = [0.22, 1, 0.36, 1] as const

export function LandingFeatures() {
  const reduceMotion = useReducedMotion()

  return (
    <section
      id="features"
      data-slot="landing-features"
      className="scroll-mt-20 border-t border-border/70 bg-muted/30"
    >
      <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)] gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20 lg:py-32">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            eyebrow="What it does"
            title={
              <>
                Built to be <em>supervised</em>, not trusted blindly.
              </>
            }
          />
          <p className="mt-6 max-w-sm text-sm/relaxed text-muted-foreground">
            An agent that edits your code should be easy to watch, easy to stop
            and impossible to merge by accident. It opens pull requests; merging
            is still yours.
          </p>
        </div>

        <ul className="flex flex-col">
          {FEATURES.map(({ icon: Icon, label, title, body }, i) => (
            <motion.li
              key={title}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.55, delay: (i % 2) * 0.05, ease: EASE }}
              className="group grid grid-cols-[2.5rem_1fr] gap-x-4 border-t py-6 first:border-t-0 first:pt-0 sm:grid-cols-[2.5rem_1fr_7rem]"
            >
              <span className="flex size-10 items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-[0_1px_0_0_var(--border)] transition-colors duration-300 group-hover:border-primary/50 group-hover:text-foreground">
                <Icon className="size-[1.125rem]" />
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-[0.9375rem] font-semibold tracking-tight">
                  {title}
                </h3>
                <p className="text-sm/relaxed text-muted-foreground">{body}</p>
              </div>
              <span className="col-start-2 mt-2 text-xs text-muted-foreground/80 sm:col-start-3 sm:mt-1 sm:text-end">
                {label}
              </span>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}
