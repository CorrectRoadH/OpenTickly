import { DropdownMenu, MenuItem } from "@opentickly/web-ui";
import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import type { ModelsWebhookSubscription } from "../../shared/api/public/webhooks/index.ts";

type WebhookActionsProps = {
  subscription: ModelsWebhookSubscription;
  onEdit: () => void;
  onToggle: () => void;
  onPing: () => void;
  onDelete: () => void;
};

export function WebhookActions({
  subscription,
  onEdit,
  onToggle,
  onPing,
  onDelete,
}: WebhookActionsProps): ReactElement {
  const { t } = useTranslation("integrations");

  return (
    <DropdownMenu
      trigger={
        <button
          aria-label={t("actions")}
          className="flex size-6 items-center justify-center rounded text-[var(--track-text-muted)] opacity-0 transition-opacity group-hover/row:opacity-100 hover:text-white"
          type="button"
        >
          <svg className="size-4" fill="currentColor" viewBox="0 0 16 16">
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        </button>
      }
    >
      <MenuItem onClick={onEdit}>{t("edit")}</MenuItem>
      <MenuItem onClick={onToggle}>{subscription.enabled ? t("disable") : t("enable")}</MenuItem>
      <MenuItem onClick={onPing}>{t("testWebhook")}</MenuItem>
      <MenuItem onClick={onDelete}>{t("delete")}</MenuItem>
    </DropdownMenu>
  );
}
