import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@workspace/ui/globals.css"
import { App } from "@/App"
import { AuthProvider } from "@/providers/auth/auth-provider"
import { ThemeProvider } from "@/providers/theme/theme-provider"

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("Missing #root element in index.html")
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
)
