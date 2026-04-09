import { AppSurfaceState, SurfaceCard } from "@opentoggl/web-ui";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import i18n from "../../app/i18n.ts";
import {
  useRegistrationPolicyQuery,
  useUpdateRegistrationPolicyMutation,
} from "../../shared/query/instance-admin.ts";
import { WebApiError } from "../../shared/api/web-client.ts";

const modes = [
  {
    value: "open" as const,
    labelKey: "instanceAdmin:open",
    descriptionKey: "instanceAdmin:openDescription",
  },
  {
    value: "closed" as const,
    labelKey: "instanceAdmin:closed",
    descriptionKey: "instanceAdmin:closedDescription",
  },
  {
    value: "invite_only" as const,
    labelKey: "instanceAdmin:inviteOnly",
    descriptionKey: "instanceAdmin:inviteOnlyDescription",
  },
];

export function AdminRegistrationTab(): ReactElement {
  const { t } = useTranslation();
  const policyQuery = useRegistrationPolicyQuery();
  const updateMutation = useUpdateRegistrationPolicyMutation();

  if (policyQuery.isPending) {
    return (
      <SurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent text-[var(--track-text-muted)]"
          description={t("instanceAdmin:loadingRegistrationPolicy")}
          title={t("instanceAdmin:registration")}
          tone="loading"
        />
      </SurfaceCard>
    );
  }

  if (policyQuery.isError || !policyQuery.data) {
    return (
      <SurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent text-[var(--track-text-muted)]"
          description={t("instanceAdmin:couldNotLoadRegistrationPolicy")}
          title={t("instanceAdmin:registrationUnavailable")}
          tone="error"
        />
      </SurfaceCard>
    );
  }

  const currentMode = policyQuery.data.mode;

  return (
    <div className="flex flex-col gap-4">
      <SurfaceCard>
        <div className="p-5">
          <h3 className="mb-1 text-[14px] font-semibold text-[var(--track-text)]">
            {t("instanceAdmin:registrationPolicy")}
          </h3>
          <p className="mb-5 text-[14px] text-[var(--track-text-muted)]">
            {t("instanceAdmin:registrationPolicyDescription")}
          </p>

          <div className="flex flex-col gap-3">
            {modes.map((mode) => (
              <button
                className={`flex items-start gap-3 rounded-[10px] border p-4 text-left transition ${
                  currentMode === mode.value
                    ? "border-[var(--track-accent)] bg-[var(--track-accent)]/5"
                    : "border-[var(--track-border)] hover:border-[var(--track-text-muted)]"
                }`}
                disabled={updateMutation.isPending}
                key={mode.value}
                onClick={() => {
                  if (mode.value === currentMode) return;
                  updateMutation.mutate(mode.value, {
                    onSuccess: () =>
                      toast.success(
                        t("instanceAdmin:registrationPolicySet", { mode: t(mode.labelKey) }),
                      ),
                    onError: (err) =>
                      toast.error(
                        err instanceof WebApiError
                          ? err.userMessage
                          : t("toast:failedToUpdateRegistrationPolicy"),
                      ),
                  });
                }}
                type="button"
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    currentMode === mode.value
                      ? "border-[var(--track-accent)]"
                      : "border-[var(--track-text-muted)]"
                  }`}
                >
                  {currentMode === mode.value ? (
                    <span className="h-2 w-2 rounded-full bg-[var(--track-accent)]" />
                  ) : null}
                </span>
                <div>
                  <div className="text-[14px] font-medium text-[var(--track-text)]">
                    {t(mode.labelKey)}
                  </div>
                  <div className="text-[12px] text-[var(--track-text-muted)]">
                    {t(mode.descriptionKey)}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 text-[12px] text-[var(--track-text-muted)]">
            {t("instanceAdmin:lastUpdated", {
              date: new Date(policyQuery.data.updated_at).toLocaleString(i18n.language),
            })}
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
