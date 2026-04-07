import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { CloseIcon, PlusIcon } from "../../shared/ui/icons.tsx";

export type InvoiceItemFormData = {
  amount: number;
  description: string;
  id: string;
  quantity: number;
};

export type InvoiceTaxFormData = {
  amount: number;
  id: string;
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
  const { t } = useTranslation("invoices");
  const subtotal = computeSubtotal(items);
  const total = computeTotal(items, taxes);

  return (
    <div className="mt-6">
      <div className="grid grid-cols-[minmax(0,3fr)_100px_120px_32px] gap-2 border-b border-[var(--track-overlay-border)] pb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--track-text-soft)]">
        <span>{t("description")}</span>
        <span className="text-right">{t("quantity")}</span>
        <span className="text-right">{t("amount")}</span>
        <span />
      </div>

      {items.map((item, index) => (
        <div
          className="grid grid-cols-[minmax(0,3fr)_100px_120px_32px] items-center gap-2 border-b border-[var(--track-overlay-border-muted)] py-1.5"
          key={item.id}
        >
          <input
            className="h-9 w-full rounded border border-transparent bg-transparent px-2 text-[14px] text-white placeholder:text-[var(--track-text-disabled)] hover:border-[var(--track-control-border)] focus:border-[var(--track-control-border-strong)] focus:outline-none"
            onChange={(e) => onUpdateItem(index, "description", e.target.value)}
            placeholder={t("itemDescription")}
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
            aria-label={t("removeItem")}
            className="flex size-8 items-center justify-center rounded text-[var(--track-text-disabled)] hover:text-white"
            onClick={() => onRemoveItem(index)}
            type="button"
          >
            <CloseIcon className="size-3" />
          </button>
        </div>
      ))}

      <button
        className="mt-2 flex items-center gap-1.5 py-2 text-[12px] font-medium text-[var(--track-accent-text)] hover:text-white"
        onClick={onAddItem}
        type="button"
      >
        <PlusIcon className="size-3" />
        {t("addCustomCharge")}
      </button>

      <div className="mt-4 flex items-center justify-between border-t border-[var(--track-overlay-border)] py-3">
        <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--track-text-soft)]">
          {t("subtotal")}
        </span>
        <span className="text-[14px] text-white">
          {subtotal.toFixed(2)} {currency}
        </span>
      </div>

      {taxes.map((tax, index) => (
        <div className="flex items-center justify-between py-1" key={tax.id}>
          <div className="flex items-center gap-2">
            <input
              className="h-8 w-32 rounded border border-transparent bg-transparent px-2 text-[12px] text-white placeholder:text-[var(--track-text-disabled)] hover:border-[var(--track-control-border)] focus:border-[var(--track-control-border-strong)] focus:outline-none"
              onChange={(e) => onUpdateTax(index, "name", e.target.value)}
              placeholder={t("taxName")}
              type="text"
              value={tax.name}
            />
            <button
              aria-label={t("removeTax")}
              className="flex size-6 items-center justify-center rounded text-[var(--track-text-disabled)] hover:text-white"
              onClick={() => onRemoveTax(index)}
              type="button"
            >
              <CloseIcon className="size-2.5" />
            </button>
          </div>
          <input
            className="h-8 w-24 rounded border border-transparent bg-transparent px-2 text-right text-[12px] text-white placeholder:text-[var(--track-text-disabled)] hover:border-[var(--track-control-border)] focus:border-[var(--track-control-border-strong)] focus:outline-none"
            onChange={(e) => onUpdateTax(index, "amount", Number(e.target.value) || 0)}
            placeholder="0.00"
            step="0.01"
            type="number"
            value={tax.amount || ""}
          />
        </div>
      ))}

      <button
        className="mt-1 flex items-center gap-1.5 py-2 text-[12px] font-medium text-[var(--track-accent-text)] hover:text-white"
        onClick={onAddTax}
        type="button"
      >
        <PlusIcon className="size-3" />
        {t("addTax")}
      </button>

      <div className="mt-2 flex items-center justify-between border-t border-[var(--track-overlay-border)] py-3">
        <span className="text-[14px] font-bold uppercase tracking-[0.06em] text-white">
          {t("total")}
        </span>
        <span className="text-[14px] font-bold text-white">
          {total.toFixed(2)} {currency}
        </span>
      </div>
    </div>
  );
}
