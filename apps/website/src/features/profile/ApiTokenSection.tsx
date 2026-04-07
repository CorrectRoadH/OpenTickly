import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

type ApiTokenSectionProps = {
  isRotating?: boolean;
  onRotate: () => Promise<void> | void;
  token: string;
};

export function ApiTokenSection({
  isRotating = false,
  onRotate,
  token,
}: ApiTokenSectionProps): ReactElement {
  const { t } = useTranslation("profile");

  return (
    <AppPanel data-testid="api-token-section" tone="muted">
      <div className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">{t("apiTokenSectionTitle")}</h2>
          <p className="text-sm leading-6 text-slate-400">{t("apiTokenDescription")}</p>
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
          {t("currentToken")}
          <input
            className="rounded-xl border border-[var(--track-border-input)] bg-[var(--track-input-bg)] px-4 py-3 font-mono text-sm text-white"
            readOnly
            value={token}
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <AppButton
            disabled={isRotating}
            onClick={() => {
              void onRotate();
            }}
          >
            {isRotating ? t("rotatingToken") : t("rotateToken")}
          </AppButton>
          <p className="text-sm leading-6 text-slate-400">{t("rotatingTokenDescription")}</p>
        </div>
      </div>
    </AppPanel>
  );
}
