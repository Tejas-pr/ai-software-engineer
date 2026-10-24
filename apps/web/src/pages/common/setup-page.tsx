import { motion, useReducedMotion } from "motion/react"
import { ArrowUpRight, Cpu, Star } from "lucide-react"
import { BuiltBy } from "@/components/atoms/built-by"
import { GithubIcon } from "@/components/atoms/github-icon"
import { applicationButtonVariants } from "@/components/molecules/application/application-button"
import { CodeBlock } from "@/components/molecules/common/code-block"
import { SectionHeading } from "@/components/molecules/common/section-heading"
import { REPOSITORY_URL } from "@/lib/common/attribution"

interface Step {
  id: string
  title: string
  body: React.ReactNode
  code?: { code: string; label?: string }[]
}

const STEPS: Step[] = [
  {
    id: "prerequisites",
    title: "Install the prerequisites",
    body: (
      <>
        Git,{" "}
        <a href="https://bun.sh" className="text-link hover:underline">
          Bun
        </a>{" "}
        1.3+, Node 20+, Python 3.13 with{" "}
        <a
          href="https://docs.astral.sh/uv/"
          className="text-link hover:underline"
        >
          uv
        </a>
        , and Docker (for Postgres and Redis). For local models, also{" "}
        <a
          href="https://ollama.com/download"
          className="text-link hover:underline"
        >
          Ollama
        </a>
        .
      </>
    ),
  },
  {
    id: "clone",
    title: "Clone the repository",
    body: "Get the code and install the JavaScript dependencies for every workspace.",
    code: [
      {
        code: `git clone ${REPOSITORY_URL}.git\ncd ai-software-engineer\nbun install`,
      },
    ],
  },
  {
    id: "services",
    title: "Start Postgres and Redis",
    body: "Postgres (with pgvector) on port 5433 and Redis on 6379, from the repo's compose file.",
    code: [{ code: "docker compose up -d" }],
  },
  {
    id: "oauth",
    title: "Create a GitHub OAuth app",
    body: (
      <>
        GitHub → Settings → Developer settings → OAuth Apps →{" "}
        <em>New OAuth App</em>. Homepage URL{" "}
        <code className="text-foreground">http://localhost:5173</code>,
        authorization callback URL{" "}
        <code className="break-all text-foreground">
          http://localhost:8000/api/v1/accounts/auth/github/callback
        </code>
        . Generate a client secret and keep both values for the next step.
      </>
    ),
  },
  {
    id: "env",
    title: "Configure the API",
    body: "Copy the example environment file, then fill in your OAuth app and an encryption key (it protects stored GitHub tokens and API keys).",
    code: [
      { code: "cp apps/api/.env.example apps/api/.env" },
      {
        label: "generate TOKEN_ENCRYPTION_KEY",
        code: 'python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"',
      },
      {
        label: "apps/api/.env",
        code: `GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
TOKEN_ENCRYPTION_KEY=the_key_you_generated
JWT_SECRET=any_long_random_string
OLLAMA_BASE_URL=http://localhost:11434
# optional — leave empty to run everything locally
GEMINI_API_KEY=`,
      },
    ],
  },
  {
    id: "ollama",
    title: "Pull local models",
    body: (
      <>
        The agents call tools, so pick a model with{" "}
        <strong>tool calling</strong>. The embedding model powers code search
        when there's no Gemini key. 16 GB of RAM handles a 7–9B model
        comfortably.
      </>
    ),
    code: [
      {
        code: "ollama pull qwen2.5-coder:7b     # or qwen3.5:9b\nollama pull nomic-embed-text      # code search embeddings",
      },
    ],
  },
  {
    id: "migrate",
    title: "Install the API and create the tables",
    body: "Python dependencies via uv, then the database migrations.",
    code: [{ code: "(cd apps/api && uv sync)\nbun db:migrate" }],
  },
  {
    id: "run",
    title: "Run it",
    body: (
      <>
        Starts the web app on <code className="text-foreground">:5173</code> and
        the API on <code className="text-foreground">:8000</code>. Open the web
        app, sign in with GitHub, and in onboarding choose{" "}
        <em>Use local Ollama models</em> — or add an API key.
      </>
    ),
    code: [{ code: "bun dev" }],
  },
]

const TROUBLESHOOTING = [
  {
    q: "Every request fails with a CORS error",
    a: "The API only accepts its FRONTEND_URL (http://localhost:5173 by default). Open the web app on exactly that address, or change FRONTEND_URL in apps/api/.env.",
  },
  {
    q: "Onboarding doesn't offer local models",
    a: "The option appears only when the API can reach Ollama and at least one installed model supports tools. Check `ollama list` and OLLAMA_BASE_URL, then reload.",
  },
  {
    q: "The coder finishes without changing anything",
    a: "Small local models sometimes describe a change instead of calling the write tool. The run fails loudly when that happens — retry, try a larger model, or use a cloud key for that run.",
  },
  {
    q: "Code search returns nothing",
    a: "Repositories are indexed right after they're cloned. Without GEMINI_API_KEY the index needs `ollama pull nomic-embed-text`; then use Re-index from the repository's menu.",
  },
]

const EASE = [0.22, 1, 0.36, 1] as const

/** Public: run your own copy, on local models if you like */
export function SetupPage() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="relative isolate">
      <div aria-hidden="true" className="absolute inset-0 -z-10 h-96 bg-grid" />
      <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)] gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,17rem)] lg:py-20">
        <div className="flex flex-col gap-12">
          <div className="flex flex-col gap-5">
            <SectionHeading
              eyebrow="Self-host"
              title={
                <>
                  Run it yourself, on{" "}
                  <em className="text-muted-foreground">your own models</em>.
                </>
              }
            />
            <p className="max-w-2xl text-sm/relaxed text-muted-foreground">
              The whole app — web, API, agents, database — runs on one machine.
              With Ollama, no API key or cloud quota is needed: the agents run
              on local models and your code never leaves your computer except to
              talk to GitHub.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={REPOSITORY_URL}
                target="_blank"
                rel="noreferrer"
                className={applicationButtonVariants({
                  variant: "highlight",
                  size: "lg",
                })}
              >
                <GithubIcon />
                View on GitHub
                <ArrowUpRight />
              </a>
              <a
                href={REPOSITORY_URL}
                target="_blank"
                rel="noreferrer"
                className={applicationButtonVariants({
                  variant: "outline",
                  size: "lg",
                })}
              >
                <Star />
                Star the repository
              </a>
            </div>
          </div>

          <ol className="flex flex-col">
            {STEPS.map((step, i) => (
              <motion.li
                key={step.id}
                id={step.id}
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="relative grid scroll-mt-24 grid-cols-[2rem_minmax(0,1fr)] gap-x-4 pb-10 last:pb-0"
              >
                {/* The thread down the left between steps */}
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-9 bottom-1 left-4 w-px -translate-x-1/2 bg-border"
                  />
                )}
                <span className="flex size-8 items-center justify-center rounded-lg border bg-card text-xs font-medium tabular-nums shadow-[0_1px_0_0_var(--border)]">
                  {i + 1}
                </span>
                <div className="flex min-w-0 flex-col gap-3 pt-1">
                  <h2 className="text-base font-semibold">{step.title}</h2>
                  <p className="text-sm/relaxed text-muted-foreground">
                    {step.body}
                  </p>
                  {step.code?.map((block) => (
                    <CodeBlock
                      key={block.code}
                      code={block.code}
                      label={block.label}
                    />
                  ))}
                </div>
              </motion.li>
            ))}
          </ol>

          <div className="flex flex-col gap-4">
            <h2 className="font-serif text-3xl leading-none">
              Troubleshooting
            </h2>
            <dl className="flex flex-col divide-y rounded-xl border bg-card">
              {TROUBLESHOOTING.map(({ q, a }) => (
                <div key={q} className="flex flex-col gap-1.5 p-4">
                  <dt className="text-sm font-medium">{q}</dt>
                  <dd className="text-[0.8125rem]/relaxed text-muted-foreground">
                    {a}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <nav
            aria-label="Setup steps"
            className="flex flex-col gap-1 rounded-xl border bg-card p-3"
          >
            <span className="px-2 pb-1 text-2xs tracking-[0.12em] text-muted-foreground uppercase">
              On this page
            </span>
            {STEPS.map((step, i) => (
              <a
                key={step.id}
                href={`#${step.id}`}
                className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {i + 1}. {step.title}
              </a>
            ))}
          </nav>
          <div className="flex flex-col gap-2 rounded-xl border border-dashed p-4">
            <Cpu className="size-4 text-muted-foreground" />
            <p className="text-xs/relaxed text-muted-foreground">
              Full details — environment variables, commands, architecture — are
              in the repository's <code className="text-foreground">kb/</code>{" "}
              folder.
            </p>
          </div>
          <BuiltBy className="px-1" />
        </aside>
      </div>
    </section>
  )
}
