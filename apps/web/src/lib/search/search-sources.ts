import type { RunListItem } from "@/api/agent.api"
import type { Project } from "@/api/projects.api"
import { paths, projectPath } from "@/lib/common/paths"
import type { SearchItem } from "@/lib/search/types"

/**
 * Static application pages available in search
 */
export function pageItems(): SearchItem[] {
  return [
    {
      id: "Pages:dashboard",
      group: "Pages",
      label: "Overview",
      hint: "Dashboard and organization summary",
      path: paths.dashboard,
      keywords: ["dashboard", "home", "stats", "overview", "recent"],
    },
    {
      id: "Pages:projects",
      group: "Pages",
      label: "Repositories",
      hint: "Connected GitHub repositories",
      path: paths.projects.root,
      keywords: ["repos", "projects", "git", "codebase", "repositories"],
    },
    {
      id: "Pages:runs",
      group: "Pages",
      label: "Runs",
      hint: "Agent runs and execution tasks",
      path: paths.runs,
      keywords: ["tasks", "history", "pipeline", "jobs", "runs"],
    },
    {
      id: "Pages:agents",
      group: "Pages",
      label: "Agents pipeline",
      hint: "The 7-step multi-agent architecture",
      path: paths.dashboardAgents,
      keywords: [
        "pipeline",
        "agents",
        "researcher",
        "planner",
        "coder",
        "tester",
        "reviewer",
      ],
    },
    {
      id: "Pages:settings:organization",
      group: "Pages",
      label: "Organization settings",
      hint: "General organization profile and settings",
      path: paths.settings.organization,
      keywords: ["settings", "organization", "danger zone", "delete"],
    },
    {
      id: "Pages:settings:members",
      group: "Pages",
      label: "Organization members",
      hint: "Team members and roles",
      path: paths.settings.members,
      keywords: ["members", "team", "users", "roles", "collaborators"],
    },
    {
      id: "Pages:settings:api-keys",
      group: "Pages",
      label: "API keys",
      hint: "Model providers (Gemini, Claude, OpenAI, Ollama)",
      path: paths.settings.apiKeys,
      keywords: [
        "api keys",
        "tokens",
        "providers",
        "gemini",
        "claude",
        "openai",
        "ollama",
      ],
    },
    {
      id: "Pages:account",
      group: "Pages",
      label: "Profile",
      hint: "Your user profile and GitHub connection",
      path: paths.account,
      keywords: ["profile", "account", "user", "github", "me"],
    },
  ]
}

/**
 * Projects converted to searchable items
 */
export function projectSearchItems(projects: Project[] | null): SearchItem[] {
  if (!projects) return []
  return projects.map((project) => ({
    id: `Repositories:${project.id}`,
    group: "Repositories",
    label: project.name,
    hint: `${project.branch} · ${project.status}`,
    path: projectPath(project.id),
    keywords: [
      project.name,
      project.branch,
      project.status,
      project.github_url || "",
      "repo",
      "repository",
    ],
  }))
}

/**
 * Runs converted to searchable items
 */
export function runSearchItems(runs: RunListItem[] | null): SearchItem[] {
  if (!runs) return []
  return runs.slice(0, 30).map((run) => ({
    id: `Runs:${run.id}`,
    group: "Runs",
    label: run.task,
    hint: `${run.project_name} · ${run.status} · ${run.model}`,
    path: `${projectPath(run.project_id)}?run=${run.id}`,
    keywords: [
      run.task,
      run.project_name,
      run.status,
      run.model,
      "run",
      "task",
    ],
  }))
}
