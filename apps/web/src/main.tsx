import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@workspace/ui/globals.css"
import { App } from "@/App"
import { AuthProvider } from "@/providers/auth/auth-provider"
import { ThemeProvider } from "@/providers/theme/theme-provider"

import { AUTHOR, AUTHOR_URL, REPOSITORY_URL } from "@/lib/common/attribution"

// The author's signature, for anyone who opens the console
console.info(
  `%cAI Software Engineer%c — built by ${AUTHOR} · ${AUTHOR_URL}\nSource: ${REPOSITORY_URL}`,
  "font-weight:600;color:#e0a526",
  "color:inherit"
)

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
