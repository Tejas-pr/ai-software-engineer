import { createBrowserRouter } from "react-router-dom"
import { RouteErrorBoundary } from "@/components/organisms/auth/route-error-boundary"
import { AuthPageSkeleton } from "@/components/molecules/skeletons/auth-page-skeleton"
import { LandingPageSkeleton } from "@/components/molecules/skeletons/landing-skeleton"
import { PageSkeleton } from "@/components/molecules/skeletons/page-skeleton"
import { AppLayout } from "@/layouts/app-layout"
import { AuthLayout } from "@/layouts/auth-layout"
import { OnboardingLayout } from "@/layouts/onboarding-layout"
import { PublicLayout } from "@/layouts/public-layout"
import { RootLayout } from "@/layouts/root-layout"
import { paths } from "@/lib/common/paths"

// Layouts load with the app; every page is its own chunk (the top progress
// bar shows while one loads)
export const router = createBrowserRouter([
  {
    Component: RootLayout,
    ErrorBoundary: RouteErrorBoundary,
    HydrateFallback: PageSkeleton,
    children: [
      {
        Component: PublicLayout,
        HydrateFallback: LandingPageSkeleton,
        children: [
          {
            index: true,
            ErrorBoundary: RouteErrorBoundary,
            lazy: async () => ({
              Component: (await import("@/pages/common/landing-page"))
                .LandingPage,
            }),
          },
          {
            path: paths.agents,
            ErrorBoundary: RouteErrorBoundary,
            lazy: async () => ({
              Component: (await import("@/pages/common/agents-page"))
                .AgentsPage,
            }),
          },
          {
            path: paths.setup,
            ErrorBoundary: RouteErrorBoundary,
            lazy: async () => ({
              Component: (await import("@/pages/common/setup-page")).SetupPage,
            }),
          },
          {
            path: "*",
            lazy: async () => ({
              Component: (await import("@/pages/common/not-found-page"))
                .NotFoundPage,
            }),
          },
        ],
      },
      {
        Component: AuthLayout,
        HydrateFallback: AuthPageSkeleton,
        children: [
          {
            path: paths.auth.signin,
            ErrorBoundary: RouteErrorBoundary,
            lazy: async () => ({
              Component: (await import("@/pages/auth/signin-page")).SigninPage,
            }),
          },
          {
            path: paths.auth.signup,
            ErrorBoundary: RouteErrorBoundary,
            lazy: async () => ({
              Component: (await import("@/pages/auth/signup-page")).SignupPage,
            }),
          },
          {
            path: paths.auth.callback,
            ErrorBoundary: RouteErrorBoundary,
            lazy: async () => ({
              Component: (await import("@/pages/auth/auth-callback-page"))
                .AuthCallbackPage,
            }),
          },
          {
            path: paths.auth.signout,
            ErrorBoundary: RouteErrorBoundary,
            lazy: async () => ({
              Component: (await import("@/pages/auth/signout-page"))
                .SignoutPage,
            }),
          },
        ],
      },
      {
        Component: OnboardingLayout,
        HydrateFallback: PageSkeleton,
        children: [
          {
            path: paths.onboarding,
            ErrorBoundary: RouteErrorBoundary,
            lazy: async () => ({
              Component: (await import("@/pages/onboarding/onboarding-page"))
                .OnboardingPage,
            }),
          },
        ],
      },
      {
        Component: AppLayout,
        HydrateFallback: PageSkeleton,
        // `handle.title` names the page in the top bar's breadcrumb
        children: [
          {
            path: paths.dashboard,
            handle: { title: "Overview" },
            ErrorBoundary: RouteErrorBoundary,
            lazy: async () => ({
              Component: (await import("@/pages/dashboard/dashboard-page"))
                .DashboardPage,
            }),
          },
          {
            path: paths.dashboardAgents,
            handle: { title: "Agents" },
            ErrorBoundary: RouteErrorBoundary,
            lazy: async () => ({
              Component: (
                await import("@/pages/dashboard/dashboard-agents-page")
              ).DashboardAgentsPage,
            }),
          },
          {
            path: paths.projects.root,
            handle: { title: "Repositories" },
            ErrorBoundary: RouteErrorBoundary,
            lazy: async () => ({
              Component: (await import("@/pages/projects/projects-page"))
                .ProjectsPage,
            }),
          },
          {
            path: paths.projects.detail,
            handle: { title: "Repository" },
            ErrorBoundary: RouteErrorBoundary,
            lazy: async () => ({
              Component: (await import("@/pages/projects/project-detail-page"))
                .ProjectDetailPage,
            }),
          },
          {
            path: paths.runs,
            handle: { title: "Runs" },
            ErrorBoundary: RouteErrorBoundary,
            lazy: async () => ({
              Component: (await import("@/pages/runs/runs-page")).RunsPage,
            }),
          },
          {
            path: paths.settings.organization,
            handle: { title: "Organization settings" },
            ErrorBoundary: RouteErrorBoundary,
            lazy: async () => ({
              Component: (
                await import("@/pages/settings/organization-settings-page")
              ).OrganizationSettingsPage,
            }),
          },
          {
            path: paths.settings.members,
            handle: { title: "Members" },
            ErrorBoundary: RouteErrorBoundary,
            lazy: async () => ({
              Component: (await import("@/pages/settings/members-page"))
                .MembersPage,
            }),
          },
          {
            path: paths.settings.apiKeys,
            handle: { title: "API keys" },
            ErrorBoundary: RouteErrorBoundary,
            lazy: async () => ({
              Component: (await import("@/pages/settings/api-keys-page"))
                .ApiKeysPage,
            }),
          },
          {
            path: paths.settings.resources,
            handle: { title: "Hardware & resources" },
            ErrorBoundary: RouteErrorBoundary,
            lazy: async () => ({
              Component: (
                await import("@/pages/settings/resource-settings-page")
              ).ResourceSettingsPage,
            }),
          },
          {
            path: paths.account,
            handle: { title: "Profile" },
            ErrorBoundary: RouteErrorBoundary,
            lazy: async () => ({
              Component: (await import("@/pages/account/account-page"))
                .AccountPage,
            }),
          },
        ],
      },
    ],
  },
])
