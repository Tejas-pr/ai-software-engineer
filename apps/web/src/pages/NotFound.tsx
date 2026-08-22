import { Link } from "react-router-dom"
import { Button } from "@workspace/ui/components/button"

export function NotFound() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-6 text-foreground">
      <div className="flex max-w-md flex-col items-center space-y-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-border bg-destructive/10 text-destructive">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-10 w-10"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6" />
            <path d="m9 9 6 6" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-extrabold tracking-tighter text-destructive">
            404
          </h1>
          <h2 className="text-xl font-bold tracking-tight">Page Not Found</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The page you are looking for does not exist or has been moved to a
            different location.
          </p>
        </div>

        <Button
          render={<Link to="/" />}
          size="lg"
          className="h-9 cursor-pointer gap-2 rounded-lg py-4 font-semibold shadow-sm"
        >
          Go back home
        </Button>
      </div>
    </div>
  )
}
