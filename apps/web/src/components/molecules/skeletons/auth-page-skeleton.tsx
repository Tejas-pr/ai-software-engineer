import { Skeleton } from "@workspace/ui/components/skeleton"

/** AuthLayout's two columns while a sign-in page loads */
export function AuthPageSkeleton() {
  return (
    <div
      data-slot="auth-page-skeleton"
      role="status"
      aria-label="Loading"
      className="grid min-h-svh bg-background lg:grid-cols-[1fr_minmax(0,46%)]"
    >
      <div className="flex flex-col p-6 sm:p-10">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4">
          <Skeleton className="h-10 w-3/4 rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="mt-4 h-10 w-full rounded-[10px]" />
        </div>
      </div>
      <div className="hidden p-3 lg:block">
        <Skeleton className="size-full rounded-2xl" />
      </div>
    </div>
  )
}
