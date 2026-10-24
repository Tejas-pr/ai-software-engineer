import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@workspace/ui/lib/utils"

const emptyVariants = cva(
  "flex w-full min-w-0 flex-1 flex-col items-center justify-center text-center text-balance select-none",
  {
    variants: {
      size: {
        sm: "min-h-[160px] gap-2.5 p-4 sm:p-6",
        default: "min-h-[260px] gap-4 p-8 sm:p-12",
        lg: "min-h-[420px] gap-6 p-10 sm:p-20",
      },
      bordered: {
        true: "rounded-2xl border-2 border-dashed border-border/80 bg-muted/15",
        false: "",
      },
    },
    defaultVariants: {
      size: "default",
      bordered: false,
    },
  }
)

export interface EmptyProps
  extends React.ComponentProps<"div">, VariantProps<typeof emptyVariants> {}

function Empty({ className, size, bordered, ...props }: EmptyProps) {
  return (
    <div
      data-slot="empty"
      data-size={size ?? "default"}
      className={cn(emptyVariants({ size, bordered, className }))}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn(
        "flex max-w-md flex-col items-center gap-1.5 text-center",
        className
      )}
      {...props}
    />
  )
}

const emptyMediaVariants = cva(
  "mb-2 flex shrink-0 items-center justify-center transition-transform duration-200",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "rounded-xl border border-border/50 bg-muted text-foreground shadow-2xs",
        destructive:
          "rounded-xl border border-destructive/20 bg-destructive/10 text-destructive shadow-2xs",
      },
      size: {
        sm: "size-9 [&_svg]:size-4.5",
        default: "size-12 [&_svg]:size-6",
        lg: "size-16 rounded-2xl [&_svg]:size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface EmptyMediaProps
  extends
    React.ComponentProps<"div">,
    VariantProps<typeof emptyMediaVariants> {}

function EmptyMedia({ className, variant, size, ...props }: EmptyMediaProps) {
  return (
    <div
      data-slot="empty-media"
      data-variant={variant ?? "default"}
      className={cn(emptyMediaVariants({ variant, size, className }))}
      {...props}
    />
  )
}

const emptyTitleVariants = cva("font-heading tracking-tight text-foreground", {
  variants: {
    size: {
      sm: "text-sm font-semibold",
      default: "text-base font-semibold sm:text-lg",
      lg: "text-xl font-bold sm:text-2xl",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

export interface EmptyTitleProps
  extends React.ComponentProps<"h3">, VariantProps<typeof emptyTitleVariants> {}

function EmptyTitle({ className, size, ...props }: EmptyTitleProps) {
  return (
    <h3
      data-slot="empty-title"
      className={cn(emptyTitleVariants({ size, className }))}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-description"
      className={cn(
        "max-w-sm text-sm/relaxed text-balance text-muted-foreground [&>a]:text-link [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-link/80",
        className
      )}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "flex w-full max-w-sm min-w-0 flex-wrap items-center justify-center gap-3 pt-2 text-balance",
        className
      )}
      {...props}
    />
  )
}

export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
  emptyVariants,
  emptyMediaVariants,
  emptyTitleVariants,
}
