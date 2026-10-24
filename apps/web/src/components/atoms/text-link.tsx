import { Link, type LinkProps } from "react-router-dom"
import { cn } from "@workspace/ui/lib/utils"

export function TextLink({ className, ...props }: LinkProps) {
  return (
    <Link
      data-slot="text-link"
      className={cn(
        "font-medium text-link underline-offset-4 hover:underline",
        className
      )}
      {...props}
    />
  )
}
