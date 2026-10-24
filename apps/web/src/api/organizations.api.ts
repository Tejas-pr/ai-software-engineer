import { apiClient } from "./api"
import type { AgentRun, RunListItem } from "./agent.api"
import { API_ENDPOINTS } from "./endpoints"

export type OrgRole = "owner" | "member"

export interface Organization {
  id: number
  name: string
  slug: string
  is_personal: boolean
  created_by: number
  created_at: string
  /** The signed-in user's role in it */
  role: OrgRole
  member_count: number
  project_count: number
}

export interface Member {
  user_id: number
  username: string
  display_name: string | null
  avatar_url: string | null
  email: string
  role: OrgRole
  joined_at: string
}

export interface OrgOverview {
  projects: {
    total: number
    ready: number
    pending: number
    failed: number
    indexed: number
  }
  runs: {
    total: number
    by_status: Partial<Record<AgentRun["status"], number>>
    active: number
    /** completed ÷ finished, or null before any run has finished */
    success_rate: number | null
    prs_opened: number
  }
  daily: { date: string; runs: number; completed: number; failed: number }[]
  recent_runs: RunListItem[]
}

export async function listOrganizations(): Promise<Organization[]> {
  const res = await apiClient.get<Organization[]>(API_ENDPOINTS.ORGS)
  return res.data
}

export async function createOrganization(name: string): Promise<Organization> {
  const res = await apiClient.post<Organization>(API_ENDPOINTS.ORGS, { name })
  return res.data
}

export async function renameOrganization(
  id: number,
  name: string
): Promise<Organization> {
  const res = await apiClient.patch<Organization>(API_ENDPOINTS.ORG(id), {
    name,
  })
  return res.data
}

export async function deleteOrganization(id: number): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.ORG(id))
}

export async function getOverview(id: number): Promise<OrgOverview> {
  const res = await apiClient.get<OrgOverview>(API_ENDPOINTS.ORG_OVERVIEW(id))
  return res.data
}

export async function listMembers(id: number): Promise<Member[]> {
  const res = await apiClient.get<Member[]>(API_ENDPOINTS.ORG_MEMBERS(id))
  return res.data
}

export async function addMember(
  id: number,
  username: string,
  role: OrgRole
): Promise<void> {
  await apiClient.post(API_ENDPOINTS.ORG_MEMBERS(id), { username, role })
}

export async function changeMemberRole(
  id: number,
  userId: number,
  role: OrgRole
): Promise<void> {
  await apiClient.patch(API_ENDPOINTS.ORG_MEMBER(id, userId), { role })
}

/** Remove someone (owners) or leave (yourself) */
export async function removeMember(id: number, userId: number): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.ORG_MEMBER(id, userId))
}
