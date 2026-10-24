import { Outlet, ScrollRestoration } from "react-router-dom"
import { Toaster } from "@workspace/ui/components/toast"
import { NavigationProgress } from "@/components/molecules/common/navigation-progress"

export function RootLayout() {
  return (
    <Toaster>
      <NavigationProgress />
      <Outlet />
      <ScrollRestoration />
    </Toaster>
  )
}
