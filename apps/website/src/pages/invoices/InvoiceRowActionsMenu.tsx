import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { DropdownMenu, IconButton, MenuItem } from "@opentoggl/web-ui";

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
  const { t } = useTranslation("invoices");
  return (
    <DropdownMenu
      trigger={
        <IconButton aria-label={t("actionsFor", { id: invoice.document_id ?? "" })} size="sm">
          <MoreIcon className="size-3.5" />
        </IconButton>
      }
    >
      <MenuItem onClick={onEdit}>{t("edit")}</MenuItem>
      <MenuItem destructive onClick={onDelete}>
        {t("delete")}
      </MenuItem>
    </DropdownMenu>
  );
}
