import {
  AppButton,
  AppCheckbox,
  AppInput,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@opentickly/web-ui";
import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";

import type { ModelsWebhookSubscription } from "../../shared/api/public/webhooks/index.ts";

type EventFiltersMap = Record<string, string[]>;

type WebhookFormDialogProps = {
  availableFilters?: EventFiltersMap;
  editing: ModelsWebhookSubscription | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (data: ModelsWebhookSubscription) => void;
};

export function WebhookFormDialog({
  availableFilters,
  editing,
  loading,
  onClose,
  onSubmit,
}: WebhookFormDialogProps): ReactElement {
  const { t } = useTranslation("integrations");
  const isEditing = editing != null;

  const [description, setDescription] = useState(editing?.description ?? "");
  const [urlCallback, setUrlCallback] = useState(editing?.url_callback ?? "");
  const [enabled, setEnabled] = useState(editing?.enabled ?? false);

  const existingFilterKeys = new Set(
    (editing?.event_filters ?? []).map((f) => `${f.entity ?? ""}:${f.action ?? ""}`),
  );
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(existingFilterKeys);

  function toggleFilter(entity: string, action: string) {
    const key = `${entity}:${action}`;
    setSelectedFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleSubmit() {
    const eventFilters = Array.from(selectedFilters).map((key) => {
      const [entity, action] = key.split(":");
      return { entity, action };
    });

    onSubmit({
      description,
      url_callback: urlCallback,
      enabled,
      event_filters: eventFilters,
    });
  }

  const canSubmit =
    description.trim() !== "" && urlCallback.trim() !== "" && selectedFilters.size > 0;

  return (
    <Dialog onClose={onClose} width="max-w-[520px]">
      <DialogHeader onClose={onClose} title={isEditing ? t("editWebhook") : t("createWebhook")} />
      <DialogBody>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-[var(--track-text-muted)]">
              {t("fieldName")}
            </span>
            <AppInput
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("fieldNamePlaceholder")}
              value={description}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-[var(--track-text-muted)]">
              {t("fieldUrl")}
            </span>
            <AppInput
              onChange={(e) => setUrlCallback(e.target.value)}
              placeholder="https://example.com/webhook"
              value={urlCallback}
            />
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-[var(--track-text-muted)]">
              {t("fieldEvents")}
            </span>
            <div className="max-h-[240px] overflow-y-auto rounded-[6px] border border-[var(--track-border)] p-3">
              {availableFilters ? (
                Object.entries(availableFilters).map(([entity, actions]) => (
                  <div className="mb-3 last:mb-0" key={entity}>
                    <p className="mb-1 text-[12px] font-semibold capitalize text-white">
                      {entity.replace("_", " ")}
                    </p>
                    <div className="flex flex-col gap-0.5 pl-2">
                      {(actions as string[]).map((action) => (
                        <label
                          className="flex items-center gap-2 py-0.5 text-[13px] text-[var(--track-text-secondary)]"
                          key={action}
                        >
                          <AppCheckbox
                            aria-label={`${entity} ${action}`}
                            checked={selectedFilters.has(`${entity}:${action}`)}
                            onChange={() => {
                              toggleFilter(entity, action);
                            }}
                          />
                          {action}
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-[var(--track-text-muted)]">{t("loadingFilters")}</p>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2">
            <AppCheckbox
              aria-label={t("fieldEnabled")}
              checked={enabled}
              onChange={() => setEnabled(!enabled)}
            />
            <span className="text-[13px] text-white">{t("fieldEnabled")}</span>
          </label>

          {isEditing && editing?.secret && (
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-[var(--track-text-muted)]">
                {t("fieldSecret")}
              </span>
              <code className="rounded bg-[var(--track-surface-muted)] px-2 py-1 text-[12px] text-[var(--track-text-secondary)]">
                {editing.secret}
              </code>
            </div>
          )}
        </div>
      </DialogBody>
      <DialogFooter>
        <AppButton onClick={onClose} size="sm" variant="ghost">
          {t("cancel")}
        </AppButton>
        <AppButton disabled={!canSubmit || loading} onClick={handleSubmit} size="sm">
          {isEditing ? t("save") : t("create")}
        </AppButton>
      </DialogFooter>
    </Dialog>
  );
}
