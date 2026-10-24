import { cn } from "@workspace/ui/lib/utils"
import { AUTHOR, AUTHOR_URL } from "@/lib/common/attribution"

/** "Built by Tejas-pr" with a link to their GitHub */
export function BuiltBy({ className }: { className?: string }) {
  return (
    <span
      data-slot="built-by"
      className={cn("text-xs text-muted-foreground", className)}
    >
      Built by{" "}
      <a
        href={AUTHOR_URL}
        target="_blank"
        rel="noreferrer author"
        className="font-medium text-foreground underline-offset-4 hover:text-link hover:underline"
      >
        {AUTHOR}
      </a>
    </span>
  )
}
