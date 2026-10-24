import { AxiosError, AxiosHeaders } from "axios"
import { describe, expect, it } from "vitest"
import { describeError } from "./api-error"

describe("api-error helper", () => {
  it("extracts detail from Axios error response", () => {
    const error = new AxiosError(
      "Request failed",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        status: 400,
        statusText: "Bad Request",
        data: { detail: "Invalid repository URL" },
        headers: {},
        config: { headers: new AxiosHeaders() },
      }
    )

    expect(describeError(error, "Fallback error")).toBe(
      "Invalid repository URL"
    )
  })

  it("returns fallback for non-axios error or missing detail", () => {
    expect(describeError(new Error("Crash"), "Fallback error")).toBe(
      "Fallback error"
    )
    expect(describeError(null, "Fallback error")).toBe("Fallback error")
  })
})
