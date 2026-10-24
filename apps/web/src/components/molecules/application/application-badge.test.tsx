import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ApplicationBadge } from "./application-badge"

describe("<ApplicationBadge />", () => {
  it("renders text and correct data slot", () => {
    render(<ApplicationBadge variant="completed">Finished</ApplicationBadge>)
    const badge = screen.getByText("Finished")
    expect(badge).toBeInTheDocument()
    expect(badge.closest("[data-slot='application-badge']")).toBeInTheDocument()
  })

  it("renders with a dot when requested", () => {
    const { container } = render(
      <ApplicationBadge variant="running" dot>
        In Progress
      </ApplicationBadge>
    )
    expect(container.querySelector(".rounded-full")).toBeInTheDocument()
  })
})
