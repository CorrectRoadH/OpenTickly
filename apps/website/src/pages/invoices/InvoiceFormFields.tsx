import { type ReactElement } from "react";

type InvoiceHeaderFieldsProps = {
  currency: string;
  date: string;
  documentId: string;
  dueDate: string;
  onCurrencyChange: (v: string) => void;
  onDateChange: (v: string) => void;
  onDocumentIdChange: (v: string) => void;
  onDueDateChange: (v: string) => void;
  onPaymentTermsChange: (v: string) => void;
  onPurchaseOrderChange: (v: string) => void;
  paymentTerms: string;
  purchaseOrder: string;
};

const INLINE_INPUT_CLASS =
  "h-8 w-full rounded border border-transparent bg-transparent px-2 text-[14px] text-white hover:border-[var(--track-control-border)] focus:border-[var(--track-control-border-strong)] focus:outline-none";

const INLINE_INPUT_PLACEHOLDER_CLASS =
  "h-8 w-full rounded border border-transparent bg-transparent px-2 text-[14px] text-white placeholder:text-[var(--track-text-disabled)] hover:border-[var(--track-control-border)] focus:border-[var(--track-control-border-strong)] focus:outline-none";

export function InvoiceHeaderFields({
  currency,
  date,
  documentId,
  dueDate,
  onCurrencyChange,
  onDateChange,
  onDocumentIdChange,
  onDueDateChange,
  onPaymentTermsChange,
  onPurchaseOrderChange,
  paymentTerms,
  purchaseOrder,
}: InvoiceHeaderFieldsProps): ReactElement {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
      <InlineField label="Invoice ID" testId="invoice-document-id">
        <input
          className={INLINE_INPUT_CLASS}
          data-testid="invoice-document-id-input"
          onChange={(e) => onDocumentIdChange(e.target.value)}
          type="text"
          value={documentId}
        />
      </InlineField>
      <InlineField label="Invoice Date" testId="invoice-date">
        <input
          className={INLINE_INPUT_CLASS}
          onChange={(e) => onDateChange(e.target.value)}
          style={{ colorScheme: "dark" }}
          type="date"
          value={date}
        />
      </InlineField>
      <InlineField label="Due date" testId="invoice-due-date">
        <input
          className={INLINE_INPUT_CLASS}
          onChange={(e) => onDueDateChange(e.target.value)}
          style={{ colorScheme: "dark" }}
          type="date"
          value={dueDate}
        />
      </InlineField>
      <InlineField label="Purchase order" testId="invoice-purchase-order">
        <input
          className={INLINE_INPUT_PLACEHOLDER_CLASS}
          onChange={(e) => onPurchaseOrderChange(e.target.value)}
          placeholder="-"
          type="text"
          value={purchaseOrder}
        />
      </InlineField>
      <InlineField label="Payment terms" testId="invoice-payment-terms">
        <input
          className={INLINE_INPUT_PLACEHOLDER_CLASS}
          onChange={(e) => onPaymentTermsChange(e.target.value)}
          placeholder="-"
          type="text"
          value={paymentTerms}
        />
      </InlineField>
      <InlineField label="Currency" testId="invoice-currency">
        <input
          className={INLINE_INPUT_CLASS}
          onChange={(e) => onCurrencyChange(e.target.value)}
          type="text"
          value={currency}
        />
      </InlineField>
    </div>
  );
}

function InlineField({
  children,
  label,
  testId,
}: {
  children: React.ReactNode;
  label: string;
  testId?: string;
}) {
  return (
    <div className="flex items-center gap-3" data-testid={testId}>
      <span className="w-[120px] shrink-0 text-[12px] font-semibold text-[var(--track-text-soft)]">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function InvoiceAddressField({
  label,
  onChange,
  placeholder,
  testId,
  value,
}: {
  label: string;
  onChange: (v: string) => void;
  placeholder: string;
  testId: string;
  value: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--track-text-soft)]">
        {label}
      </label>
      <textarea
        className="min-h-[72px] w-full resize-y rounded border border-transparent bg-[var(--track-input-bg)] px-3 py-2 text-[14px] text-white placeholder:text-[var(--track-text-disabled)] hover:border-[var(--track-control-border)] focus:border-[var(--track-control-border-strong)] focus:outline-none"
        data-testid={testId}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );
}
