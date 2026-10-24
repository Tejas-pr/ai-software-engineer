import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

/** The signed-in shell (AppLayout) while the session or a page loads */
export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div
      data-slot="page-skeleton"
      role="status"
      aria-label="Loading page"
      className={cn("flex min-h-svh w-full flex-col bg-background", className)}
    >
      <header className="flex h-14 shrink-0 items-center gap-6 border-b px-4 sm:px-6">
        <Skeleton className="size-7 rounded-lg" />
        <div className="hidden items-center gap-2 sm:flex">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>
        <div className="ms-auto flex items-center gap-2">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="size-7 rounded-full" />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56 rounded-md" />
          <Skeleton className="h-4 w-80 max-w-full rounded-md" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </main>
    </div>
  )
}
