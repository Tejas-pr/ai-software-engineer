import axios from "axios"

/** The API's `detail` message when there is one, else `fallback` */
export function describeError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const detail = (err.response?.data as { detail?: unknown } | undefined)
      ?.detail
    if (typeof detail === "string") return detail
  }
  return fallback
}
