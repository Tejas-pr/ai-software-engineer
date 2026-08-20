import { useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { GalleryVerticalEnd } from "lucide-react"
import { SignupForm } from "@/components/signup-form"

export function SignupPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const token = window.localStorage.getItem("token")
    if (token) {
      navigate("/")
    }
  }, [navigate])

  return (
    <div className="grid min-h-svh bg-background text-foreground lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link to="/" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-4" />
            </div>
            AI Software Engineer
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <SignupForm />
          </div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden border-l border-border/50 bg-muted lg:block">
        {/* Placeholder SVG/CSS layout matching shadcn.com block cover image */}
        <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-card/40">
          <div className="relative flex h-48 w-48 items-center justify-center opacity-30">
            {/* The diagonal cross-lines from the screenshot mockup */}
            <div className="absolute inset-0 rounded-xl border border-muted-foreground/30" />
            <div className="absolute inset-x-0 top-1/2 scale-140 rotate-45 border-t border-muted-foreground/20" />
            <div className="absolute inset-x-0 top-1/2 scale-140 -rotate-45 border-t border-muted-foreground/20" />
            <div className="relative z-10 rounded-xl border border-muted-foreground/30 bg-background p-4 shadow-xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10 text-muted-foreground"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
