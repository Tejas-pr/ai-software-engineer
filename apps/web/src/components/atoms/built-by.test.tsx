import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { BuiltBy } from "./built-by"
import { AUTHOR, AUTHOR_URL } from "@/lib/common/attribution"

describe("<BuiltBy />", () => {
  it("renders attribution text and link to the author", () => {
    render(<BuiltBy />)
    const link = screen.getByRole("link", { name: AUTHOR })
    expect(link).toHaveAttribute("href", AUTHOR_URL)
    expect(screen.getByText(/Built by/i)).toBeInTheDocument()
  })
})
