import { BrowserRouter, Routes, Route } from "react-router-dom"
import { RepoListPage } from "./pages/RepoList"
import { ProjectDetailPage } from "./pages/ProjectDetail"
import { SettingsPage } from "./pages/Settings"
import { LoginPage } from "./pages/LoginPage"
import { SignupPage } from "./pages/SignupPage"
import { LoginCallback } from "./pages/LoginCallback"
import { NotFound } from "./pages/NotFound"

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RepoListPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login/callback" element={<LoginCallback />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
