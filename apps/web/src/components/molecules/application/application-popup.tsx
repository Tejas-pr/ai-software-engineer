import * as React from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import { X } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import {
  ApplicationButton,
  type ApplicationButtonVariant,
} from "./application-button"
import {
  BACKDROP_MOTION,
  PANEL_FADE,
  PANEL_MOTION,
} from "./application-popup-motion"

export type ApplicationPopupSize = "sm" | "default" | "lg" | "xl"

export interface ApplicationPopupAction {
  label: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: ApplicationButtonVariant
}

export interface ApplicationPopupProps {
  /** Controlled open state of popup */
  isOpen: boolean
  /** Callback fired when popup requests to close */
  onClose: () => void
  /** Dialog title */
  title?: React.ReactNode
  /** Dialog subtitle/description */
  description?: React.ReactNode
  /** Dialog body content */
  children?: React.ReactNode
  /** Dialog action buttons at the bottom */
  footer?: React.ReactNode
  /** Optional primary action button (rendered if footer is omitted) */
  primaryAction?: ApplicationPopupAction
  /** Optional secondary action button (rendered if footer is omitted) */
  secondaryAction?: ApplicationPopupAction
  /** Max width sizing preset */
  size?: ApplicationPopupSize
  /** Show the top-right X close button */
  showCloseButton?: boolean
  /** Close when user clicks the background backdrop (default true) */
  closeOnBackdropClick?: boolean
  /** Close when user presses Escape key (default true) */
  closeOnEscape?: boolean
  /** Custom classes for dialog panel */
  className?: string
  /** Custom classes for backdrop */
  backdropClassName?: string
  /** Show divider line under header */
  headerBorder?: boolean
}

/**
 * Standard Application Popup / Modal.
 *
 * Built with motion.dev (motion/react):
 * - Apple-style open / close: soft spring scale with a clearing blur, a
 *   quicker shrink-and-fade out (plain fade with reduced motion)
 * - Blurred backdrop fade transition
 * - Keyboard (Escape) & backdrop click handling
 * - Clean portal mounting & focus retention
 * - 4px grid system tokens; compact like the app's cards (16px / 20px
 *   padding, 16px between sections, 16px semibold title, rounded-xl)
 */
export function ApplicationPopup({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  primaryAction,
  secondaryAction,
  size = "default",
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className,
  backdropClassName,
  headerBorder = false,
}: ApplicationPopupProps) {
  const reduceMotion = useReducedMotion()
  const panelMotion = reduceMotion ? PANEL_FADE : PANEL_MOTION
  const isClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  // Handle ESC key press
  React.useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, closeOnEscape, onClose])

  // Prevent background body scroll when open
  React.useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  if (!isClient) return null

  // 352 / 448 / 576 / 768px: a step narrower than Tailwind's sm / lg / 2xl /
  // 4xl, so popups stay compact
  const sizeClasses: Record<ApplicationPopupSize, string> = {
    sm: "max-w-88",
    default: "max-w-md",
    lg: "max-w-xl",
    xl: "max-w-3xl",
  }

  const hasFooter = Boolean(footer || primaryAction || secondaryAction)

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        >
          {/* Animated Backdrop */}
          <motion.div
            {...BACKDROP_MOTION}
            onClick={closeOnBackdropClick ? onClose : undefined}
            className={cn(
              "fixed inset-0 bg-black/50 backdrop-blur-xs",
              backdropClassName
            )}
            aria-hidden="true"
          />

          {/* Animated Modal Dialog Panel */}
          <motion.div
            {...panelMotion}
            className={cn(
              // Compact like the app's cards: 16px / 20px padding, 16px
              // between header, body and footer
              "relative z-10 flex max-h-[calc(100svh-2rem)] w-full scrollbar-thin flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg sm:p-5",
              sizeClasses[size],
              className
            )}
          >
            {/* Header */}
            {(title || description || showCloseButton) && (
              <div
                className={cn(
                  "flex items-start justify-between gap-3",
                  headerBorder &&
                    "-mx-4 border-b border-border/70 px-4 pb-3.5 sm:-mx-5 sm:px-5"
                )}
              >
                <div className="flex flex-col gap-1">
                  {title && (
                    <h2 className="text-base font-semibold text-foreground">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="text-xs/relaxed text-muted-foreground sm:text-sm/relaxed">
                      {description}
                    </p>
                  )}
                </div>

                {showCloseButton && (
                  <ApplicationButton
                    variant="ghost"
                    size="icon-sm"
                    onClick={onClose}
                    // Tucked into the corner, level with the title
                    className="-me-1 -mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={"Close dialog"}
                  >
                    <X className="size-4" />
                  </ApplicationButton>
                )}
              </div>
            )}

            {/* Body */}
            {children && <div className="flex-1 text-sm">{children}</div>}

            {/* Footer */}
            {hasFooter && (
              // No divider: the section gap sets the buttons apart
              <div className="flex w-full flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
                {footer ? (
                  footer
                ) : (
                  <>
                    {secondaryAction && (
                      <ApplicationButton
                        variant={secondaryAction.variant ?? "outline"}
                        onClick={secondaryAction.onClick}
                        disabled={secondaryAction.disabled}
                      >
                        {secondaryAction.label}
                      </ApplicationButton>
                    )}
                    {primaryAction && (
                      <ApplicationButton
                        variant={primaryAction.variant ?? "primary"}
                        onClick={primaryAction.onClick}
                        disabled={primaryAction.disabled}
                      >
                        {primaryAction.label}
                      </ApplicationButton>
                    )}
                  </>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}

export default ApplicationPopup
