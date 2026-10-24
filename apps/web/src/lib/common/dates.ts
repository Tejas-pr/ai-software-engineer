import { format, formatDistanceToNowStrict } from "date-fns"

/**
 * The API's timestamps are UTC but sent without a zone
 * ("2026-10-24T12:00:00"), which `new Date()` would read as local time.
 */
export function parseApiDate(value: string): Date {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`)
}

/** "3 minutes ago" */
export function timeAgo(value: string): string {
  return formatDistanceToNowStrict(parseApiDate(value), { addSuffix: true })
}

/** "Oct 24, 2026, 14:05" */
export function formatDateTime(value: string): string {
  return format(parseApiDate(value), "MMM d, yyyy, HH:mm")
}
