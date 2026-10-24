import * as React from "react"
import { Fragment, type ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@workspace/ui/components/card"

// ---------------------------------------------------------------------------
// Types & Variants
// ---------------------------------------------------------------------------

export type ApplicationCardVariant =
  "default" | "interactive" | "flat" | "muted" | "ghost"

export type ApplicationCardSize = "default" | "sm" | "lg"

export interface ApplicationCardProps extends React.ComponentProps<"div"> {
  /** Visual style variant */
  variant?: ApplicationCardVariant
  /** Padding and sizing scale */
  size?: ApplicationCardSize
  /** Optional ref passed directly (React 19) */
  ref?: React.Ref<HTMLDivElement>
}

// ---------------------------------------------------------------------------
// Base ApplicationCard
// ---------------------------------------------------------------------------

export function ApplicationCard({
  variant = "default",
  size = "default",
  onClick,
  onKeyDown,
  tabIndex,
  role,
  className,
  ref,
  ...props
}: ApplicationCardProps) {
  const isInteractive = variant === "interactive" || Boolean(onClick)

  const variantClasses: Record<ApplicationCardVariant, string> = {
    default:
      "rounded-xl border border-border/80 bg-card text-card-foreground shadow-2xs transition-shadow duration-150",
    interactive:
      "cursor-pointer rounded-xl border border-border/80 bg-card text-card-foreground shadow-2xs outline-hidden transition-all duration-150 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-hidden",
    flat: "rounded-xl border border-border/60 bg-muted/30 text-card-foreground",
    muted:
      "rounded-xl border border-border/50 bg-muted/60 text-muted-foreground",
    ghost: "rounded-xl border-transparent bg-transparent text-card-foreground",
  }

  const sizeClasses: Record<ApplicationCardSize, string> = {
    default: "",
    sm: "data-[size=sm]:[--card-spacing:--spacing(3)]",
    lg: "data-[size=lg]:[--card-spacing:--spacing(6)]",
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e)
    if (isInteractive && onClick && !e.defaultPrevented) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        onClick(e as unknown as React.MouseEvent<HTMLDivElement>)
      }
    }
  }

  return (
    <Card
      ref={ref}
      data-slot="application-card"
      data-size={size}
      role={role ?? (isInteractive ? "button" : undefined)}
      tabIndex={tabIndex ?? (isInteractive ? 0 : undefined)}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        variantClasses[
          isInteractive && variant === "default" ? "interactive" : variant
        ],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// Sub-components (Shadcn wrappers with app design tokens)
// ---------------------------------------------------------------------------

export interface ApplicationCardHeaderProps extends React.ComponentProps<
  typeof CardHeader
> {
  bordered?: boolean
  ref?: React.Ref<HTMLDivElement>
}

export function ApplicationCardHeader({
  bordered = false,
  className,
  ref,
  ...props
}: ApplicationCardHeaderProps) {
  return (
    <CardHeader
      ref={ref}
      data-slot="application-card-header"
      className={cn(bordered && "border-b border-border/70 pb-3", className)}
      {...props}
    />
  )
}

export interface ApplicationCardTitleProps extends React.ComponentProps<
  typeof CardTitle
> {
  ref?: React.Ref<HTMLDivElement>
}

export function ApplicationCardTitle({
  className,
  ref,
  ...props
}: ApplicationCardTitleProps) {
  return (
    <CardTitle
      ref={ref}
      data-slot="application-card-title"
      className={cn("font-bold text-foreground", className)}
      {...props}
    />
  )
}

export interface ApplicationCardDescriptionProps extends React.ComponentProps<
  typeof CardDescription
> {
  ref?: React.Ref<HTMLDivElement>
}

export function ApplicationCardDescription({
  className,
  ref,
  ...props
}: ApplicationCardDescriptionProps) {
  return (
    <CardDescription
      ref={ref}
      data-slot="application-card-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

export interface ApplicationCardActionProps extends React.ComponentProps<
  typeof CardAction
> {
  ref?: React.Ref<HTMLDivElement>
}

export function ApplicationCardAction({
  className,
  ref,
  ...props
}: ApplicationCardActionProps) {
  return (
    <CardAction
      ref={ref}
      data-slot="application-card-action"
      className={className}
      {...props}
    />
  )
}

export interface ApplicationCardContentProps extends React.ComponentProps<
  typeof CardContent
> {
  ref?: React.Ref<HTMLDivElement>
}

export function ApplicationCardContent({
  className,
  ref,
  ...props
}: ApplicationCardContentProps) {
  return (
    <CardContent
      ref={ref}
      data-slot="application-card-content"
      className={className}
      {...props}
    />
  )
}

export interface ApplicationCardFooterProps extends React.ComponentProps<
  typeof CardFooter
> {
  bordered?: boolean
  ref?: React.Ref<HTMLDivElement>
}

export function ApplicationCardFooter({
  bordered = false,
  className,
  ref,
  ...props
}: ApplicationCardFooterProps) {
  return (
    <CardFooter
      ref={ref}
      data-slot="application-card-footer"
      className={cn(bordered && "border-t border-border/70 pt-3", className)}
      {...props}
    />
  )
}

// ---------------------------------------------------------------------------
// Structured Entity Card (Pattern for Facilities, Rooms, Tables, Devices, etc.)
// ---------------------------------------------------------------------------

export interface ApplicationEntityCardAttribute {
  label: string
  value: ReactNode
  tabular?: boolean
}

export interface ApplicationEntityCardProps {
  /** Optional image URL icon */
  iconSrc?: string
  /** Alt text for icon image */
  iconAlt?: string
  /** Custom classes for image icon */
  iconClassName?: string
  /** Optional icon element (e.g. Lucide icon) to use instead of image */
  icon?: ReactNode
  /** Card primary title */
  title: ReactNode
  /** Card subtitle or secondary identifier */
  subtitle?: ReactNode
  /** Status badges or labels */
  badges?: ReactNode
  /** List of label/value attributes rendered in a 2-column grid */
  attributes?: ApplicationEntityCardAttribute[]
  /** Custom body content (rendered instead of or below attributes) */
  children?: ReactNode
  /** Footer content on the left (e.g., stats or counters) */
  footerLeft?: ReactNode
  /** Footer content on the right (e.g., action buttons) */
  footerRight?: ReactNode
  /** Click handler (makes the card interactive) */
  onClick?: () => void
  /** Additional card container classes */
  className?: string
  /** Data slot for testing/inspecting */
  "data-slot"?: string
  /** Direct ref (React 19) */
  ref?: React.Ref<HTMLDivElement>
}

export function ApplicationEntityCard({
  iconSrc,
  iconAlt = "",
  iconClassName = "h-11 w-12",
  icon,
  title,
  subtitle,
  badges,
  attributes,
  children,
  footerLeft,
  footerRight,
  onClick,
  className,
  "data-slot": dataSlot = "application-entity-card",
  ref,
}: ApplicationEntityCardProps) {
  return (
    <ApplicationCard
      ref={ref}
      data-slot={dataSlot}
      variant="interactive"
      onClick={onClick}
      className={cn(
        "group group/card flex h-[238px] w-full flex-col justify-between gap-0 rounded-[12px] p-0 py-0",
        className
      )}
    >
      <ApplicationCardHeader
        bordered
        className="flex flex-row items-center gap-3 p-5 pb-3"
      >
        {iconSrc ? (
          <img
            src={iconSrc}
            alt={iconAlt}
            className={cn("shrink-0 object-contain", iconClassName)}
          />
        ) : icon ? (
          <div className="shrink-0">{icon}</div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-2">
            {typeof title === "string" ? (
              <h3
                className="truncate text-sm font-bold text-foreground transition-colors"
                title={title}
              >
                {title}
              </h3>
            ) : (
              title
            )}
            {badges}
          </div>
          {typeof subtitle === "string" ? (
            <p className="truncate font-mono text-xs text-muted-foreground">
              {subtitle}
            </p>
          ) : (
            subtitle
          )}
        </div>
      </ApplicationCardHeader>

      <ApplicationCardContent className="flex flex-1 flex-col justify-center px-5 py-3">
        {attributes && attributes.length > 0 && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
            {attributes.map((attr) => (
              <Fragment key={attr.label}>
                <dt className="text-muted-foreground">{attr.label}</dt>
                <dd
                  className={cn(
                    "text-end text-muted-foreground",
                    attr.tabular && "tabular-nums"
                  )}
                >
                  {attr.value}
                </dd>
              </Fragment>
            ))}
          </dl>
        )}
        {children}
      </ApplicationCardContent>

      {(footerLeft || footerRight) && (
        <ApplicationCardFooter
          bordered
          className="flex items-center justify-between px-5 py-3 text-xs text-muted-foreground"
        >
          <div>{footerLeft}</div>
          {footerRight ? <div>{footerRight}</div> : null}
        </ApplicationCardFooter>
      )}
    </ApplicationCard>
  )
}

// ---------------------------------------------------------------------------
// Compound Component Attachment
// ---------------------------------------------------------------------------

ApplicationCard.Header = ApplicationCardHeader
ApplicationCard.Title = ApplicationCardTitle
ApplicationCard.Description = ApplicationCardDescription
ApplicationCard.Action = ApplicationCardAction
ApplicationCard.Content = ApplicationCardContent
ApplicationCard.Footer = ApplicationCardFooter
ApplicationCard.Entity = ApplicationEntityCard
