import { Link, type LinkProps } from "react-router-dom"
import { cn } from "@workspace/ui/lib/utils"
import { BRAND_NAME, BrandLogo } from "@/components/atoms/brand-logo"
import { paths } from "@/lib/common/paths"

export function BrandLink({
  variant,
  to = paths.home,
  className,
  ...props
}: Omit<LinkProps, "to"> &
  Partial<Pick<LinkProps, "to">> &
  Pick<React.ComponentProps<typeof BrandLogo>, "variant">) {
  return (
    <Link
      data-slot="brand-link"
      to={to}
      aria-label={BRAND_NAME}
      className={cn(
        "flex w-fit items-center rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
        className
      )}
      {...props}
    >
      <BrandLogo variant={variant} />
    </Link>
  )
}
