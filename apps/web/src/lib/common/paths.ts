// Every route in one place: link with these, never a string literal.
// The GitHub callback path is fixed by the API's redirect
// (FRONTEND_URL/login/callback), so it can't move on its own.
export const paths = {
  home: "/",
  agents: "/agents",
  setup: "/setup",
  auth: {
    signin: "/login",
    signup: "/signup",
    callback: "/login/callback",
    signout: "/logout",
  },
  onboarding: "/onboarding",
  dashboard: "/dashboard",
  /** The agents page inside the signed-in shell (public one: `agents`) */
  dashboardAgents: "/dashboard/agents",
  projects: {
    root: "/projects",
    detail: "/projects/:projectId",
  },
  runs: "/runs",
  settings: {
    organization: "/settings",
    members: "/settings/members",
    apiKeys: "/settings/api-keys",
  },
  account: "/account",
} as const

export const projectPath = (id: number | string) => `/projects/${id}`
