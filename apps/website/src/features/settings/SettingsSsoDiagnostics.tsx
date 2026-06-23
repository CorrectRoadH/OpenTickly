import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";

import type { SsoConfigCheck, SsoConfigTestResult } from "../../shared/query/web-shell.ts";

const checkLabelKeys: Record<string, string> = {
  site_url: "ssoCheckSiteUrl",
  email_domain: "ssoCheckEmailDomain",
  service_provider: "ssoCheckServiceProvider",
  identity_provider: "ssoCheckIdentityProvider",
  certificate: "ssoCheckCertificate",
};

// SsoDiagnosticsResults renders the per-check results from a config test so an
// admin can see exactly which part of the SSO setup is misconfigured.
export function SsoDiagnosticsResults({ result }: { result: SsoConfigTestResult }): ReactElement {
  const { t } = useTranslation("settings");

  return (
    <div className="flex flex-col gap-2" data-testid="sso-diagnostics-results">
      <span className="text-[12px] font-semibold text-[var(--track-text)]">
        {result.ok ? t("ssoTestPassed") : t("ssoTestFailed")}
      </span>
      {result.checks.map((check, index) => (
        <SsoCheckRow
          check={check}
          key={`${check.code}-${index}`}
          label={t(checkLabelKeys[check.code] ?? check.code)}
        />
      ))}
    </div>
  );
}

function SsoCheckRow({ check, label }: { check: SsoConfigCheck; label: string }): ReactElement {
  const Icon =
    check.status === "ok" ? CheckCircle2 : check.status === "warn" ? AlertTriangle : XCircle;
  const color =
    check.status === "ok"
      ? "text-green-400"
      : check.status === "warn"
        ? "text-yellow-400"
        : "text-red-400";

  return (
    <div className="flex items-start gap-2">
      <Icon aria-hidden="true" className={`mt-0.5 size-4 shrink-0 ${color}`} strokeWidth={1.8} />
      <div className="flex flex-col">
        <span className="text-[13px] font-medium text-[var(--track-text)]">{label}</span>
        {check.detail ? (
          <span className="text-[12px] leading-5 text-[var(--track-text-muted)]">
            {check.detail}
          </span>
        ) : null}
      </div>
    </div>
  );
}
