import { PageHeader } from "@/components/molecules/common/page-header"
import { AgentCatalog } from "@/components/organisms/agents/agent-catalog"

/** The agents page inside the signed-in shell */
export function DashboardAgentsPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow="Pipeline"
        title="Agents"
        description="What each agent in a run does, the tools it can use and the limits it runs under on this server."
      />
      <AgentCatalog />
    </div>
  )
}
