import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ExternalLink, Server } from "lucide-react"
import { useSystemConfig } from "@/hooks/common/use-system-config"
import { paths } from "@/lib/common/paths"
import { REPOSITORY_URL } from "@/lib/common/attribution"
import { DEMO_RESTRICTION_EVENT } from "@/lib/common/demo-notice"
import { ApplicationBadge } from "@/components/molecules/application/application-badge"
import { ApplicationPopup } from "@/components/molecules/application/application-popup"
import {
  readStorage,
  STORAGE_KEYS,
  writeStorage,
} from "@/lib/common/local-storage"

export function DemoRestrictionToast() {
  const { isRestricted } = useSystemConfig()
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === "undefined") return false
    return readStorage(STORAGE_KEYS.demoNoticeDismissed) !== "true"
  })

  // Listen for programmatic triggers (e.g. user attempts repo connection or agent deployment)
  useEffect(() => {
    function handleShow() {
      setIsOpen(true)
    }
    window.addEventListener(DEMO_RESTRICTION_EVENT, handleShow)
    return () => window.removeEventListener(DEMO_RESTRICTION_EVENT, handleShow)
  }, [])

  function handleDismiss() {
    writeStorage(STORAGE_KEYS.demoNoticeDismissed, "true")
    setIsOpen(false)
  }

  if (!isRestricted) {
    return null
  }

  return (
    <ApplicationPopup
      isOpen={isOpen}
      onClose={handleDismiss}
      size="default"
      title={
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Server className="size-4" />
          </span>
          <span className="font-mono text-base font-semibold">
            Demo Instance Notice
          </span>
          <ApplicationBadge size="sm" variant="warning" dot>
            Restricted
          </ApplicationBadge>
        </div>
      }
      description="This public deployment runs on a lightweight cloud instance."
      primaryAction={{
        label: "Okay, got it",
        onClick: handleDismiss,
        variant: "highlight",
      }}
    >
      <div className="flex flex-col gap-3.5 text-xs/relaxed text-muted-foreground">
        <p>
          To prevent resource exhaustion, <strong>repository cloning</strong> and{" "}
          <strong>live agent executions</strong> are restricted on this public deployment.
        </p>
        <p>
          You can freely explore the organization settings, agent inspection tools, and full dashboard.
          To run live agents on your own repositories, please clone the project locally or watch the demo walkthrough video on GitHub.
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <a
            href={REPOSITORY_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-2xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <span>GitHub & Video Walkthrough</span>
            <ExternalLink className="size-3" />
          </a>

          <Link
            to={paths.setup}
            onClick={handleDismiss}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3 py-1.5 font-mono text-2xs text-foreground transition-colors hover:bg-muted"
          >
            <span>Local Setup Guide</span>
          </Link>
        </div>
      </div>
    </ApplicationPopup>
  )
}
