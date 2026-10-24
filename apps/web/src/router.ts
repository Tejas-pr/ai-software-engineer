import { createBrowserRouter } from "react-router-dom"
import { RouteErrorBoundary } from "@/components/organisms/auth/route-error-boundary"
import { AuthPageSkeleton } from "@/components/molecules/skeletons/auth-page-skeleton"
import { LandingPageSkeleton } from "@/components/molecules/skeletons/landing-skeleton"
import { PageSkeleton } from "@/components/molecules/skeletons/page-skeleton"
import { AppLayout } from "@/layouts/app-layout"
import { AuthLayout } from "@/layouts/auth-layout"
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
        Component: AppLayout,
        HydrateFallback: PageSkeleton,
        children: [
          {
            path: paths.projects.root,
            ErrorBoundary: RouteErrorBoundary,
            lazy: async () => ({
              Component: (await import("@/pages/projects/projects-page"))
                .ProjectsPage,
            }),
          },
          {
            path: paths.projects.detail,
            ErrorBoundary: RouteErrorBoundary,
            lazy: async () => ({
              Component: (await import("@/pages/projects/project-detail-page"))
                .ProjectDetailPage,
            }),
          },
          {
            path: paths.settings,
            ErrorBoundary: RouteErrorBoundary,
            lazy: async () => ({
              Component: (await import("@/pages/settings/settings-page"))
                .SettingsPage,
            }),
          },
        ],
      },
    ],
  },
])
