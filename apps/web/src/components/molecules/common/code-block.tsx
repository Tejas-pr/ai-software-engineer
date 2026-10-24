import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

/** A shell snippet with a copy button */
export function CodeBlock({
  code,
  label,
  className,
}: {
  code: string
  /** e.g. the file it goes in, or "terminal" */
  label?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked (insecure context, permissions): selecting works
    }
  }

  return (
    <div
      data-slot="code-block"
      className={cn(
        "dark overflow-hidden rounded-xl border border-white/10 bg-[var(--brand-ink)] text-foreground",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="text-2xs text-muted-foreground">
          {label ?? "terminal"}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy to clipboard"}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-2xs text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          {copied ? (
            <Check className="size-3 text-run-completed" />
          ) : (
            <Copy className="size-3" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-xs/relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}
