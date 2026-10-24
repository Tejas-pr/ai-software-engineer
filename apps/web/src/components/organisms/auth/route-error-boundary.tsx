import { TriangleAlert } from "lucide-react"
import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import {
  ApplicationButton,
  applicationButtonVariants,
} from "@/components/molecules/application/application-button"
import { paths } from "@/lib/common/paths"

function getErrorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`
  }

  if (import.meta.env.DEV && error instanceof Error) {
    return error.message
  }

  return "Something went wrong while loading this page. Try again, or go back to the home page."
}

export function RouteErrorBoundary() {
  const error = useRouteError()

  return (
    <Empty data-slot="route-error-boundary" size="lg" className="min-h-svh p-6">
      <EmptyHeader>
        <EmptyMedia variant="destructive" size="lg">
          <TriangleAlert className="size-7" />
        </EmptyMedia>
        <EmptyTitle size="lg" className="font-serif text-4xl font-normal">
          This page couldn't load
        </EmptyTitle>
        <EmptyDescription>{getErrorMessage(error)}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="mt-2 flex-row justify-center gap-3">
        <ApplicationButton onClick={() => window.location.reload()}>
          Try again
        </ApplicationButton>
        <Link
          to={paths.home}
          className={applicationButtonVariants({ variant: "outline" })}
        >
          Back to home
        </Link>
      </EmptyContent>
    </Empty>
  )
}
