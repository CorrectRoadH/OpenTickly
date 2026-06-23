import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { type ReactElement, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { SsoField } from "./SettingsSsoFields.tsx";

type SsoLiveTestResult = {
  ok: boolean;
  error?: string;
  email?: string;
  name?: string;
  domainMatch: boolean;
  attributes?: { name: string; values: string[] }[];
};

// SsoLiveTest runs a real SAML round-trip against the saved identity provider in
// a popup, then shows the actual assertion the IdP returned — without logging
// anyone in. It owns its own state so typing never re-renders the settings page.
export function SsoLiveTest({
  workspaceId,
  claimedDomain,
}: {
  workspaceId: number;
  claimedDomain: string;
}): ReactElement {
  const { t } = useTranslation("settings");
  const [email, setEmail] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SsoLiveTestResult | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent): void {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { source?: string; result?: SsoLiveTestResult } | null;
      if (!data || data.source !== "opentickly-sso-test" || !data.result) return;
      setResult(data.result);
      setRunning(false);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const emailDomain = email.includes("@") ? email.split("@").pop()?.trim().toLowerCase() : "";
  const routesHere =
    emailDomain !== undefined &&
    emailDomain !== "" &&
    emailDomain === claimedDomain.trim().toLowerCase();

  function runTest(): void {
    setResult(null);
    setRunning(true);
    const popup = window.open(
      `/auth/saml2/test/login/${workspaceId}`,
      "opentickly-sso-test",
      "width=620,height=720",
    );
    if (!popup) {
      setRunning(false);
      toast.error(t("ssoLiveTestPopupBlocked"));
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--track-border)] pt-4">
      <div>
        <h4 className="text-[13px] font-semibold text-[var(--track-text)]">
          {t("ssoLiveTestTitle")}
        </h4>
        <p className="text-[12px] leading-5 text-[var(--track-text-muted)]">
          {t("ssoLiveTestDescription")}
        </p>
      </div>

      <SsoField
        label={t("ssoLiveTestEmail")}
        onChange={setEmail}
        placeholder="you@example.com"
        value={email}
      />
      {email.length > 0 ? (
        <p
          className={`text-[12px] ${routesHere ? "text-green-400" : "text-yellow-400"}`}
          data-testid="sso-live-test-routing"
        >
          {routesHere ? t("ssoLiveTestRoutes") : t("ssoLiveTestNoRoute")}
        </p>
      ) : null}

      <div>
        <button
          className="rounded-[8px] bg-[var(--track-accent)] px-4 py-2 text-[14px] font-medium text-white disabled:opacity-50"
          onClick={runTest}
          type="button"
        >
          {t("ssoLiveTestRun")}
        </button>
      </div>

      {running && !result ? (
        <p className="text-[12px] text-[var(--track-text-muted)]">{t("ssoLiveTestWaiting")}</p>
      ) : null}

      {result ? <SsoLiveTestReport email={email} result={result} /> : null}
    </div>
  );
}

function SsoLiveTestReport({
  email,
  result,
}: {
  email: string;
  result: SsoLiveTestResult;
}): ReactElement {
  const { t } = useTranslation("settings");
  const Icon = result.ok ? CheckCircle2 : XCircle;
  const expectedMismatch =
    email.trim() !== "" &&
    result.email !== undefined &&
    result.email.toLowerCase() !== email.trim().toLowerCase();

  return (
    <div
      className="flex flex-col gap-2 rounded-md border border-[var(--track-border)] p-3"
      data-testid="sso-live-test-report"
    >
      <div className="flex items-center gap-2">
        <Icon
          aria-hidden="true"
          className={`size-4 ${result.ok ? "text-green-400" : "text-red-400"}`}
          strokeWidth={1.8}
        />
        <span className="text-[13px] font-semibold text-[var(--track-text)]">
          {result.ok ? t("ssoLiveTestSucceeded") : t("ssoLiveTestFailed")}
        </span>
      </div>
      {result.error ? (
        <p className="text-[12px] leading-5 text-[var(--track-text-muted)]">{result.error}</p>
      ) : null}

      <ReportRow label={t("ssoLiveTestReturnedEmail")} value={result.email ?? "—"} />
      <ReportRow label={t("ssoLiveTestReturnedName")} value={result.name ?? "—"} />
      <ReportRow
        label={t("ssoLiveTestDomainMatch")}
        value={result.domainMatch ? t("ssoLiveTestYes") : t("ssoLiveTestNo")}
      />
      {expectedMismatch ? (
        <p className="flex items-center gap-1.5 text-[12px] text-yellow-400">
          <AlertTriangle aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
          {t("ssoLiveTestEmailMismatch")}
        </p>
      ) : null}

      {result.attributes && result.attributes.length > 0 ? (
        <div className="mt-1 flex flex-col gap-1">
          <span className="text-[12px] font-semibold text-[var(--track-text)]">
            {t("ssoLiveTestAttributes")}
          </span>
          {result.attributes.map((attribute) => (
            <ReportRow
              key={attribute.name}
              label={attribute.name}
              value={attribute.values.join(", ")}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ReportRow({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="flex justify-between gap-3 text-[12px]">
      <span className="shrink-0 text-[var(--track-text-muted)]">{label}</span>
      <span className="break-all text-right text-[var(--track-text)]">{value}</span>
    </div>
  );
}
