import { AppSurfaceState, SurfaceCard } from "@opentickly/web-ui";
import { Eye, EyeOff } from "lucide-react";
import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { InstanceOidcConfig, OidcDiscoveryResult } from "../../shared/api/admin-client.ts";
import {
  useInstanceOidcConfigQuery,
  useTestInstanceOidcConfigMutation,
  useUpdateInstanceOidcConfigMutation,
} from "../../shared/query/instance-admin.ts";
import { DiscoveryResult, Toggle } from "./AdminSsoTabParts.tsx";

const inputClassName =
  "w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 py-2 text-[14px] text-[var(--track-text)] placeholder:text-[var(--track-text-muted)] focus:border-[var(--track-accent)] focus:outline-none";

const labelClassName = "mb-1 block text-[12px] font-medium text-[var(--track-text-muted)]";

export function AdminSsoTab(): ReactElement {
  const { t } = useTranslation();
  const configQuery = useInstanceOidcConfigQuery();

  if (configQuery.isPending) {
    return (
      <SurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent text-[var(--track-text-muted)]"
          description={t("instanceAdmin:loadingSso")}
          title={t("instanceAdmin:singleSignOn")}
          tone="loading"
        />
      </SurfaceCard>
    );
  }
  if (configQuery.isError || !configQuery.data) {
    return (
      <SurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent text-[var(--track-text-muted)]"
          description={t("instanceAdmin:couldNotLoadSso")}
          title={t("instanceAdmin:ssoUnavailable")}
          tone="error"
        />
      </SurfaceCard>
    );
  }

  // Remount the form whenever a new revision arrives so saved values win over
  // stale local edits without lifting field state into this component.
  return <OidcForm config={configQuery.data} key={configQuery.data.revision} />;
}

function OidcForm({ config }: { config: InstanceOidcConfig }): ReactElement {
  const { t } = useTranslation();
  const updateMutation = useUpdateInstanceOidcConfigMutation();
  const testMutation = useTestInstanceOidcConfigMutation();
  const [enabled, setEnabled] = useState(config.enabled);
  const [providerName, setProviderName] = useState(config.provider_name);
  const [issuerUrl, setIssuerUrl] = useState(config.issuer_url);
  const [clientId, setClientId] = useState(config.client_id);
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [domains, setDomains] = useState(config.allowed_email_domains.join(", "));
  const [autoProvision, setAutoProvision] = useState(config.auto_provision);
  const [discovery, setDiscovery] = useState<OidcDiscoveryResult | null>(null);

  function save(): void {
    updateMutation.mutate(
      {
        revision: config.revision,
        enabled,
        provider_name: providerName,
        issuer_url: issuerUrl,
        client_id: clientId,
        client_secret: clientSecret.length > 0 ? clientSecret : undefined,
        allowed_email_domains: domains
          .split(/[,\s]+/)
          .map((domain) => domain.trim())
          .filter((domain) => domain.length > 0),
        auto_provision: autoProvision,
      },
      {
        onSuccess: () => toast.success(t("toast:ssoSettingsUpdated")),
        onError: (error) =>
          toast.error(
            error instanceof Error ? error.message : t("toast:failedToUpdateSsoSettings"),
          ),
      },
    );
  }

  function runDiscovery(): void {
    setDiscovery(null);
    testMutation.mutate(issuerUrl, {
      onSuccess: (result) => setDiscovery(result),
      onError: (error) =>
        toast.error(error instanceof Error ? error.message : t("instanceAdmin:ssoDiscoveryFailed")),
    });
  }

  return (
    <div className="flex flex-col gap-5" data-testid="instance-admin-sso">
      <SurfaceCard>
        <div className="p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="mb-1 text-[14px] font-semibold text-[var(--track-text)]">
                {t("instanceAdmin:oidcTitle")}
              </h3>
              <p className="text-[12px] text-[var(--track-text-muted)]">
                {t("instanceAdmin:oidcDescription")}
              </p>
            </div>
            <Toggle checked={enabled} label={t("instanceAdmin:enabled")} onChange={setEnabled} />
          </div>

          {!config.site_url_configured ? (
            <p
              className="mb-4 rounded-[8px] border border-[var(--track-state-warning-border,var(--track-border))] p-3 text-[12px] text-[var(--track-text)]"
              role="alert"
            >
              {t("instanceAdmin:oidcNeedsSiteUrl")}
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className={labelClassName}>{t("instanceAdmin:oidcProviderName")}</span>
              <input
                className={inputClassName}
                onChange={(event) => setProviderName(event.target.value)}
                placeholder="Google"
                value={providerName}
              />
            </label>
            <label>
              <span className={labelClassName}>{t("instanceAdmin:oidcIssuerUrl")}</span>
              <input
                className={inputClassName}
                onChange={(event) => setIssuerUrl(event.target.value)}
                placeholder="https://accounts.google.com"
                type="url"
                value={issuerUrl}
              />
            </label>
            <label>
              <span className={labelClassName}>{t("instanceAdmin:oidcClientId")}</span>
              <input
                autoComplete="off"
                className={inputClassName}
                onChange={(event) => setClientId(event.target.value)}
                value={clientId}
              />
            </label>
            <label>
              <span className={labelClassName}>{t("instanceAdmin:oidcClientSecret")}</span>
              <span className="relative block">
                <input
                  autoComplete="new-password"
                  className={`${inputClassName} pr-10`}
                  onChange={(event) => setClientSecret(event.target.value)}
                  placeholder={
                    config.client_secret_configured
                      ? t("instanceAdmin:oidcSecretKept")
                      : t("instanceAdmin:oidcSecretMissing")
                  }
                  type={showSecret ? "text" : "password"}
                  value={clientSecret}
                />
                <button
                  aria-label={
                    showSecret ? t("instanceAdmin:hideSecret") : t("instanceAdmin:showSecret")
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--track-text-muted)]"
                  onClick={() => setShowSecret((value) => !value)}
                  type="button"
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>
            <label className="md:col-span-2">
              <span className={labelClassName}>{t("instanceAdmin:oidcAllowedDomains")}</span>
              <input
                className={inputClassName}
                onChange={(event) => setDomains(event.target.value)}
                placeholder="example.com, example.org"
                value={domains}
              />
              <span className="mt-1 block text-[12px] text-[var(--track-text-muted)]">
                {t("instanceAdmin:oidcAllowedDomainsHint")}
              </span>
            </label>
          </div>

          <div className="mt-4 flex items-start justify-between gap-4 rounded-[8px] border border-[var(--track-border)] p-3">
            <div>
              <span className="text-[14px] font-medium text-[var(--track-text)]">
                {t("instanceAdmin:oidcAutoProvision")}
              </span>
              <p className="text-[12px] text-[var(--track-text-muted)]">
                {t("instanceAdmin:oidcAutoProvisionDescription")}
              </p>
            </div>
            <Toggle
              checked={autoProvision}
              label={t("instanceAdmin:oidcAutoProvision")}
              onChange={setAutoProvision}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              className="rounded-[8px] bg-[var(--track-accent)] px-4 py-2 text-[14px] font-medium text-white disabled:opacity-50"
              disabled={updateMutation.isPending}
              onClick={save}
              type="button"
            >
              {t("instanceAdmin:save")}
            </button>
            <button
              className="rounded-[8px] border border-[var(--track-border)] px-4 py-2 text-[14px] font-medium text-[var(--track-text)] disabled:opacity-50"
              disabled={testMutation.isPending || issuerUrl.trim().length === 0}
              onClick={runDiscovery}
              type="button"
            >
              {testMutation.isPending
                ? t("instanceAdmin:oidcTesting")
                : t("instanceAdmin:oidcTestIssuer")}
            </button>
          </div>

          {discovery ? <DiscoveryResult result={discovery} /> : null}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="p-5">
          <h3 className="mb-1 text-[14px] font-semibold text-[var(--track-text)]">
            {t("instanceAdmin:oidcProviderSetup")}
          </h3>
          <p className="mb-3 text-[12px] text-[var(--track-text-muted)]">
            {t("instanceAdmin:oidcProviderSetupDescription")}
          </p>
          <dl className="grid gap-2 text-[13px]">
            <dt className="text-[var(--track-text-muted)]">{t("instanceAdmin:oidcRedirectUrl")}</dt>
            <dd>
              <code className="break-all rounded bg-[var(--track-surface-hover)] px-2 py-1 text-[var(--track-text)]">
                {config.redirect_url || t("instanceAdmin:oidcRedirectUrlPending")}
              </code>
            </dd>
          </dl>
        </div>
      </SurfaceCard>
    </div>
  );
}
