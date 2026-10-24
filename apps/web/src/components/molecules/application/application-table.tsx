import * as React from "react"
import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useDebounce, useDebouncedCallback } from "@/hooks/common/use-debounce"
import {
  ChevronRight,
  Inbox,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
  ListFilter,
  X,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@workspace/ui/components/table"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { ApplicationInput } from "@/components/molecules/application/application-input"
import { applicationButtonVariants } from "./application-button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@workspace/ui/components/empty"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@workspace/ui/components/dropdown-menu"
import {
  ApplicationPagination,
  ApplicationTablePagination,
  type ApplicationPaginationProps,
  type ApplicationTablePaginationProps,
  type PaginationProps,
} from "./application-pagination"

export {
  ApplicationPagination,
  ApplicationTablePagination,
  type ApplicationPaginationProps,
  type ApplicationTablePaginationProps,
  type PaginationProps,
}

export interface ApplicationTableColumn<T> {
  /** Column header title or custom element */
  header: React.ReactNode
  /** Object key accessor, can also be a dot-separated nested path (e.g. "user.profile.name") */
  accessorKey?: keyof T | (string & {})
  /** Custom render function for cell content */
  cell?: (item: T, index: number) => React.ReactNode
  /** Additional classes applied to body cells of this column */
  className?: string
  /** Additional classes applied to header cell of this column */
  headerClassName?: string
  /** Enable sorting on this column or provide custom sort key */
  sort?: boolean | string
  /** Text alignment */
  align?: "left" | "center" | "right"
}

// Backwards compatibility alias
export type Column<T> = ApplicationTableColumn<T>

export interface ApplicationTableProps<T> {
  /** Array of row data */
  data: T[]
  /** Column configuration */
  columns: ApplicationTableColumn<T>[]
  /** Unique identifier key accessor or function. Default is "id" */
  idAccessor?: keyof T | ((item: T) => string)
  /** Enable row selection checkboxes */
  showSelection?: boolean
  /** Enable serial number (#) column */
  showSerialNo?: boolean
  /** Custom label for serial number column */
  serialNoLabel?: string
  /** Pagination configuration */
  pagination?: ApplicationTablePaginationProps
  /** Callback fired when a row is clicked */
  onRowClick?: (item: T) => void
  /** Loading skeleton state */
  isLoading?: boolean
  /** Number of skeleton rows to display when isLoading is true. Default: pagination?.pageSize || 5 */
  loadingRowCount?: number
  /** Fix the table header at top during scroll */
  stickyHeader?: boolean
  /** Custom empty state node */
  emptyState?: React.ReactNode
  /** Empty state title when default empty state is shown */
  emptyTitle?: string
  /** Empty state description when default empty state is shown */
  emptyDescription?: string
  /** Visual variant: "default" (bordered card) or "borderless" */
  variant?: "default" | "borderless"
  /** Size preset: "default" | "sm" | "lg" */
  size?: "default" | "sm" | "lg"
  /** Function returning expandable sub-row content */
  renderExpandableRow?: (item: T) => React.ReactNode
  /** Controlled selected row IDs */
  selectedIds?: string[]
  /** Selection change callback */
  onSelectionChange?: (selectedIds: string[]) => void
  /** Enable client-side slicing using pagination props */
  clientSidePagination?: boolean
  /** Show search input filter */
  showSearch?: boolean
  /** Custom search placeholder */
  searchPlaceholder?: string
  /** Controlled search query */
  searchQuery?: string
  /** Controlled search change callback */
  onSearchChange?: (query: string) => void
  /** Debounce delay for search in milliseconds (default 300ms) */
  searchDebounceMs?: number
  /** Property keys to search through (defaults to string columns) */
  searchKeys?: (keyof T | string)[]
  /** Controlled sort key */
  sortKey?: keyof T | string | null
  /** Controlled sort direction */
  sortOrder?: "asc" | "desc"
  /** Sort change callback */
  onSortChange?: (
    sortKey: keyof T | string | null,
    sortOrder: "asc" | "desc"
  ) => void
  /** Additional class names for table element */
  tableClassName?: string
  /** Additional class names for outer container */
  className?: string
  /** Additional actions to render on the right side of the toolbar */
  toolbarActions?: React.ReactNode
}

// Backwards compatibility alias
export type Props<T> = ApplicationTableProps<T>

/**
 * Safely extracts a nested property value from an object given a dot-separated path.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function getNestedValue<T>(
  obj: T,
  path?: keyof T | string | null
): unknown {
  if (obj == null || path == null) return undefined
  if (typeof path === "symbol" || typeof path === "number") {
    return (obj as Record<PropertyKey, unknown>)[path]
  }
  const stringPath = String(path)
  if (!stringPath.includes(".")) {
    return (obj as Record<string, unknown>)[stringPath]
  }
  return stringPath.split(".").reduce<unknown>((acc, part) => {
    if (acc == null) return undefined
    return (acc as Record<string, unknown>)[part]
  }, obj)
}

function getRowId<T>(
  item: T,
  idAccessor: keyof T | ((item: T) => string)
): string {
  if (typeof idAccessor === "function") {
    return idAccessor(item)
  }
  const val = item[idAccessor]
  return val != null ? String(val) : ""
}

/**
 * Loading Skeleton for Application Table.
 */
export function ApplicationTableSkeleton<T>({
  columns,
  rowCount = 5,
  showSelection = false,
  showSerialNo = false,
  hasAction = false,
  showExpand = false,
  size = "default",
}: {
  columns: ApplicationTableColumn<T>[]
  rowCount?: number
  showSelection?: boolean
  showSerialNo?: boolean
  hasAction?: boolean
  showExpand?: boolean
  size?: "default" | "sm" | "lg"
}) {
  const cellHeightClass =
    size === "sm" ? "h-9 py-1.5" : size === "lg" ? "h-14 py-3" : "h-11 py-2"

  const widths = ["w-3/4", "w-1/2", "w-2/3", "w-4/5", "w-3/5"]

  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIndex) => (
        <TableRow
          key={`skeleton-row-${rowIndex}`}
          className="border-b border-border/60 hover:bg-transparent"
        >
          {showExpand && (
            <TableCell className={cn("w-10 px-3", cellHeightClass)}>
              <Skeleton className="size-4 rounded-sm" />
            </TableCell>
          )}

          {showSelection && (
            <TableCell className={cn("w-10 px-3", cellHeightClass)}>
              <Skeleton className="size-4 rounded-[4px]" />
            </TableCell>
          )}

          {showSerialNo && (
            <TableCell className={cn("w-12 px-3", cellHeightClass)}>
              <Skeleton className="h-4 w-5" />
            </TableCell>
          )}

          {columns.map((col, colIndex) => (
            <TableCell
              key={`skeleton-col-${colIndex}`}
              className={cn("px-3", cellHeightClass, col.className)}
            >
              <Skeleton
                className={cn(
                  "h-4",
                  widths[(rowIndex + colIndex) % widths.length]
                )}
              />
            </TableCell>
          ))}

          {hasAction && (
            <TableCell className={cn("w-10 px-3 text-right", cellHeightClass)}>
              <Skeleton className="ml-auto size-4 rounded-sm" />
            </TableCell>
          )}
        </TableRow>
      ))}
    </>
  )
}

// Backwards compatibility alias
export const TableSkeleton = ApplicationTableSkeleton

/**
 * Standard Application Table Component.
 *
 * Implements:
 * - 4px grid, semantic OKLCH tokens
 * - Motion animations via `motion/react`
 * - Base UI primitives integration
 * - Sorting (column headers + mobile sort menu)
 * - Search filtering with auto-reset pagination
 * - Multi-row selection with indeterminate state
 * - Expandable rows with smooth collapse/expand transition
 * - Built-in responsive pagination
 * - Loading skeleton & empty states
 */
export function ApplicationTable<T extends Record<string, unknown>>({
  data,
  columns,
  idAccessor = "id" as keyof T,
  showSelection = false,
  showSerialNo = false,
  serialNoLabel = "#",
  pagination,
  onRowClick,
  isLoading = false,
  loadingRowCount,
  stickyHeader = false,
  emptyState,
  emptyTitle,
  emptyDescription,
  variant = "default",
  size = "default",
  renderExpandableRow,
  selectedIds,
  onSelectionChange,
  clientSidePagination = false,
  showSearch = false,
  searchPlaceholder,
  searchQuery: controlledSearchQuery,
  onSearchChange,
  searchDebounceMs = 300,
  searchKeys,
  sortKey: controlledSortKey,
  sortOrder: controlledSortOrder,
  onSortChange,
  tableClassName,
  className,
  toolbarActions,
}: ApplicationTableProps<T>) {
  // Selection state
  const [internalSelected, setInternalSelected] = useState<string[]>([])
  const selected = selectedIds !== undefined ? selectedIds : internalSelected

  // Sorting state
  const [localSortKey, setLocalSortKey] = useState<keyof T | string | null>(
    null
  )
  const [localSortOrder, setLocalSortOrder] = useState<"asc" | "desc">("asc")

  // Search state with debouncing
  const isControlledSearch = controlledSearchQuery !== undefined
  const [localSearchQuery, setLocalSearchQuery] = useState("")

  const searchQueryInput = isControlledSearch
    ? (controlledSearchQuery ?? "")
    : localSearchQuery

  const debouncedSearchQuery = useDebounce(searchQueryInput, searchDebounceMs)

  const activeSearchQuery = isControlledSearch
    ? (controlledSearchQuery ?? "")
    : debouncedSearchQuery

  const [debouncedSearchNotify, cancelDebouncedSearch] = useDebouncedCallback(
    (query: string) => {
      onSearchChange?.(query)
      if (query && pagination) {
        pagination.onPageChange(1)
      }
    },
    searchDebounceMs
  )

  const handleSearchChange = (query: string) => {
    if (!isControlledSearch) {
      setLocalSearchQuery(query)
    }
    debouncedSearchNotify(query)
  }

  const handleClearSearch = () => {
    cancelDebouncedSearch()
    if (!isControlledSearch) {
      setLocalSearchQuery("")
    }
    onSearchChange?.("")
    pagination?.onPageChange(1)
  }

  // Expanded rows state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Controlled vs local sort resolution
  const isControlledSort = onSortChange !== undefined
  const sortKey = isControlledSort ? controlledSortKey : localSortKey
  const sortOrder = isControlledSort
    ? (controlledSortOrder ?? "asc")
    : localSortOrder

  const handleSortChange = (key: keyof T | string, order: "asc" | "desc") => {
    if (isControlledSort && onSortChange) {
      onSortChange(key, order)
    } else {
      setLocalSortKey(key)
      setLocalSortOrder(order)
    }
  }

  // Filter data by search query
  const filteredData = useMemo(() => {
    if (!showSearch || !activeSearchQuery.trim()) {
      return data
    }
    const term = activeSearchQuery.toLowerCase().trim()

    return data.filter((item) => {
      if (searchKeys && searchKeys.length > 0) {
        return searchKeys.some((key) => {
          const val = getNestedValue(item, key)
          return val != null && String(val).toLowerCase().includes(term)
        })
      }

      // Default: test all columns with accessorKey
      return columns.some((col) => {
        if (!col.accessorKey) return false
        const val = getNestedValue(item, col.accessorKey)
        return val != null && String(val).toLowerCase().includes(term)
      })
    })
  }, [data, activeSearchQuery, searchKeys, showSearch, columns])

  // Sort data
  const sortedData = useMemo(() => {
    if (isControlledSort || !sortKey) {
      return filteredData
    }

    return [...filteredData].sort((a, b) => {
      const aVal = getNestedValue(a, sortKey)
      const bVal = getNestedValue(b, sortKey)

      if (aVal === undefined || aVal === null)
        return sortOrder === "asc" ? 1 : -1
      if (bVal === undefined || bVal === null)
        return sortOrder === "asc" ? -1 : 1

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal
      }

      if (aVal instanceof Date && bVal instanceof Date) {
        return sortOrder === "asc"
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime()
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1
      return 0
    })
  }, [filteredData, sortKey, sortOrder, isControlledSort])

  // Paginate data for client-side pagination
  const displayData = useMemo(() => {
    if (clientSidePagination && pagination) {
      const start = (pagination.page - 1) * pagination.pageSize
      return sortedData.slice(start, start + pagination.pageSize)
    }
    return sortedData
  }, [sortedData, clientSidePagination, pagination])

  // Selection handlers
  const handleSelectionChange = (newSelected: string[]) => {
    if (onSelectionChange) {
      onSelectionChange(newSelected)
    }
    setInternalSelected(newSelected)
  }

  const allDisplayIds = useMemo(
    () => displayData.map((d) => getRowId(d, idAccessor)),
    [displayData, idAccessor]
  )

  const isAllSelected =
    allDisplayIds.length > 0 &&
    allDisplayIds.every((id) => selected.includes(id))

  const isIndeterminate = selected.length > 0 && !isAllSelected

  const toggleAll = (checked: boolean) => {
    if (checked) {
      const combined = Array.from(new Set([...selected, ...allDisplayIds]))
      handleSelectionChange(combined)
    } else {
      handleSelectionChange(
        selected.filter((id) => !allDisplayIds.includes(id))
      )
    }
  }

  const toggleRow = (id: string, checked: boolean) => {
    if (checked) {
      handleSelectionChange([...selected, id])
    } else {
      handleSelectionChange(selected.filter((x) => x !== id))
    }
  }

  // Expandable row handlers
  const allExpandableIds = allDisplayIds
  const allExpanded =
    allExpandableIds.length > 0 &&
    allExpandableIds.every((id) => expandedRows.has(id))

  const toggleAllExpand = () => {
    if (allExpanded) {
      setExpandedRows(new Set())
    } else {
      setExpandedRows(new Set(allExpandableIds))
    }
  }

  const toggleRowExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Sortable columns list for the sort dropdown
  const sortableColumns = useMemo(
    () => columns.filter((col) => Boolean(col.sort)),
    [columns]
  )

  // Size styling classes
  const cellPaddingClass =
    size === "sm"
      ? "px-2 py-1.5 text-xs"
      : size === "lg"
        ? "px-4 py-3.5 text-sm"
        : "px-3 py-2.5 text-xs sm:text-sm"

  const headerHeightClass =
    size === "sm" ? "h-8" : size === "lg" ? "h-12" : "h-10"

  const isBorderless = variant === "borderless"

  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      {/* Top Toolbar (Search, Filter, Actions) */}
      {(showSearch || sortableColumns.length > 0 || toolbarActions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {showSearch && (
              <ApplicationInput
                type="text"
                size={size === "sm" ? "sm" : "default"}
                placeholder={searchPlaceholder ?? "Search..."}
                value={searchQueryInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                iconLeft={<Search className="size-4 text-muted-foreground" />}
                iconRight={
                  searchQueryInput ? (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="flex size-4 cursor-pointer items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted-foreground/20 hover:text-foreground"
                      aria-label={"Clear search"}
                    >
                      <X className="size-3" />
                    </button>
                  ) : undefined
                }
                containerClassName="w-full max-w-sm sm:w-80"
              />
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {sortableColumns.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={applicationButtonVariants({
                    variant: "secondary",
                    size: size === "sm" ? "icon-sm" : "icon",
                  })}
                  title={"Sort Options"}
                  aria-label={"Sort options"}
                >
                  <ListFilter className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={4}
                  className="z-50 w-52 rounded-lg border border-border bg-popover p-1 shadow-md"
                >
                  <DropdownMenuLabel className="px-2 py-1.5 text-2xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {"Sort by"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border/60" />
                  {sortableColumns.map((col) => {
                    const colKey = (
                      typeof col.sort === "string" ? col.sort : col.accessorKey
                    ) as keyof T | string

                    if (!colKey) return null

                    const isAscActive =
                      sortKey === colKey && sortOrder === "asc"
                    const isDescActive =
                      sortKey === colKey && sortOrder === "desc"

                    return (
                      <React.Fragment key={String(colKey)}>
                        <DropdownMenuItem
                          onClick={() => handleSortChange(colKey, "asc")}
                          className={cn(
                            "flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs",
                            isAscActive &&
                              "bg-brand-soft/70 font-semibold text-foreground"
                          )}
                        >
                          <span className="truncate">
                            {col.header} ({"Ascending"})
                          </span>
                          {isAscActive && (
                            <ArrowUp className="ml-1.5 size-3.5 shrink-0 text-link" />
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleSortChange(colKey, "desc")}
                          className={cn(
                            "flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs",
                            isDescActive &&
                              "bg-brand-soft/70 font-semibold text-foreground"
                          )}
                        >
                          <span className="truncate">
                            {col.header} ({"Descending"})
                          </span>
                          {isDescActive && (
                            <ArrowDown className="ml-1.5 size-3.5 shrink-0 text-link" />
                          )}
                        </DropdownMenuItem>
                      </React.Fragment>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {toolbarActions}
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div
        className={cn(
          "flex w-full flex-col overflow-hidden transition-all duration-200",
          !isBorderless && "rounded-xl border border-border bg-card shadow-xs"
        )}
      >
        <div className="scrollbar-thin w-full overflow-x-auto">
          <Table
            className={cn(
              "w-full caption-bottom text-xs select-text",
              tableClassName
            )}
          >
            <TableHeader
              className={cn(
                "border-b border-border bg-muted/50 text-muted-foreground",
                stickyHeader &&
                  "sticky top-0 z-10 bg-muted/80 shadow-2xs backdrop-blur-sm"
              )}
            >
              <TableRow className="border-b border-border hover:bg-transparent">
                {renderExpandableRow && (
                  <TableHead className={cn("w-10 px-3", headerHeightClass)}>
                    <button
                      type="button"
                      onClick={toggleAllExpand}
                      className="flex cursor-pointer items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title={allExpanded ? "Collapse All" : "Expand All"}
                      aria-label={allExpanded ? "Collapse All" : "Expand All"}
                    >
                      <ChevronRight
                        className={cn(
                          "size-3.5 transition-transform duration-200",
                          allExpanded && "rotate-90 text-link"
                        )}
                      />
                    </button>
                  </TableHead>
                )}

                {showSelection && (
                  <TableHead className={cn("w-10 px-3", headerHeightClass)}>
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isIndeterminate}
                      onCheckedChange={(c) => toggleAll(Boolean(c))}
                      aria-label={"Select all rows"}
                    />
                  </TableHead>
                )}

                {showSerialNo && (
                  <TableHead
                    className={cn(
                      "w-12 px-3 text-left text-2xs font-semibold tracking-wider text-muted-foreground uppercase",
                      headerHeightClass
                    )}
                  >
                    {serialNoLabel}
                  </TableHead>
                )}

                {columns.map((col, i) => {
                  const isSortable = Boolean(col.sort)
                  const colKey = (
                    typeof col.sort === "string" ? col.sort : col.accessorKey
                  ) as keyof T | string

                  const isSorted = sortKey && colKey && sortKey === colKey

                  const alignClass =
                    col.align === "center"
                      ? "text-center justify-center"
                      : col.align === "right"
                        ? "text-right justify-end"
                        : "text-left justify-start"

                  return (
                    <TableHead
                      key={i}
                      onClick={() => {
                        if (!isSortable || !colKey) return
                        if (sortKey === colKey) {
                          handleSortChange(
                            colKey,
                            sortOrder === "asc" ? "desc" : "asc"
                          )
                        } else {
                          handleSortChange(colKey, "asc")
                        }
                      }}
                      className={cn(
                        "px-3 text-2xs font-semibold tracking-wider whitespace-nowrap text-muted-foreground uppercase",
                        headerHeightClass,
                        isSortable &&
                          "group cursor-pointer transition-colors select-none hover:bg-muted/70 hover:text-foreground",
                        col.headerClassName
                      )}
                    >
                      <div
                        className={cn("flex items-center gap-1.5", alignClass)}
                      >
                        <span>{col.header}</span>
                        {isSortable && (
                          <span className="shrink-0 transition-opacity">
                            {isSorted ? (
                              sortOrder === "asc" ? (
                                <ArrowUp className="size-3 text-link" />
                              ) : (
                                <ArrowDown className="size-3 text-link" />
                              )
                            ) : (
                              <ArrowUpDown className="size-3 opacity-30 transition-opacity group-hover:opacity-80" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  )
                })}

                {onRowClick && (
                  <TableHead className={cn("w-10 px-3", headerHeightClass)} />
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <ApplicationTableSkeleton
                  columns={columns}
                  rowCount={loadingRowCount || pagination?.pageSize || 5}
                  showSelection={showSelection}
                  showSerialNo={showSerialNo}
                  hasAction={Boolean(onRowClick)}
                  showExpand={Boolean(renderExpandableRow)}
                  size={size}
                />
              ) : displayData.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={
                      columns.length +
                      (showSelection ? 1 : 0) +
                      (showSerialNo ? 1 : 0) +
                      (onRowClick ? 1 : 0) +
                      (renderExpandableRow ? 1 : 0)
                    }
                    className="border-0 p-0"
                  >
                    {emptyState || (
                      <Empty className="py-12">
                        <EmptyMedia variant="icon" size="default">
                          <Inbox className="size-6 text-muted-foreground" />
                        </EmptyMedia>
                        <EmptyHeader>
                          <EmptyTitle size="sm">
                            {emptyTitle ?? "No records found"}
                          </EmptyTitle>
                          <EmptyDescription>
                            {emptyDescription ??
                              "Nothing matches the current filters."}
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                displayData.map((item, index) => {
                  const id = getRowId(item, idAccessor)
                  const isSelected = selected.includes(id)
                  const isExpanded = expandedRows.has(id)

                  return (
                    <React.Fragment key={id || `row-${index}`}>
                      <TableRow
                        data-selected={isSelected}
                        className={cn(
                          "group border-b border-border/60 transition-colors",
                          onRowClick && "cursor-pointer hover:bg-muted/40",
                          isSelected &&
                            "bg-primary/5 hover:bg-primary/10 data-[selected=true]:bg-primary/5",
                          isExpanded && "bg-muted/20"
                        )}
                        onClick={() => onRowClick?.(item)}
                      >
                        {renderExpandableRow && (
                          <TableCell
                            className={cn("w-10 px-3", cellPaddingClass)}
                          >
                            <button
                              type="button"
                              onClick={(e) => toggleRowExpand(id, e)}
                              className="flex cursor-pointer items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              aria-label={
                                isExpanded ? "Collapse subrow" : "Expand subrow"
                              }
                            >
                              <ChevronRight
                                className={cn(
                                  "size-3.5 transition-transform duration-200",
                                  isExpanded && "rotate-90 text-link"
                                )}
                              />
                            </button>
                          </TableCell>
                        )}

                        {showSelection && (
                          <TableCell
                            className={cn("w-10 px-3", cellPaddingClass)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onClick={(e) => e.stopPropagation()}
                              onCheckedChange={(c) => toggleRow(id, Boolean(c))}
                              aria-label={`Select row ${id || index + 1}`}
                            />
                          </TableCell>
                        )}

                        {showSerialNo && (
                          <TableCell
                            className={cn(
                              "w-12 px-3 font-medium text-muted-foreground",
                              cellPaddingClass
                            )}
                          >
                            {pagination
                              ? (pagination.page - 1) * pagination.pageSize +
                                index +
                                1
                              : index + 1}
                          </TableCell>
                        )}

                        {columns.map((col, j) => {
                          const alignClass =
                            col.align === "center"
                              ? "text-center"
                              : col.align === "right"
                                ? "text-right"
                                : "text-left"

                          const cellContent = col.cell
                            ? col.cell(item, index)
                            : col.accessorKey
                              ? String(
                                  getNestedValue(item, col.accessorKey) ?? ""
                                )
                              : null

                          return (
                            <TableCell
                              key={j}
                              className={cn(
                                "font-medium text-foreground",
                                cellPaddingClass,
                                alignClass,
                                col.className
                              )}
                            >
                              {cellContent}
                            </TableCell>
                          )
                        })}

                        {onRowClick && (
                          <TableCell
                            className={cn(
                              "w-10 px-3 text-right",
                              cellPaddingClass
                            )}
                          >
                            <ChevronRight className="inline-block size-4 text-muted-foreground/30 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                          </TableCell>
                        )}
                      </TableRow>

                      <AnimatePresence>
                        {isExpanded && renderExpandableRow && (
                          <TableRow className="border-b border-border/60 hover:bg-transparent">
                            <TableCell
                              colSpan={
                                columns.length +
                                (showSelection ? 1 : 0) +
                                (showSerialNo ? 1 : 0) +
                                (onRowClick ? 1 : 0) +
                                1
                              }
                              className="bg-muted/10 p-0"
                            >
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{
                                  duration: 0.22,
                                  ease: "easeInOut",
                                }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-border/40 p-4">
                                  {renderExpandableRow(item)}
                                </div>
                              </motion.div>
                            </TableCell>
                          </TableRow>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Bottom Pagination Bar */}
        {pagination && (
          <div className="sticky bottom-0 z-10 border-t border-border bg-card/95 backdrop-blur-xs">
            <ApplicationTablePagination
              total={
                clientSidePagination ? filteredData.length : pagination.total
              }
              page={pagination.page}
              pageSize={pagination.pageSize}
              onPageChange={pagination.onPageChange}
              onPageSizeChange={pagination.onPageSizeChange}
              pageSizeOptions={pagination.pageSizeOptions}
              showGoToPage={pagination.showGoToPage}
              goToPagePlaceholder={pagination.goToPagePlaceholder}
              showPageSize={pagination.showPageSize}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default ApplicationTable
