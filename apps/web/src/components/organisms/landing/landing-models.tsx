import { motion, useReducedMotion } from "motion/react"
import { SectionHeading } from "@/components/molecules/common/section-heading"

// The providers the settings API accepts keys for, plus local Ollama
const MODELS = [
  { name: "Google Gemini", note: "shared default or your key" },
  { name: "Anthropic Claude", note: "your key" },
  { name: "OpenAI GPT", note: "your key" },
  { name: "Ollama", note: "local · no key needed" },
]

const EASE = [0.22, 1, 0.36, 1] as const

export function LandingModels() {
  const reduceMotion = useReducedMotion()

  return (
    <section
      id="models"
      data-slot="landing-models"
      className="scroll-mt-20 border-t border-border/70"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:py-28">
        <SectionHeading
          eyebrow="Models"
          title={
            <>
              Runs on the model <em>you</em> pick, per task.
            </>
          }
        />
        <ul className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {MODELS.map(({ name, note }, i) => (
            <motion.li
              key={name}
              initial={reduceMotion ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
              className="group relative flex flex-col gap-6 bg-card p-6 transition-colors duration-300 hover:bg-background"
            >
              <span className="text-xs text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-lg font-semibold tracking-tight">
                  {name}
                </span>
                <span className="text-xs text-muted-foreground">{note}</span>
              </div>
              {/* An amber underline that runs in on hover */}
              <span
                aria-hidden="true"
                className="absolute inset-x-6 bottom-0 h-0.5 origin-left scale-x-0 bg-primary transition-transform duration-500 ease-out group-hover:scale-x-100"
              />
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}
