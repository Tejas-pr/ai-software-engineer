import { useState, useMemo } from "react"
import {
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { ApplicationButton } from "@/components/molecules/application/application-button"
import { ApplicationInput } from "@/components/molecules/application/application-input"
import { ApplicationSelection } from "@/components/molecules/application/application-selection"

export interface ApplicationPaginationProps {
  /** Current active page (1-indexed) */
  page: number
  /** Number of items displayed per page */
  pageSize: number
  /** Total count of items */
  total: number
  /** Callback fired when page changes */
  onPageChange: (page: number) => void
  /** Callback fired when page size changes */
  onPageSizeChange?: (pageSize: number) => void
  /** Available page size options */
  pageSizeOptions?: number[]
  /** Enable "Go to page" direct input. Default: true */
  showGoToPage?: boolean
  /** Placeholder text for "Go to page" input. Default: "Page" */
  goToPagePlaceholder?: string
  /** Enable "Rows per page" selector. Default: true */
  showPageSize?: boolean
  /** Additional class names for outer container */
  className?: string
}

// Backwards compatibility alias
export type ApplicationTablePaginationProps = ApplicationPaginationProps
export type PaginationProps = ApplicationPaginationProps

/**
 * Standard Application Pagination Bar.
 */
export function ApplicationPagination({
  page,
  pageSize: controlledPageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showGoToPage = true,
  goToPagePlaceholder,
  showPageSize = true,
  className,
}: ApplicationPaginationProps) {
  const [prevControlledSize, setPrevControlledSize] =
    useState(controlledPageSize)
  const [internalPageSize, setInternalPageSize] = useState(controlledPageSize)

  if (controlledPageSize !== prevControlledSize) {
    setPrevControlledSize(controlledPageSize)
    setInternalPageSize(controlledPageSize)
  }

  const pageSize = onPageSizeChange ? controlledPageSize : internalPageSize
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endItem = Math.min(total, page * pageSize)

  const [prevPage, setPrevPage] = useState(page)
  const [inputVal, setInputVal] = useState("")

  if (page !== prevPage) {
    setPrevPage(page)
    setInputVal("")
  }

  const handleGoToPage = () => {
    if (!inputVal) return
    const targetPage = Number(inputVal)
    if (targetPage >= 1 && targetPage <= totalPages) {
      onPageChange(targetPage)
    }
    setInputVal("")
  }

  const handlePageSizeSelect = (newSize: number) => {
    if (onPageSizeChange) {
      onPageSizeChange(newSize)
    } else {
      setInternalPageSize(newSize)
      onPageChange(1)
    }
  }

  // Generate pagination pills with ellipsis (O(1) logic for large digit support)
  const paginationRange = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const delta = 1
    const left = Math.max(2, page - delta)
    const right = Math.min(totalPages - 1, page + delta)

    const showLeftEllipsis = left > 2
    const showRightEllipsis = right < totalPages - 1

    const range: (number | "ellipsis")[] = [1]

    if (showLeftEllipsis) {
      range.push("ellipsis")
    }

    for (let i = left; i <= right; i++) {
      range.push(i)
    }

    if (showRightEllipsis) {
      range.push("ellipsis")
    }

    range.push(totalPages)

    return range
  }, [page, totalPages])

  const pageSizeOptionsList = useMemo(
    () =>
      pageSizeOptions.map((opt) => ({
        value: String(opt),
        label: String(opt),
      })),
    [pageSizeOptions]
  )

  return (
    <div
      className={cn(
        "flex flex-col gap-3 px-4 py-3 text-xs text-muted-foreground select-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
        className
      )}
    >
      {/* Left: [« ‹ 1 › »] [Page Input] */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex items-center gap-1">
          <ApplicationButton
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            title={"First Page"}
            aria-label={"First page"}
          >
            <ChevronsLeft className="size-3.5" />
          </ApplicationButton>

          <ApplicationButton
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            title={"Previous Page"}
            aria-label={"Previous page"}
          >
            <ChevronLeft className="size-3.5" />
          </ApplicationButton>

          <div className="flex items-center gap-1 px-0.5">
            {paginationRange.map((item, idx) => {
              if (item === "ellipsis") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="flex size-7 shrink-0 items-center justify-center text-muted-foreground select-none"
                  >
                    …
                  </span>
                )
              }

              const isCurrent = item === page
              return (
                <ApplicationButton
                  key={`page-${item}`}
                  variant={isCurrent ? "primary" : "outline"}
                  size="icon-sm"
                  onClick={() => onPageChange(item)}
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(
                    "h-7 w-auto min-w-7 shrink-0 px-1.5 text-xs font-semibold tabular-nums",
                    !isCurrent &&
                      Math.abs(item - page) > 1 &&
                      "hidden sm:inline-flex"
                  )}
                >
                  {item}
                </ApplicationButton>
              )
            })}
          </div>

          <ApplicationButton
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            title={"Next Page"}
            aria-label={"Next page"}
          >
            <ChevronRight className="size-3.5" />
          </ApplicationButton>

          <ApplicationButton
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            title={"Last Page"}
            aria-label={"Last page"}
          >
            <ChevronsRight className="size-3.5" />
          </ApplicationButton>
        </div>

        {/* Go to page direct input box */}
        {showGoToPage && (
          <ApplicationInput
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            size="sm"
            padding="px-1"
            value={inputVal}
            placeholder={goToPagePlaceholder ?? "Page"}
            onChange={(e) => {
              const val = e.target.value
              if (val === "" || /^[0-9]+$/.test(val)) {
                setInputVal(val)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleGoToPage()
              }
            }}
            onBlur={handleGoToPage}
            title={`Enter page number (1 to ${totalPages})`}
            aria-label={"Go to page"}
            containerClassName={cn(
              "shrink-0",
              String(totalPages).length <= 4 && "w-14 sm:w-16",
              String(totalPages).length > 4 &&
                String(totalPages).length <= 7 &&
                "w-16 sm:w-20",
              String(totalPages).length > 7 &&
                String(totalPages).length <= 10 &&
                "w-20 sm:w-24",
              String(totalPages).length > 10 && "w-28 sm:w-36"
            )}
            inputClassName="text-center font-medium tabular-nums placeholder:text-center placeholder:font-normal placeholder:text-muted-foreground/60"
          />
        )}
      </div>

      {/* Right: "Viewing X-Y (Z total)" */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {showPageSize && (
          <div className="flex items-center gap-1.5 border-r border-border pr-2.5">
            <span className="text-xs whitespace-nowrap text-muted-foreground">
              {"Rows:"}
            </span>
            <ApplicationSelection
              size="sm"
              indicator="chevron-down"
              value={String(pageSize)}
              onValueChange={(val) => {
                if (val) handlePageSizeSelect(Number(val))
              }}
              options={pageSizeOptionsList}
              className="w-auto"
              triggerClassName="h-7 min-w-14 px-2 text-xs font-medium"
              contentClassName="min-w-20 w-auto"
              aria-label={"Rows per page"}
            />
          </div>
        )}

        <span className="text-xs whitespace-nowrap text-muted-foreground">
          Viewing {startItem}–{endItem}{" "}
          <span className="text-muted-foreground/70">({total} total)</span>
        </span>
      </div>
    </div>
  )
}

// Backwards compatibility alias
export const ApplicationTablePagination = ApplicationPagination

export default ApplicationPagination
