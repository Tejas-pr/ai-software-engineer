import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Spinner } from "@workspace/ui/components/spinner"
import { AuthNotice } from "@/components/molecules/auth/auth-notice"
import { applicationButtonVariants } from "@/components/molecules/application/application-button"
import { GithubAuthButton } from "@/components/molecules/common/github-auth-button"
import { AuthCard } from "@/components/organisms/auth/auth-card"
import { useAuth } from "@/hooks/auth/use-auth"
import { paths } from "@/lib/common/paths"

type Phase = "signing-out" | "signed-out" | "offline"

/** A check mark that draws itself */
function SignedOutMark() {
  const reduceMotion = useReducedMotion()
  return (
    <motion.span
      initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      className="flex size-10 items-center justify-center rounded-xl border border-run-completed/30 bg-run-completed/10 text-run-completed"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        aria-hidden="true"
      >
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduceMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, delay: 0.15, ease: "easeOut" }}
        />
      </svg>
    </motion.span>
  )
}

// Signing out is a page, not just a menu click: the session ends on
// arrival, then it says so and offers the ways back. Signed-in pages are
// guarded (AppLayout), so Back from here lands on sign in, not stale data.
export function SignoutPage() {
  const { signOut } = useAuth()
  const [phase, setPhase] = useState<Phase>("signing-out")
  // Sign out once, even when StrictMode runs the effect twice
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    void signOut().then((ok) => setPhase(ok ? "signed-out" : "offline"))
  }, [signOut])

  return (
    <AnimatePresence mode="wait">
      {phase === "signing-out" ? (
        <motion.div
          key="pending"
          exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
        >
          <AuthCard
            data-slot="signout-page"
            media={
              <span className="flex size-10 items-center justify-center rounded-xl border bg-card shadow-[0_1px_0_0_var(--border)]">
                <Spinner className="size-4" />
              </span>
            }
            title="Signing you out…"
            description="Ending your session on this device."
          />
        </motion.div>
      ) : (
        <motion.div key="done">
          <AuthCard
            data-slot="signout-page"
            media={<SignedOutMark />}
            title={
              <>
                You're signed <em>out</em>.
              </>
            }
            description="Your session on this device has ended. Your repositories and runs are right where you left them."
            footer={
              <>
                Signed out on a shared computer? You can also revoke access from
                GitHub under Settings → Applications.
              </>
            }
          >
            {phase === "offline" && (
              <AuthNotice tone="error">
                We couldn't reach the server, so the session cookie may linger
                until it expires. You're signed out in this tab.
              </AuthNotice>
            )}
            <GithubAuthButton label="Sign back in" className="w-full" />
            <Link
              to={paths.home}
              className={applicationButtonVariants({
                variant: "outline",
                size: "lg",
                className: "w-full",
              })}
            >
              Back to home
            </Link>
          </AuthCard>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
