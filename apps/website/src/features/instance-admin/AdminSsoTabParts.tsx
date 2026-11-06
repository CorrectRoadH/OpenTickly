import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import type { OidcDiscoveryResult } from "../../shared/api/admin-client.ts";

export function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (next: boolean) => void;
}): ReactElement {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? "bg-[var(--track-accent)]" : "bg-[var(--track-border)]"
      }`}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

export function DiscoveryResult({ result }: { result: OidcDiscoveryResult }): ReactElement {
  const { t } = useTranslation();
  return (
    <div
      className={`mt-4 rounded-[8px] border p-3 text-[12px] ${
        result.ok
          ? "border-[var(--track-accent)] text-[var(--track-text)]"
          : "border-[var(--track-state-danger-text,var(--track-border))] text-[var(--track-state-danger-text,var(--track-text))]"
      }`}
      role="status"
    >
      <p className="font-medium">
        {result.ok ? t("instanceAdmin:oidcDiscoveryOk") : t("instanceAdmin:ssoDiscoveryFailed")}
      </p>
      <p className="break-all">{result.message}</p>
      {result.ok ? (
        <ul className="mt-2 space-y-1 break-all text-[var(--track-text-muted)]">
          <li>issuer: {result.issuer}</li>
          <li>authorization_endpoint: {result.authorization_endpoint}</li>
          <li>token_endpoint: {result.token_endpoint}</li>
          <li>jwks_uri: {result.jwks_uri}</li>
        </ul>
      ) : null}
    </div>
  );
}
