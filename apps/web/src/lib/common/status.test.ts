import { describe, expect, it } from "vitest"
import { INDEX_STATUS, PROJECT_STATUS, RUN_DOT, RUN_STATUS } from "./status"

describe("status helpers", () => {
  it("defines presentation mappings for all run statuses", () => {
    expect(RUN_STATUS.pending.label).toBe("Pending")
    expect(RUN_STATUS.running.live).toBe(true)
    expect(RUN_STATUS.awaiting_approval.label).toBe("Needs approval")
    expect(RUN_STATUS.completed.badge).toBe("completed")
    expect(RUN_STATUS.failed.badge).toBe("failed")
    expect(RUN_STATUS.rejected.label).toBe("Rejected")
  })

  it("maps project statuses properly", () => {
    expect(PROJECT_STATUS.pending.label).toBe("Cloning")
    expect(PROJECT_STATUS.ready.badge).toBe("completed")
    expect(PROJECT_STATUS.failed.label).toBe("Clone failed")
  })

  it("maps index statuses properly", () => {
    expect(INDEX_STATUS.none.label).toBe("Not indexed")
    expect(INDEX_STATUS.indexing.badge).toBe("running")
    expect(INDEX_STATUS.ready.label).toBe("Indexed")
    expect(INDEX_STATUS.failed.badge).toBe("failed")
  })

  it("maps status dots for run statuses", () => {
    expect(RUN_DOT.running).toBe("bg-run-running")
    expect(RUN_DOT.failed).toBe("bg-run-failed")
    expect(RUN_DOT.completed).toBe("bg-run-completed")
  })
})
