const BASE = "/api/v1"

export const API_ENDPOINTS = {
  AUTH: {
    REFRESH: `${BASE}/accounts/auth/refresh/`,
    LOGOUT: `${BASE}/accounts/auth/logout/`,
    ME: `${BASE}/accounts/auth/me/`,
    GITHUB_LOGIN: `${BASE}/accounts/auth/github/login`,
  },
  ACCOUNT: `${BASE}/account/`,
  ONBOARDING_ORGANIZATION: `${BASE}/account/onboarding/organization`,
  ONBOARDING_COMPLETE: `${BASE}/account/onboarding/complete`,
  ORGS: `${BASE}/orgs/`,
  ORG: (id: number) => `${BASE}/orgs/${id}`,
  ORG_OVERVIEW: (id: number) => `${BASE}/orgs/${id}/overview`,
  ORG_MEMBERS: (id: number) => `${BASE}/orgs/${id}/members`,
  ORG_MEMBER: (id: number, userId: number) =>
    `${BASE}/orgs/${id}/members/${userId}`,
  GITHUB_REPOS: `${BASE}/github/repos`,
  SETTINGS: `${BASE}/settings`,
  SYSTEM_CONFIG: `${BASE}/config`,
  PROJECTS: `${BASE}/projects/`,
  PROJECT: (id: number) => `${BASE}/projects/${id}`,
  PROJECT_ISSUES: (id: number) => `${BASE}/projects/${id}/issues`,
  PROJECT_INDEX: (id: number) => `${BASE}/projects/${id}/index`,
  AGENT_CATALOG: `${BASE}/agent/catalog`,
  AGENT_RUNS: `${BASE}/agent/runs`,
  AGENT_RUN: (id: number) => `${BASE}/agent/runs/${id}`,
  AGENT_RUN_STREAM: (id: number) => `${BASE}/agent/runs/${id}/stream`,
  AGENT_RUN_APPROVE: (id: number) => `${BASE}/agent/runs/${id}/approve`,
  AGENT_RUN_RETRY: (id: number) => `${BASE}/agent/runs/${id}/retry`,
  AGENT_RUN_CANCEL: (id: number) => `${BASE}/agent/runs/${id}/cancel`,
}
