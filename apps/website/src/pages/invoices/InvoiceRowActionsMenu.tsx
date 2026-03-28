import { type ReactElement, useEffect, useRef, useState } from "react";

import { MoreIcon } from "../../shared/ui/icons.tsx";
import type { ModelsUserInvoice } from "../../shared/api/generated/public-track/types.gen.ts";

type InvoiceRowActionsMenuProps = {
  invoice: ModelsUserInvoice;
  onDelete: () => void;
  onEdit: () => void;
};

export function InvoiceRowActionsMenu({
  invoice,
  onDelete,
  onEdit,
}: InvoiceRowActionsMenuProps): ReactElement {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-label={`Actions for invoice ${invoice.document_id ?? ""}`}
        className="flex size-8 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <MoreIcon className="size-4" />
      </button>
      {open ? (
        <div
          className="absolute right-0 top-10 z-20 min-w-[180px] rounded-[12px] border border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface-raised)] p-1.5 shadow-[0_16px_32px_var(--track-shadow-overlay)]"
          role="menu"
        >
          <MenuAction
            label="Edit"
            onSelect={() => {
              setOpen(false);
              onEdit();
            }}
          />
          <MenuAction
            destructive
            label="Delete"
            onSelect={() => {
              setOpen(false);
              onDelete();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function MenuAction({
  destructive = false,
  label,
  onSelect,
}: {
  destructive?: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      className={`flex w-full rounded-[10px] px-3 py-2.5 text-left text-[14px] transition hover:bg-white/4 ${
        destructive ? "text-[var(--track-danger-text)]" : "text-[var(--track-overlay-text)]"
      }`}
      onClick={onSelect}
      role="menuitem"
      type="button"
    >
      {label}
    </button>
  );
}
