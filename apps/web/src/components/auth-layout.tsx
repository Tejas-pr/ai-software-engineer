import { Link } from "react-router-dom"
import { GalleryVerticalEnd } from "lucide-react"

export function AuthLayout({
  children,
  imageSrc = "/login.webp",
}: {
  children: React.ReactNode
  imageSrc?: string
}) {
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
          <div className="w-full max-w-xs">{children}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden border-l border-border/50 bg-muted lg:block">
        <img
          src={imageSrc}
          alt="Authentication cover"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.7]"
        />
      </div>
    </div>
  )
}
