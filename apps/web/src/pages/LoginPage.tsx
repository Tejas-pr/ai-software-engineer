import { AuthLayout } from "@/components/auth-layout"
import { LoginForm } from "@/components/login-form"
import { useRedirectIfAuthed } from "@/hooks/use-auth-guard"

export function LoginPage() {
  useRedirectIfAuthed("/")

  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  )
}
