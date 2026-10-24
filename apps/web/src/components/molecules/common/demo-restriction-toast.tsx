import { useState } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "motion/react"
import { ExternalLink, Server, ChevronDown, ChevronUp } from "lucide-react"
import { useSystemConfig } from "@/hooks/common/use-system-config"
import { paths } from "@/lib/common/paths"
import { REPOSITORY_URL } from "@/lib/common/attribution"
import { ApplicationBadge } from "@/components/molecules/application/application-badge"

export function DemoRestrictionToast() {
  const { isRestricted } = useSystemConfig()
  const [minimized, setMinimized] = useState(false)

  if (!isRestricted) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm sm:max-w-[420px] select-none font-sans">
      <div className="relative overflow-hidden rounded-xl border border-primary/40 bg-card/95 p-3.5 text-card-foreground shadow-2xl backdrop-blur-md transition-all">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Server className="size-3.5" />
            </span>
            <span className="font-mono text-xs font-semibold tracking-tight text-foreground">
              Demo Instance Notice
            </span>
            <ApplicationBadge size="sm" variant="warning" dot>
              Restricted
            </ApplicationBadge>
          </div>

          <button
            type="button"
            onClick={() => setMinimized((prev) => !prev)}
            aria-label={minimized ? "Expand notice" : "Minimize notice"}
            className="flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {minimized ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
        </div>

        {/* Expandable Body */}
        <AnimatePresence initial={false}>
          {!minimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-2.5 flex flex-col gap-2.5 border-t border-border/60 pt-2.5">
                <p className="text-2xs/relaxed text-muted-foreground">
                  This public backend runs on a lightweight instance. To prevent
                  resource exhaustion, <strong>repository cloning</strong> and{" "}
                  <strong>live agent executions</strong> are restricted.
                </p>
                <p className="text-2xs/relaxed text-muted-foreground">
                  Please clone the project to test all agent steps locally, or
                  view the demo walkthrough on GitHub.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <a
                    href={REPOSITORY_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-primary/50 bg-primary/10 px-2.5 py-1 font-mono text-2xs font-medium text-primary transition-colors hover:bg-primary/20"
                  >
                    <span>GitHub & Video</span>
                    <ExternalLink className="size-2.5" />
                  </a>

                  <Link
                    to={paths.setup}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2.5 py-1 font-mono text-2xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <span>Local Setup Guide</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
