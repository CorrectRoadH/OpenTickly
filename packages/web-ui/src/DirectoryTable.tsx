import { createContext, useContext, type ReactNode } from "react";
import { useRenderCount } from "@uidotdev/usehooks";

import { AppCheckbox } from "./AppCheckbox.tsx";

type DirectoryTableRowMeta = {
  renderCount: number;
  rowId: number | string;
};

const DirectoryTableRowContext = createContext<DirectoryTableRowMeta | null>(null);

/**
 * Dev-only badge that surfaces the surrounding DirectoryTable row's render
 * count. Place it inline wherever it reads best — typically next to the
 * row's primary label. Renders nothing in production builds.
 */
export function DirectoryTableRenderCountBadge({ className }: { className?: string }) {
  const ctx = useContext(DirectoryTableRowContext);
  if (!import.meta.env.DEV || ctx == null) return null;
  return (
    <span
      className={
        className ??
        "pointer-events-none shrink-0 font-mono text-[10px] text-[var(--track-text-muted)]"
      }
      data-testid={`directory-table-rendercount-${ctx.rowId}`}
    >
      renders: {ctx.renderCount}
    </span>
  );
}

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
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  "data-empty-testid"?: string;
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
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
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
  "data-empty-testid": emptyTestId,
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
        emptyState != null ? (
          <div className="px-5 py-10 text-center text-[14px] text-[var(--track-text-muted)]">
            {emptyState}
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-3 px-5 py-16 text-center"
            data-testid={emptyTestId}
          >
            {emptyIcon ? (
              <div className="flex size-10 items-center justify-center rounded-[10px] border border-dashed border-[var(--track-border)] text-[var(--track-text-muted)]">
                {emptyIcon}
              </div>
            ) : null}
            {emptyTitle ? (
              <p className="text-[14px] font-semibold text-white">{emptyTitle}</p>
            ) : null}
            {emptyDescription ? (
              <p className="max-w-[360px] text-[13px] leading-5 text-[var(--track-text-muted)]">
                {emptyDescription}
              </p>
            ) : null}
            {emptyAction ? <div className="mt-1">{emptyAction}</div> : null}
            {!emptyIcon && !emptyTitle && !emptyDescription ? (
              <p className="text-[14px] text-[var(--track-text-muted)]">No items found.</p>
            ) : null}
          </div>
        )
      ) : (
        rows.map((row) => {
          const id = rowKey(row);
          const selected = !!(selectable && selectedIds?.has(id as number));
          const expanded = !!(expandable && expandedIds?.has(id));

          return (
            <DirectoryTableRow
              columns={columns}
              expandable={expandable}
              expanded={expanded}
              gridTemplate={gridTemplate}
              key={id}
              onToggleExpand={onToggleExpand}
              onToggleSelect={onToggleSelect}
              renderExpandedContent={renderExpandedContent}
              renderRow={renderRow}
              row={row}
              rowId={id}
              rowTestId={rowTestId}
              selectable={selectable}
              selected={selected}
            />
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

function DirectoryTableRow<T>({
  columns: _columns,
  expandable,
  expanded,
  gridTemplate,
  onToggleExpand,
  onToggleSelect,
  renderExpandedContent,
  renderRow,
  row,
  rowId,
  rowTestId,
  selectable,
  selected,
}: {
  columns: DirectoryTableColumn[];
  expandable?: boolean;
  expanded: boolean;
  gridTemplate: string;
  onToggleExpand?: (id: number | string) => void;
  onToggleSelect?: (id: number) => void;
  renderExpandedContent?: (row: T) => ReactNode;
  renderRow: (row: T) => ReactNode;
  row: T;
  rowId: number | string;
  rowTestId?: string;
  selectable?: boolean;
  selected: boolean;
}) {
  const renderCount = useRenderCount();
  return (
    <div data-testid={rowTestId != null ? `${rowTestId}-${rowId}` : undefined}>
      <div
        className={`group/row relative grid items-center px-5 transition-colors hover:bg-[var(--track-row-hover)] ${
          selected ? "border-l-2 border-l-[var(--track-accent)] bg-[var(--track-accent-soft)]" : ""
        }`}
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {selectable && (
          <div className="flex items-center">
            <AppCheckbox
              aria-label="Select row"
              checked={selected}
              onChange={() => onToggleSelect?.(rowId as number)}
            />
          </div>
        )}
        {expandable && (
          <button
            className="flex items-center justify-center text-[var(--track-text-muted)]"
            onClick={() => onToggleExpand?.(rowId)}
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
        <DirectoryTableRowContext.Provider value={{ renderCount, rowId }}>
          {renderRow(row)}
        </DirectoryTableRowContext.Provider>
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
}
