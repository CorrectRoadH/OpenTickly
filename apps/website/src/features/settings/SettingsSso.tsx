import { SurfaceCard } from "@opentickly/web-ui";
import { ShieldCheck, ShieldOff } from "lucide-react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { useSsoInfoQuery } from "../../shared/query/web-shell.ts";

// SettingsSso shows the instance-level OIDC single sign-on status. SSO is
// configured by the administrator through OPENTOGGL_SSO_* environment
// variables and applies to every workspace, so this panel is read-only.
export function SettingsSso(): ReactElement {
  const { t } = useTranslation("settings");
  const ssoInfoQuery = useSsoInfoQuery();
  const enabled = ssoInfoQuery.data?.enabled ?? false;
  const providerName = ssoInfoQuery.data?.providerName ?? "SSO";

  return (
    <SurfaceCard>
      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--track-state-neutral-surface)]">
            {enabled ? (
              <ShieldCheck
                aria-hidden="true"
                className="size-5 text-[var(--track-accent-text)]"
                strokeWidth={1.7}
              />
            ) : (
              <ShieldOff
                aria-hidden="true"
                className="size-5 text-[var(--track-text-muted)]"
                strokeWidth={1.7}
              />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-[var(--track-text)]">
                {t("singleSignOn")}
              </h3>
              <span
                className={
                  enabled
                    ? "inline-flex rounded-full bg-[var(--track-accent)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--track-button-text)]"
                    : "inline-flex rounded-full border border-[var(--track-border)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--track-text-muted)]"
                }
              >
                {enabled ? t("ssoStatusEnabled") : t("ssoStatusDisabled")}
              </span>
            </div>
            <p className="max-w-[520px] text-[12px] leading-5 text-[var(--track-text-muted)]">
              {t("ssoInstanceDescription")}
            </p>
          </div>
        </div>

        {enabled ? (
          <div className="flex flex-col gap-3 border-t border-[var(--track-border)] pt-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--track-text-muted)]">
                {t("ssoProviderLabel")}
              </span>
              <span className="text-[13px] font-semibold text-[var(--track-text)]">
                {providerName}
              </span>
            </div>
            <p className="text-[12px] leading-5 text-[var(--track-text-muted)]">
              {t("ssoEnabledHint", { provider: providerName })}
            </p>
          </div>
        ) : (
          <p className="border-t border-[var(--track-border)] pt-4 text-[12px] leading-5 text-[var(--track-text-muted)]">
            {t("ssoDisabledHint")}
          </p>
        )}
      </div>
    </SurfaceCard>
  );
}
