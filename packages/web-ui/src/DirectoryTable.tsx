import { type ReactNode } from "react";

import { AppCheckbox } from "./AppCheckbox.tsx";

export type DirectoryTableColumn = {
  key: string;
  label: string;
  width: string;
  align?: "end" | "start";
};

type DirectoryTableProps<T> = {
  columns: DirectoryTableColumn[];
  rows: T[];
  rowKey: (row: T) => number | string;
  renderRow: (row: T) => ReactNode;
  isLoading?: boolean;
  emptyState?: ReactNode;
  selectable?: boolean;
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
  onToggleSelectAll?: () => void;
  expandable?: boolean;
  expandedIds?: Set<number | string>;
  onToggleExpand?: (id: number | string) => void;
  renderExpandedContent?: (row: T) => ReactNode;
  footer?: ReactNode;
  pagination?: ReactNode;
  "data-testid"?: string;
  "data-row-testid"?: string;
};

function buildGridTemplate(
  columns: DirectoryTableColumn[],
  selectable?: boolean,
  expandable?: boolean,
): string {
  const parts: string[] = [];
  if (selectable) parts.push("42px");
  if (expandable) parts.push("28px");
  parts.push(...columns.map((c) => c.width));
  return parts.join(" ");
}

export function DirectoryTable<T>({
  columns,
  rows,
  rowKey,
  renderRow,
  isLoading,
  emptyState,
  selectable,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  expandable,
  expandedIds,
  onToggleExpand,
  renderExpandedContent,
  footer,
  pagination,
  "data-testid": testId,
  "data-row-testid": rowTestId,
}: DirectoryTableProps<T>) {
  const gridTemplate = buildGridTemplate(columns, selectable, expandable);

  const isEmpty = rows.length === 0 && !isLoading;

  return (
    <div data-testid={testId}>
      {/* Header – hidden when empty */}
      {!isEmpty && (
        <div
          className="sticky top-0 z-10 grid h-9 items-center border-b border-[var(--track-border)] bg-[var(--track-surface-muted)] px-5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--track-text-muted)]"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {selectable && (
            <div className="flex items-center">
              <AppCheckbox
                aria-label="Select all"
                checked={
                  selectedIds != null && selectedIds.size > 0 && selectedIds.size === rows.length
                }
                indeterminate={
                  selectedIds != null && selectedIds.size > 0 && selectedIds.size < rows.length
                }
                onChange={onToggleSelectAll}
              />
            </div>
          )}
          {expandable && <div />}
          {columns.map((col) => (
            <div className={col.align === "end" ? "text-end" : undefined} key={col.key}>
              {col.label}
            </div>
          ))}
        </div>
      )}

      {/* Rows */}
      {isEmpty ? (
        <div className="px-5 py-10 text-center text-[14px] text-[var(--track-text-muted)]">
          {emptyState ?? "No items found."}
        </div>
      ) : (
        rows.map((row) => {
          const id = rowKey(row);
          const selected = selectable && selectedIds?.has(id as number);
          const expanded = expandable && expandedIds?.has(id);

          return (
            <div data-testid={rowTestId != null ? `${rowTestId}-${id}` : undefined} key={id}>
              <div
                className={`group/row grid items-center px-5 transition-colors hover:bg-[var(--track-row-hover)] ${
                  selected
                    ? "border-l-2 border-l-[var(--track-accent)] bg-[var(--track-accent-soft)]"
                    : ""
                }`}
                style={{ gridTemplateColumns: gridTemplate }}
              >
                {selectable && (
                  <div className="flex items-center">
                    <AppCheckbox
                      aria-label="Select row"
                      checked={!!selected}
                      onChange={() => onToggleSelect?.(id as number)}
                    />
                  </div>
                )}
                {expandable && (
                  <button
                    className="flex items-center justify-center text-[var(--track-text-muted)]"
                    onClick={() => onToggleExpand?.(id)}
                    type="button"
                  >
                    <svg
                      className={`size-3 transition-transform duration-[120ms] ${expanded ? "rotate-90" : ""}`}
                      fill="none"
                      style={{ transitionTimingFunction: "var(--ease-spring)" }}
                      viewBox="0 0 12 12"
                    >
                      <path
                        d="M4.5 3L7.5 6L4.5 9"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </button>
                )}
                {renderRow(row)}
              </div>
              {expandable && expanded && renderExpandedContent && (
                <div
                  className="px-5"
                  style={{
                    paddingLeft: `calc(20px + ${selectable ? "42px" : "0px"} + 28px)`,
                  }}
                >
                  {renderExpandedContent(row)}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Footer */}
      {footer && (
        <div className="border-t border-[var(--track-border)] px-5 py-3 text-[11px] text-[var(--track-text-muted)]">
          {footer}
        </div>
      )}

      {/* Pagination */}
      {pagination}
    </div>
  );
}
