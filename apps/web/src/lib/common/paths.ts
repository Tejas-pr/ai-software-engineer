// Every route in one place: link with these, never a string literal.
// The GitHub callback path is fixed by the API's redirect
// (FRONTEND_URL/login/callback), so it can't move on its own.
export const paths = {
  home: "/",
  auth: {
    signin: "/login",
    signup: "/signup",
    callback: "/login/callback",
    signout: "/logout",
  },
  projects: {
    root: "/projects",
    detail: "/projects/:projectId",
  },
  settings: "/settings",
} as const

export const projectPath = (id: number | string) => `/projects/${id}`
