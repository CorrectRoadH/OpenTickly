import { type ReactElement } from "react";

import { CloseIcon, PlusIcon } from "../../shared/ui/icons.tsx";

export type InvoiceItemFormData = {
  amount: number;
  description: string;
  quantity: number;
};

export type InvoiceTaxFormData = {
  amount: number;
  name: string;
};

type InvoiceLineItemsProps = {
  currency: string;
  items: InvoiceItemFormData[];
  onAddItem: () => void;
  onAddTax: () => void;
  onRemoveItem: (index: number) => void;
  onRemoveTax: (index: number) => void;
  onUpdateItem: (index: number, field: keyof InvoiceItemFormData, value: string | number) => void;
  onUpdateTax: (index: number, field: keyof InvoiceTaxFormData, value: string | number) => void;
  taxes: InvoiceTaxFormData[];
};

export function computeSubtotal(items: InvoiceItemFormData[]): number {
  return items.reduce((sum, item) => sum + item.amount * item.quantity, 0);
}

export function computeTotal(items: InvoiceItemFormData[], taxes: InvoiceTaxFormData[]): number {
  const subtotal = computeSubtotal(items);
  const taxTotal = taxes.reduce((sum, t) => sum + t.amount, 0);
  return subtotal + taxTotal;
}

export function InvoiceLineItems({
  currency,
  items,
  onAddItem,
  onAddTax,
  onRemoveItem,
  onRemoveTax,
  onUpdateItem,
  onUpdateTax,
  taxes,
}: InvoiceLineItemsProps): ReactElement {
  const subtotal = computeSubtotal(items);
  const total = computeTotal(items, taxes);

  return (
    <div className="mt-6">
      <div className="grid grid-cols-[minmax(0,3fr)_100px_120px_32px] gap-2 border-b border-[var(--track-overlay-border)] pb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--track-text-soft)]">
        <span>Description</span>
        <span className="text-right">Quantity</span>
        <span className="text-right">Amount</span>
        <span />
      </div>

      {items.map((item, index) => (
        <div
          className="grid grid-cols-[minmax(0,3fr)_100px_120px_32px] items-center gap-2 border-b border-[var(--track-overlay-border-muted)] py-1.5"
          key={index}
        >
          <input
            className="h-9 w-full rounded border border-transparent bg-transparent px-2 text-[14px] text-white placeholder:text-[var(--track-text-disabled)] hover:border-[var(--track-control-border)] focus:border-[var(--track-control-border-strong)] focus:outline-none"
            onChange={(e) => onUpdateItem(index, "description", e.target.value)}
            placeholder="Item description"
            type="text"
            value={item.description}
          />
          <input
            className="h-9 w-full rounded border border-transparent bg-transparent px-2 text-right text-[14px] text-white placeholder:text-[var(--track-text-disabled)] hover:border-[var(--track-control-border)] focus:border-[var(--track-control-border-strong)] focus:outline-none"
            min={0}
            onChange={(e) => onUpdateItem(index, "quantity", Number(e.target.value) || 0)}
            placeholder="0"
            step="0.01"
            type="number"
            value={item.quantity || ""}
          />
          <input
            className="h-9 w-full rounded border border-transparent bg-transparent px-2 text-right text-[14px] text-white placeholder:text-[var(--track-text-disabled)] hover:border-[var(--track-control-border)] focus:border-[var(--track-control-border-strong)] focus:outline-none"
            min={0}
            onChange={(e) => onUpdateItem(index, "amount", Number(e.target.value) || 0)}
            placeholder="0.00"
            step="0.01"
            type="number"
            value={item.amount || ""}
          />
          <button
            aria-label="Remove item"
            className="flex size-8 items-center justify-center rounded text-[var(--track-text-disabled)] hover:text-white"
            onClick={() => onRemoveItem(index)}
            type="button"
          >
            <CloseIcon className="size-3" />
          </button>
        </div>
      ))}

      <button
        className="mt-2 flex items-center gap-1.5 py-2 text-[13px] font-medium text-[var(--track-accent-text)] hover:text-white"
        onClick={onAddItem}
        type="button"
      >
        <PlusIcon className="size-3" />
        Add custom charge
      </button>

      <div className="mt-4 flex items-center justify-between border-t border-[var(--track-overlay-border)] py-3">
        <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--track-text-soft)]">
          Subtotal
        </span>
        <span className="text-[14px] text-white">
          {subtotal.toFixed(2)} {currency}
        </span>
      </div>

      {taxes.map((tax, index) => (
        <div className="flex items-center justify-between py-1" key={index}>
          <div className="flex items-center gap-2">
            <input
              className="h-8 w-32 rounded border border-transparent bg-transparent px-2 text-[13px] text-white placeholder:text-[var(--track-text-disabled)] hover:border-[var(--track-control-border)] focus:border-[var(--track-control-border-strong)] focus:outline-none"
              onChange={(e) => onUpdateTax(index, "name", e.target.value)}
              placeholder="Tax name"
              type="text"
              value={tax.name}
            />
            <button
              aria-label="Remove tax"
              className="flex size-6 items-center justify-center rounded text-[var(--track-text-disabled)] hover:text-white"
              onClick={() => onRemoveTax(index)}
              type="button"
            >
              <CloseIcon className="size-2.5" />
            </button>
          </div>
          <input
            className="h-8 w-24 rounded border border-transparent bg-transparent px-2 text-right text-[13px] text-white placeholder:text-[var(--track-text-disabled)] hover:border-[var(--track-control-border)] focus:border-[var(--track-control-border-strong)] focus:outline-none"
            onChange={(e) => onUpdateTax(index, "amount", Number(e.target.value) || 0)}
            placeholder="0.00"
            step="0.01"
            type="number"
            value={tax.amount || ""}
          />
        </div>
      ))}

      <button
        className="mt-1 flex items-center gap-1.5 py-2 text-[13px] font-medium text-[var(--track-accent-text)] hover:text-white"
        onClick={onAddTax}
        type="button"
      >
        <PlusIcon className="size-3" />
        Add tax
      </button>

      <div className="mt-2 flex items-center justify-between border-t border-[var(--track-overlay-border)] py-3">
        <span className="text-[14px] font-bold uppercase tracking-[0.06em] text-white">Total</span>
        <span className="text-[16px] font-bold text-white">
          {total.toFixed(2)} {currency}
        </span>
      </div>
    </div>
  );
}
