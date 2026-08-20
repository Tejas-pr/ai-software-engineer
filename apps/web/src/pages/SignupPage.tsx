import { AuthLayout } from "@/components/auth-layout"
import { SignupForm } from "@/components/signup-form"
import { useRedirectIfAuthed } from "@/hooks/use-auth-guard"

export function SignupPage() {
  useRedirectIfAuthed("/")

  return (
    <AuthLayout>
      <SignupForm />
    </AuthLayout>
  )
}
