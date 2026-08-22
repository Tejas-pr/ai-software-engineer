import { apiClient } from "./api"
import { API_ENDPOINTS } from "./endpoints"

export interface Project {
  id: number
  name: string
  github_url: string
  branch: string
  description: string | null
  status: "pending" | "ready" | "failed"
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

export async function listProjects(): Promise<Project[]> {
  const res = await apiClient.get<Project[]>(API_ENDPOINTS.PROJECTS)
  return res.data
}

export async function getProject(id: number): Promise<Project> {
  const res = await apiClient.get<Project>(API_ENDPOINTS.PROJECT(id))
  return res.data
}

export async function connectProject(repo: GithubRepo): Promise<Project> {
  const res = await apiClient.post<Project>(API_ENDPOINTS.PROJECTS, {
    github_url: repo.url,
    branch: repo.default_branch,
    name: repo.name,
    description: repo.description,
  })
  return res.data
}

/** Re-attempts the clone for an already-connected (possibly failed) project.
 * The backend reuses the same row for a given (user, github_url) instead of
 * creating a duplicate, so this is just "connect" again with that project's
 * own details — the natural retry path after e.g. pushing a first commit
 * to what was an empty repo. */
export async function reconnectProject(project: Project): Promise<Project> {
  const res = await apiClient.post<Project>(API_ENDPOINTS.PROJECTS, {
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
