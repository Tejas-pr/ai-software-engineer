import { Skeleton } from "@workspace/ui/components/skeleton"

/** The landing hero's outline while the page chunk loads */
export function LandingPageSkeleton() {
  return (
    <div
      data-slot="landing-skeleton"
      role="status"
      aria-label="Loading"
      className="flex min-h-svh flex-col bg-background"
    >
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-20 sm:px-6">
        <Skeleton className="h-6 w-64 rounded-full" />
        <Skeleton className="h-16 w-full max-w-2xl rounded-lg" />
        <Skeleton className="h-16 w-4/5 max-w-xl rounded-lg" />
        <Skeleton className="h-5 w-full max-w-lg rounded-md" />
        <div className="mt-4 flex gap-3">
          <Skeleton className="h-12 w-48 rounded-xl" />
          <Skeleton className="h-12 w-40 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
