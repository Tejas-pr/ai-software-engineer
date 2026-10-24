export const DEMO_RESTRICTION_EVENT = "ase:demo-restriction:show"

/** Dispatches a global event to open the demo instance restriction modal */
export function showDemoRestrictionNotice() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DEMO_RESTRICTION_EVENT))
  }
}
