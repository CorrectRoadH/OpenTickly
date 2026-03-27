import { type ReactElement } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  DirectoryHeaderCell,
  DirectorySurfaceMessage,
  DirectoryTableCell,
} from "@opentoggl/web-ui";

import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
import type { ModelsUserInvoice } from "../../shared/api/generated/public-track/types.gen.ts";
import { getWorkspaceInvoices } from "../../shared/api/public/track/index.ts";
import { unwrapWebApiResult } from "../../shared/api/web-client.ts";
import { useSession } from "../../shared/session/session-context.tsx";

function useInvoicesQuery(workspaceId: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        getWorkspaceInvoices({
          path: { workspace_id: workspaceId },
        }),
      ),
    queryKey: ["workspaces", workspaceId, "invoices"],
  });
}

function formatInvoiceDate(dateString: string | undefined): string {
  if (!dateString) {
    return "-";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function formatInvoiceTotal(invoice: ModelsUserInvoice): string {
  const items = invoice.items ?? [];
  const total = items.reduce((sum, item) => sum + (item.amount ?? 0) * (item.quantity ?? 1), 0);
  const currency = invoice.currency ?? "USD";
  return `${total.toFixed(2)} ${currency}`;
}

export function InvoicesPage(): ReactElement {
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const invoicesQuery = useInvoicesQuery(workspaceId);

  function handleCreateInvoice() {
    globalThis.alert("Create invoice from reports is coming soon.");
  }

  if (invoicesQuery.isPending) {
    return <DirectorySurfaceMessage message="Loading invoices..." />;
  }

  if (invoicesQuery.isError) {
    return (
      <DirectorySurfaceMessage
        message="Unable to load invoices. Refresh to try again."
        tone="error"
      />
    );
  }

  const invoices: ModelsUserInvoice[] = invoicesQuery.data ?? [];

  return (
    <div
      className="w-full min-w-0 bg-[var(--track-surface)] text-white"
      data-testid="invoices-page"
    >
      <header className="border-b border-[var(--track-border)]">
        <div className="flex min-h-[66px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <h1 className="text-[21px] font-semibold leading-[30px] text-white">Invoices</h1>
          <div className="flex items-center gap-2">
            <button
              className="flex h-9 items-center gap-1 rounded-[8px] border border-[var(--track-border)] px-4 text-[12px] font-semibold text-white"
              data-testid="invoices-connect-quickbooks"
              type="button"
            >
              Connect QuickBooks
            </button>
            <button
              className="flex h-9 items-center gap-1 rounded-[8px] bg-[var(--track-button)] px-4 text-[12px] font-semibold text-black"
              data-testid="invoices-create-button"
              onClick={handleCreateInvoice}
              type="button"
            >
              <TrackingIcon className="size-3.5" name="plus" />
              Create invoice from reports
            </button>
          </div>
        </div>
      </header>

      {invoices.length > 0 ? (
        <div data-testid="invoices-list">
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_42px] border-b border-[var(--track-border)] px-5 text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
            <DirectoryHeaderCell>ID</DirectoryHeaderCell>
            <DirectoryHeaderCell>Invoice Date</DirectoryHeaderCell>
            <DirectoryHeaderCell>Due Date</DirectoryHeaderCell>
            <DirectoryHeaderCell>Billed To</DirectoryHeaderCell>
            <DirectoryHeaderCell>Total</DirectoryHeaderCell>
            <div className="flex h-[34px] items-center justify-end" />
          </div>
          {invoices.map((invoice) => (
            <div
              className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_42px] items-center border-b border-[var(--track-border)] px-5"
              key={invoice.user_invoice_id ?? invoice.document_id}
            >
              <DirectoryTableCell>
                <span className="truncate">{invoice.document_id ?? "-"}</span>
              </DirectoryTableCell>
              <DirectoryTableCell>
                <span className="text-[var(--track-text-muted)]">
                  {formatInvoiceDate(invoice.date)}
                </span>
              </DirectoryTableCell>
              <DirectoryTableCell>
                <span className="text-[var(--track-text-muted)]">
                  {formatInvoiceDate(invoice.due_date)}
                </span>
              </DirectoryTableCell>
              <DirectoryTableCell>
                <span className="truncate text-[var(--track-text-muted)]">
                  {invoice.billing_address ?? "-"}
                </span>
              </DirectoryTableCell>
              <DirectoryTableCell>
                <span>{formatInvoiceTotal(invoice)}</span>
              </DirectoryTableCell>
              <div className="flex h-[54px] items-center justify-end">
                <button
                  aria-label={`Actions for invoice ${invoice.document_id ?? ""}`}
                  className="flex size-6 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
                  onClick={() => globalThis.alert("Invoice actions are not yet available.")}
                  type="button"
                >
                  <TrackingIcon className="size-3.5" name="more" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 py-10" data-testid="invoices-empty-state">
          <p className="text-sm text-[var(--track-text-muted)]">
            No invoices yet. Create your first invoice from reports.
          </p>
        </div>
      )}

      <div
        className="border-t border-[var(--track-border)] px-5 py-3 text-[11px] text-[var(--track-text-muted)]"
        data-testid="invoices-summary"
      >
        {invoices.length} {invoices.length === 1 ? "invoice" : "invoices"} in workspace.
      </div>
    </div>
  );
}
