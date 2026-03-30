import { type ReactElement } from "react";

import { DropdownMenu, MenuItem } from "@opentoggl/web-ui";

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
  return (
    <DropdownMenu
      trigger={
        <button
          aria-label={`Actions for invoice ${invoice.document_id ?? ""}`}
          className="flex size-8 items-center justify-center rounded-md text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
          type="button"
        >
          <MoreIcon className="size-4" />
        </button>
      }
    >
      <MenuItem onClick={onEdit}>Edit</MenuItem>
      <MenuItem destructive onClick={onDelete}>
        Delete
      </MenuItem>
    </DropdownMenu>
  );
}
