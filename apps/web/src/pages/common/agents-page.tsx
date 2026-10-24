import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { applicationButtonVariants } from "@/components/molecules/application/application-button"
import { SectionHeading } from "@/components/molecules/common/section-heading"
import { AgentCatalog } from "@/components/organisms/agents/agent-catalog"
import { useAuth } from "@/hooks/auth/use-auth"
import { paths } from "@/lib/common/paths"

/** Public: what each agent in the pipeline does */
export function AgentsPage() {
  const { isAuthenticated } = useAuth()

  return (
    <section className="relative isolate">
      <div aria-hidden="true" className="absolute inset-0 -z-10 h-96 bg-grid" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 lg:py-20">
        <div className="flex flex-col gap-5">
          <SectionHeading
            eyebrow="The agents"
            title={
              <>
                Six agents and{" "}
                <em className="text-muted-foreground">one person</em> — you.
              </>
            }
          />
          <p className="max-w-2xl text-sm/relaxed text-muted-foreground">
            Every run goes through the same pipeline. Here is what each step
            does, which tools it can touch and the limits it runs under — read
            live from this server's configuration.
          </p>
        </div>

        <AgentCatalog />

        <div className="flex flex-wrap gap-3">
          <Link
            to={isAuthenticated ? paths.dashboard : paths.auth.signup}
            className={applicationButtonVariants({
              variant: "primary",
              size: "lg",
            })}
          >
            {isAuthenticated
              ? "Open the dashboard"
              : "Try it on your repository"}
            <ArrowRight />
          </Link>
          <Link
            to={paths.setup}
            className={applicationButtonVariants({
              variant: "outline",
              size: "lg",
            })}
          >
            Run it yourself
          </Link>
        </div>
      </div>
    </section>
  )
}
