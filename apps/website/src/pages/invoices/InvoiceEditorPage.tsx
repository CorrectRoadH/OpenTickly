import { type ReactElement, useMemo, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";

import type { ModelsUserInvoice } from "../../shared/api/generated/public-track/types.gen.ts";
import { postWorkspaceUserInvoice } from "../../shared/api/public/track/index.ts";
import { unwrapWebApiResult } from "../../shared/api/web-client.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { InvoiceAddressField, InvoiceHeaderFields } from "./InvoiceFormFields.tsx";
import {
  type InvoiceItemFormData,
  type InvoiceTaxFormData,
  InvoiceLineItems,
} from "./InvoiceLineItems.tsx";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function thirtyDaysFromNow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

function generateInvoiceId(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `INV-${y}${m}${d}`;
}

/** Parse search params like `projects=CSAPP:4.6,Other:2.5` into line items. */
function parseProjectsParam(raw: string | undefined): InvoiceItemFormData[] {
  if (!raw) return [];
  return raw.split(",").map((segment) => {
    const lastColon = segment.lastIndexOf(":");
    if (lastColon === -1)
      return { amount: 0, description: segment.trim(), id: crypto.randomUUID(), quantity: 1 };
    const name = segment.slice(0, lastColon).trim();
    const hours = Number(segment.slice(lastColon + 1)) || 0;
    return { amount: 0, description: name, id: crypto.randomUUID(), quantity: hours };
  });
}

export function InvoiceEditorPage(): ReactElement {
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const search = useSearch({ strict: false }) as Record<string, string | undefined>;
  const initialItems = useMemo(() => {
    const fromProjects = parseProjectsParam(search.projects);
    return fromProjects.length > 0
      ? fromProjects
      : [{ amount: 0, description: "", id: crypto.randomUUID(), quantity: 1 }];
  }, [search.projects]);

  const [documentId, setDocumentId] = useState(() => generateInvoiceId());
  const [date, setDate] = useState(() => todayISO());
  const [dueDate, setDueDate] = useState(() => thirtyDaysFromNow());
  const [purchaseOrder, setPurchaseOrder] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [workspaceAddress, setWorkspaceAddress] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [items, setItems] = useState<InvoiceItemFormData[]>(initialItems);
  const [taxes, setTaxes] = useState<InvoiceTaxFormData[]>([]);
  const [message, setMessage] = useState("");

  const createMutation = useMutation({
    mutationFn: (body: ModelsUserInvoice) =>
      unwrapWebApiResult(postWorkspaceUserInvoice({ body, path: { workspace_id: workspaceId } })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workspaces", workspaceId, "invoices"],
      });
    },
  });

  function addItem() {
    setItems((prev) => [
      ...prev,
      { amount: 0, description: "", id: crypto.randomUUID(), quantity: 1 },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function updateItem(index: number, field: keyof InvoiceItemFormData, value: string | number) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function addTax() {
    setTaxes((prev) => [...prev, { amount: 0, id: crypto.randomUUID(), name: "" }]);
  }

  function removeTax(index: number) {
    setTaxes((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTax(index: number, field: keyof InvoiceTaxFormData, value: string | number) {
    setTaxes((prev) => prev.map((tax, i) => (i === index ? { ...tax, [field]: value } : tax)));
  }

  async function handleSave() {
    if (!documentId.trim()) return;
    const body: ModelsUserInvoice = {
      billing_address: billingAddress,
      currency,
      date,
      document_id: documentId.trim(),
      due_date: dueDate,
      items: items.map((item) => ({
        amount: item.amount,
        description: item.description,
        quantity: item.quantity,
      })),
      message,
      payment_terms: paymentTerms || undefined,
      purchase_number: purchaseOrder || undefined,
      taxes: taxes.length > 0 ? taxes.map((t) => ({ amount: t.amount, name: t.name })) : undefined,
      workspace_address: workspaceAddress || undefined,
    };
    await createMutation.mutateAsync(body);
    void navigate({ to: `/workspaces/${workspaceId}/invoices` });
  }

  const invoicesPath = `/workspaces/${workspaceId}/invoices`;

  return (
    <div
      className="flex min-h-full w-full flex-col bg-[var(--track-overlay-surface)] text-white"
      data-testid="invoice-editor-page"
    >
      <header className="flex items-center justify-between border-b border-[var(--track-overlay-border)] px-6 py-3">
        <nav className="flex items-center gap-2 text-[12px]">
          <button
            className="text-[var(--track-accent-text)] hover:text-white"
            onClick={() => void navigate({ to: invoicesPath })}
            type="button"
          >
            Invoices
          </button>
          <span className="text-[var(--track-text-disabled)]">&gt;</span>
          <span className="text-white">{documentId || "New Invoice"}</span>
        </nav>
        <div className="flex items-center gap-3">
          <button
            className="h-9 rounded-[8px] border border-[var(--track-control-border)] px-4 text-[12px] font-medium text-[var(--track-overlay-text)] hover:text-white"
            type="button"
          >
            Connect QuickBooks
          </button>
          <button
            className="h-9 rounded-[8px] bg-[var(--track-accent)] px-5 text-[12px] font-semibold text-white disabled:opacity-50"
            data-testid="invoice-save-button"
            disabled={!documentId.trim() || createMutation.isPending}
            onClick={() => void handleSave()}
            type="button"
          >
            {createMutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 justify-center overflow-y-auto px-6 py-8">
        <div
          className="w-full max-w-[720px] rounded-lg bg-[var(--track-tooltip-surface)] p-8 shadow-[0_8px_32px_var(--track-shadow-card)]"
          data-testid="invoice-document"
        >
          <h2 className="mb-6 text-[28px] font-bold text-white">Invoice</h2>

          <InvoiceHeaderFields
            currency={currency}
            date={date}
            documentId={documentId}
            dueDate={dueDate}
            onCurrencyChange={setCurrency}
            onDateChange={setDate}
            onDocumentIdChange={setDocumentId}
            onDueDateChange={setDueDate}
            onPaymentTermsChange={setPaymentTerms}
            onPurchaseOrderChange={setPurchaseOrder}
            paymentTerms={paymentTerms}
            purchaseOrder={purchaseOrder}
          />

          <div className="mt-6 grid grid-cols-2 gap-6">
            <InvoiceAddressField
              label="Billed to:"
              onChange={setBillingAddress}
              placeholder="Client name and address"
              testId="invoice-billing-address"
              value={billingAddress}
            />
            <InvoiceAddressField
              label="Pay to:"
              onChange={setWorkspaceAddress}
              placeholder="Your company name and address"
              testId="invoice-workspace-address"
              value={workspaceAddress}
            />
          </div>

          <InvoiceLineItems
            currency={currency}
            items={items}
            onAddItem={addItem}
            onAddTax={addTax}
            onRemoveItem={removeItem}
            onRemoveTax={removeTax}
            onUpdateItem={updateItem}
            onUpdateTax={updateTax}
            taxes={taxes}
          />

          <div className="mt-6">
            <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--track-text-soft)]">
              Message
            </label>
            <textarea
              className="min-h-[80px] w-full resize-y rounded border border-transparent bg-[var(--track-input-bg)] px-3 py-2 text-[14px] text-white placeholder:text-[var(--track-text-disabled)] hover:border-[var(--track-control-border)] focus:border-[var(--track-control-border-strong)] focus:outline-none"
              data-testid="invoice-message"
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Thank you for your business..."
              value={message}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
