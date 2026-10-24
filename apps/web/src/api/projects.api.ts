import { apiClient } from "./api"
import { API_ENDPOINTS } from "./endpoints"

export interface Project {
  id: number
  organization_id: number
  /** Who connected it */
  user_id: number
  name: string
  github_url: string
  branch: string
  /** Also holds the clone error when status is "failed" */
  description: string | null
  status: "pending" | "ready" | "failed"
  /** Semantic-search index, rebuilt after every clone */
  index_status: "none" | "indexing" | "ready" | "failed"
  indexed_at: string | null
  index_error: string | null
  created_at: string
  updated_at: string
}

export interface GithubRepo {
  name: string
  url: string
  private: boolean
  default_branch: string
  description: string | null
}

export interface ProjectIssue {
  number: number
  title: string
  body: string | null
  url: string
  labels: string[]
}

export async function listGithubRepos(): Promise<GithubRepo[]> {
  const res = await apiClient.get<GithubRepo[]>(API_ENDPOINTS.GITHUB_REPOS)
  return res.data
}

export async function listProjects(organizationId: number): Promise<Project[]> {
  const res = await apiClient.get<Project[]>(API_ENDPOINTS.PROJECTS, {
    params: { organization_id: organizationId },
  })
  return res.data
}

export async function getProject(id: number): Promise<Project> {
  const res = await apiClient.get<Project>(API_ENDPOINTS.PROJECT(id))
  return res.data
}

export async function connectProject(
  organizationId: number,
  repo: GithubRepo
): Promise<Project> {
  const res = await apiClient.post<Project>(API_ENDPOINTS.PROJECTS, {
    organization_id: organizationId,
    github_url: repo.url,
    branch: repo.default_branch,
    name: repo.name,
    description: repo.description,
  })
  return res.data
}

/** Re-attempts the clone for an already-connected (possibly failed) project.
 * The backend reuses the same row for a given (organization, github_url) instead of
 * creating a duplicate, so this is just "connect" again with that project's
 * own details — the natural retry path after e.g. pushing a first commit
 * to what was an empty repo. */
export async function reconnectProject(project: Project): Promise<Project> {
  const res = await apiClient.post<Project>(API_ENDPOINTS.PROJECTS, {
    organization_id: project.organization_id,
    github_url: project.github_url,
    branch: project.branch,
    name: project.name,
  })
  return res.data
}

export async function getProjectIssues(id: number): Promise<ProjectIssue[]> {
  const res = await apiClient.get<ProjectIssue[]>(
    API_ENDPOINTS.PROJECT_ISSUES(id)
  )
  return res.data
}

/** Disconnects the repo: its runs, index and workspace go with it */
export async function deleteProject(id: number): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.PROJECT(id))
}

/** Rebuilds the semantic-search index in the background */
export async function reindexProject(id: number): Promise<void> {
  await apiClient.post(API_ENDPOINTS.PROJECT_INDEX(id))
}
