import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { completeOnboarding } from "@/api/account.api"
import { listOrganizations, type Organization } from "@/api/organizations.api"
import { listApiKeys } from "@/api/settings.api"
import { AuthNotice } from "@/components/molecules/auth/auth-notice"
import { OnboardingStepper } from "@/components/molecules/onboarding/onboarding-stepper"
import { ModelStep } from "@/components/organisms/onboarding/model-step"
import { OrganizationStep } from "@/components/organisms/onboarding/organization-step"
import { RepositoryStep } from "@/components/organisms/onboarding/repository-step"
import { useAuth } from "@/hooks/auth/use-auth"
import { describeError } from "@/lib/common/api-error"
import { STORAGE_KEYS, writeStorage } from "@/lib/common/local-storage"
import { paths } from "@/lib/common/paths"

const STEPS = [
  {
    title: "Organization",
    heading: "Name your organization",
    lead: "Everything you connect and run lives in an organization. Start with yours — invite teammates later.",
  },
  {
    title: "Model access",
    heading: "Give the agents a model",
    lead: "Add your own API key for Gemini, Claude or OpenAI — runs use your quota. Or run everything on local Ollama models.",
  },
  {
    title: "First repository",
    heading: "Connect a repository",
    lead: "Pick a GitHub repository the agents can work on. It's cloned into its own workspace and indexed for search.",
    optional: true,
  },
]

const EASE = [0.22, 1, 0.36, 1] as const

export function OnboardingPage() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [step, setStep] = useState<number | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [useLocalModels, setUseLocalModels] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Resume where they left off: an organization already made → step 2; a
  // key already saved as well → step 3
  useEffect(() => {
    Promise.all([listOrganizations(), listApiKeys()])
      .then(([orgs, keys]) => {
        const personal = orgs.find((o) => o.is_personal) ?? orgs[0] ?? null
        setOrganization(personal)
        if (!personal) setStep(0)
        else setStep(keys.some((k) => k.configured) ? 2 : 1)
      })
      .catch(() => setStep(0))
  }, [])

  async function finish() {
    setIsFinishing(true)
    setError(null)
    try {
      await completeOnboarding(useLocalModels)
      if (organization) {
        writeStorage(STORAGE_KEYS.organization, String(organization.id))
      }
      await refresh()
      navigate(paths.dashboard, { replace: true })
    } catch (err) {
      setError(describeError(err, "Couldn't finish setting up"))
      setIsFinishing(false)
    }
  }

  if (step === null) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  const info = STEPS[step]!
  const firstName = (user?.display_name || user?.username || "").split(" ")[0]

  return (
    <div data-slot="onboarding-page" className="flex flex-col gap-10">
      <OnboardingStepper steps={STEPS} current={step} />

      <AnimatePresence mode="wait">
        <motion.section
          key={step}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="flex flex-col gap-8"
        >
          <header className="flex flex-col gap-3">
            <span className="text-2xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Step {step + 1} of {STEPS.length}
              {step === 0 && firstName && ` · welcome, ${firstName}`}
            </span>
            <h1 className="font-serif text-4xl leading-[1.05] tracking-[-0.01em] sm:text-5xl">
              {info.heading}
            </h1>
            <p className="max-w-xl text-sm/relaxed text-muted-foreground">
              {info.lead}
            </p>
          </header>

          {error && <AuthNotice tone="error">{error}</AuthNotice>}

          {step === 0 && (
            <OrganizationStep
              initialName={
                organization?.name ??
                (user ? `${user.display_name || user.username}'s projects` : "")
              }
              onDone={(org) => {
                setOrganization(org)
                setStep(1)
              }}
            />
          )}
          {step === 1 && (
            <ModelStep
              onDone={({ useLocalModels: local }) => {
                setUseLocalModels(local)
                setStep(2)
              }}
            />
          )}
          {step === 2 && organization && (
            <RepositoryStep
              organizationId={organization.id}
              isFinishing={isFinishing}
              onFinish={finish}
            />
          )}
        </motion.section>
      </AnimatePresence>

      {step > 0 && !isFinishing && (
        <button
          type="button"
          onClick={() => setStep(step - 1)}
          className="self-start text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Back
        </button>
      )}
    </div>
  )
}
