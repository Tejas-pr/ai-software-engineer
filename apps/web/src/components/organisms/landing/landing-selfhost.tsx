import { Link } from "react-router-dom"
import { motion, useReducedMotion } from "motion/react"
import {
  ArrowRight,
  ArrowUpRight,
  Cpu,
  HardDrive,
  ShieldCheck,
} from "lucide-react"
import { GithubIcon } from "@/components/atoms/github-icon"
import { applicationButtonVariants } from "@/components/molecules/application/application-button"
import { CodeBlock } from "@/components/molecules/common/code-block"
import { SectionHeading } from "@/components/molecules/common/section-heading"
import { REPOSITORY_URL } from "@/lib/common/attribution"
import { paths } from "@/lib/common/paths"

const POINTS = [
  { icon: Cpu, text: "Local Ollama models — no API key, no quota" },
  { icon: HardDrive, text: "Your code stays on your machine" },
  { icon: ShieldCheck, text: "One `bun dev` for web, API and agents" },
]

const EASE = [0.22, 1, 0.36, 1] as const

/** Open source: clone it, run it on your own models */
export function LandingSelfHost() {
  const reduceMotion = useReducedMotion()

  return (
    <section
      id="self-host"
      data-slot="landing-selfhost"
      className="scroll-mt-20 border-t border-border/70 bg-muted/30"
    >
      <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:py-28">
        <div className="flex flex-col gap-6">
          <SectionHeading
            eyebrow="Self-host"
            title={
              <>
                Run it yourself, on <em>your own models</em>.
              </>
            }
          />
          <p className="max-w-md text-sm/relaxed text-muted-foreground">
            The whole thing is on GitHub. Clone it, point it at Ollama, and the
            agents work on your repositories without a cloud model ever seeing
            your code.
          </p>
          <ul className="flex flex-col gap-2.5">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm">
                <span className="flex size-7 items-center justify-center rounded-lg border bg-card">
                  <Icon className="size-3.5 text-muted-foreground" />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Link
              to={paths.setup}
              className={applicationButtonVariants({
                variant: "primary",
                size: "lg",
              })}
            >
              Read the setup guide
              <ArrowRight />
            </Link>
            <a
              href={REPOSITORY_URL}
              target="_blank"
              rel="noreferrer"
              className={applicationButtonVariants({
                variant: "outline",
                size: "lg",
              })}
            >
              <GithubIcon />
              View on GitHub
              <ArrowUpRight />
            </a>
          </div>
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="flex flex-col gap-3"
        >
          <CodeBlock
            code={`git clone ${REPOSITORY_URL}.git
cd ai-software-engineer && bun install
docker compose up -d
ollama pull qwen2.5-coder:7b
bun db:migrate && bun dev`}
          />
          <p className="text-2xs text-muted-foreground">
            Abridged — the guide covers the GitHub OAuth app and environment
            file too.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
