import { type ReactElement, useState } from "react";

import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
import type {
  ModelsUserInvoice,
  ModelsUserInvoiceItem,
} from "../../shared/api/generated/public-track/types.gen.ts";

type InvoiceEditorDialogProps = {
  invoice?: ModelsUserInvoice | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (data: InvoiceFormData) => void;
};

export type InvoiceFormData = {
  billing_address: string;
  currency: string;
  date: string;
  document_id: string;
  due_date: string;
  items: InvoiceItemFormData[];
  message: string;
};

type InvoiceItemFormData = {
  amount: number;
  description: string;
  quantity: number;
};

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function thirtyDaysFromNow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

function toFormItems(items?: ModelsUserInvoiceItem[]): InvoiceItemFormData[] {
  if (!items || items.length === 0) {
    return [{ amount: 0, description: "", quantity: 1 }];
  }
  return items.map((i) => ({
    amount: i.amount ?? 0,
    description: i.description ?? "",
    quantity: i.quantity ?? 1,
  }));
}

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "SEK", "NOK", "DKK"];

export function InvoiceEditorDialog({
  invoice,
  isPending,
  onClose,
  onSubmit,
}: InvoiceEditorDialogProps): ReactElement {
  const isEdit = invoice != null;

  const [documentId, setDocumentId] = useState(invoice?.document_id ?? "");
  const [billingAddress, setBillingAddress] = useState(invoice?.billing_address ?? "");
  const [currency, setCurrency] = useState(invoice?.currency ?? "USD");
  const [date, setDate] = useState(invoice?.date ?? todayISO());
  const [dueDate, setDueDate] = useState(invoice?.due_date ?? thirtyDaysFromNow());
  const [message, setMessage] = useState(invoice?.message ?? "");
  const [items, setItems] = useState<InvoiceItemFormData[]>(toFormItems(invoice?.items));

  function addItem() {
    setItems((prev) => [...prev, { amount: 0, description: "", quantity: 1 }]);
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function updateItem(index: number, field: keyof InvoiceItemFormData, value: string | number) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function handleSubmit() {
    if (!documentId.trim()) return;
    onSubmit({
      billing_address: billingAddress,
      currency,
      date,
      document_id: documentId.trim(),
      due_date: dueDate,
      items,
      message,
    });
  }

  const total = items.reduce((sum, item) => sum + item.amount * item.quantity, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="max-h-[calc(100vh-8vh)] w-[560px] overflow-y-auto rounded-[14px] bg-[#2c2c2e] shadow-[0_18px_40px_rgba(0,0,0,0.42)]"
        data-testid="invoice-editor-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <h5 className="text-[16px] font-semibold text-white">
            {isEdit ? "Edit Invoice" : "Create Invoice"}
          </h5>
          <button
            aria-label="close"
            className="flex size-7 items-center justify-center rounded text-[var(--track-text-muted)] hover:text-white"
            onClick={onClose}
            type="button"
          >
            <TrackingIcon className="size-3" name="close" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 pt-3 pb-5">
          <FormField label="Document ID">
            <input
              autoFocus
              className="h-[42px] w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[14px] text-white placeholder:text-[var(--track-text-muted)] focus:border-[var(--track-accent-soft)] focus:outline-none"
              data-testid="invoice-document-id"
              onChange={(e) => setDocumentId(e.target.value)}
              placeholder="INV-001"
              type="text"
              value={documentId}
            />
          </FormField>

          <FormField label="Billing Address">
            <textarea
              className="min-h-[72px] w-full resize-y rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 py-2 text-[14px] text-white placeholder:text-[var(--track-text-muted)] focus:border-[var(--track-accent-soft)] focus:outline-none"
              data-testid="invoice-billing-address"
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="Client name and address"
              value={billingAddress}
            />
          </FormField>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="Currency">
              <div className="relative">
                <select
                  className="h-[42px] w-full appearance-none rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 pr-8 text-[14px] text-white"
                  data-testid="invoice-currency"
                  onChange={(e) => setCurrency(e.target.value)}
                  value={currency}
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[var(--track-text-muted)]">
                  <TrackingIcon className="size-2.5" name="chevron-down" />
                </span>
              </div>
            </FormField>
            <FormField label="Invoice Date">
              <input
                className="h-[42px] w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[14px] text-white focus:border-[var(--track-accent-soft)] focus:outline-none"
                data-testid="invoice-date"
                onChange={(e) => setDate(e.target.value)}
                style={{ colorScheme: "dark" }}
                type="date"
                value={date}
              />
            </FormField>
            <FormField label="Due Date">
              <input
                className="h-[42px] w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[14px] text-white focus:border-[var(--track-accent-soft)] focus:outline-none"
                data-testid="invoice-due-date"
                onChange={(e) => setDueDate(e.target.value)}
                style={{ colorScheme: "dark" }}
                type="date"
                value={dueDate}
              />
            </FormField>
          </div>

          <InvoiceItemsSection
            items={items}
            onAddItem={addItem}
            onRemoveItem={removeItem}
            onUpdateItem={updateItem}
          />

          <div className="flex items-center justify-between border-t border-[var(--track-border)] pt-3">
            <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
              Total
            </span>
            <span className="text-[16px] font-semibold text-white">
              {total.toFixed(2)} {currency}
            </span>
          </div>

          <FormField label="Notes / Message">
            <textarea
              className="min-h-[60px] w-full resize-y rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 py-2 text-[14px] text-white placeholder:text-[var(--track-text-muted)] focus:border-[var(--track-accent-soft)] focus:outline-none"
              data-testid="invoice-message"
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Additional notes..."
              value={message}
            />
          </FormField>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 pb-5">
          <button
            className="h-9 rounded-[8px] px-4 text-[14px] font-semibold text-white hover:bg-[var(--track-row-hover)]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="h-9 rounded-[8px] bg-[var(--track-accent)] px-5 text-[14px] font-semibold text-white disabled:opacity-50"
            data-testid="invoice-submit-button"
            disabled={!documentId.trim() || isPending}
            onClick={handleSubmit}
            type="button"
          >
            {isEdit ? "Save invoice" : "Create invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}): ReactElement {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function InvoiceItemsSection({
  items,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
}: {
  items: InvoiceItemFormData[];
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, field: keyof InvoiceItemFormData, value: string | number) => void;
}): ReactElement {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
        Items
      </label>
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div className="flex items-center gap-2" key={index}>
            <input
              className="h-[38px] min-w-0 flex-1 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 text-[13px] text-white placeholder:text-[var(--track-text-muted)] focus:border-[var(--track-accent-soft)] focus:outline-none"
              onChange={(e) => onUpdateItem(index, "description", e.target.value)}
              placeholder="Description"
              type="text"
              value={item.description}
            />
            <input
              className="h-[38px] w-[72px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-2 text-center text-[13px] text-white focus:border-[var(--track-accent-soft)] focus:outline-none"
              min={0}
              onChange={(e) => onUpdateItem(index, "quantity", Number(e.target.value) || 0)}
              placeholder="Qty"
              type="number"
              value={item.quantity || ""}
            />
            <input
              className="h-[38px] w-[96px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-2 text-right text-[13px] text-white focus:border-[var(--track-accent-soft)] focus:outline-none"
              min={0}
              onChange={(e) => onUpdateItem(index, "amount", Number(e.target.value) || 0)}
              placeholder="Amount"
              step="0.01"
              type="number"
              value={item.amount || ""}
            />
            <button
              aria-label="Remove item"
              className="flex size-7 shrink-0 items-center justify-center rounded text-[var(--track-text-muted)] hover:text-white disabled:opacity-30"
              disabled={items.length <= 1}
              onClick={() => onRemoveItem(index)}
              type="button"
            >
              <TrackingIcon className="size-3" name="close" />
            </button>
          </div>
        ))}
      </div>
      <button
        className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-[var(--track-accent-text)] hover:text-white"
        onClick={onAddItem}
        type="button"
      >
        <TrackingIcon className="size-3" name="plus" />
        Add item
      </button>
    </div>
  );
}
