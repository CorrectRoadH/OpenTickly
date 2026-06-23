import { AppSurfaceState, SurfaceCard } from "@opentickly/web-ui";
import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type {
  WorkspaceSsoConfig,
  WorkspaceSsoConfigUpdate,
} from "../../shared/api/generated/web/types.gen.ts";
import {
  useTestWorkspaceSsoConfigMutation,
  useUpdateWorkspaceSsoConfigMutation,
  useWorkspaceSsoConfigQuery,
} from "../../shared/query/web-shell.ts";
import { SsoDiagnosticsResults } from "./SettingsSsoDiagnostics.tsx";
import { SsoField, SsoReadOnlyField, SsoTextArea } from "./SettingsSsoFields.tsx";

// SettingsSso lets a workspace admin configure SAML2 single sign-on. It loads
// the current config, then hands it to an editable form that owns its own field
// state so typing never re-renders the settings page.
export function SettingsSso({ workspaceId }: { workspaceId: number }): ReactElement {
  const { t } = useTranslation("settings");
  const configQuery = useWorkspaceSsoConfigQuery(workspaceId);

  if (configQuery.isPending) {
    return <SsoState description={t("ssoLoading")} title={t("singleSignOn")} tone="loading" />;
  }
  if (configQuery.isError || !configQuery.data) {
    return <SsoState description={t("ssoLoadError")} title={t("singleSignOn")} tone="error" />;
  }

  return <SsoConfigForm config={configQuery.data} workspaceId={workspaceId} />;
}

function SsoConfigForm({
  config,
  workspaceId,
}: {
  config: WorkspaceSsoConfig;
  workspaceId: number;
}): ReactElement {
  const { t } = useTranslation("settings");
  const updateMutation = useUpdateWorkspaceSsoConfigMutation(workspaceId);
  const testMutation = useTestWorkspaceSsoConfigMutation(workspaceId);

  const [enabled, setEnabled] = useState(config.enabled);
  const [profileName, setProfileName] = useState(config.profile_name);
  const [emailDomain, setEmailDomain] = useState(config.email_domain);
  const [idpMetadataUrl, setIdpMetadataUrl] = useState(config.idp_metadata_url);
  const [idpSsoUrl, setIdpSsoUrl] = useState(config.idp_sso_url);
  const [idpEntityId, setIdpEntityId] = useState(config.idp_entity_id);
  const [idpCertificate, setIdpCertificate] = useState(config.idp_certificate);

  function buildBody(): WorkspaceSsoConfigUpdate {
    return {
      enabled,
      profile_name: profileName,
      email_domain: emailDomain,
      idp_metadata_url: idpMetadataUrl,
      idp_sso_url: idpSsoUrl,
      idp_entity_id: idpEntityId,
      idp_certificate: idpCertificate,
    };
  }

  function save(): void {
    updateMutation.mutate(buildBody(), {
      onSuccess: () => toast.success(t("ssoSaved")),
      onError: (err) =>
        toast.error(err instanceof Error && err.message ? err.message : t("ssoSaveError")),
    });
  }

  function runTest(): void {
    testMutation.mutate(buildBody(), {
      onError: (err) =>
        toast.error(err instanceof Error && err.message ? err.message : t("ssoTestError")),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <SurfaceCard>
        <div className="flex flex-col gap-5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="mb-1 text-[14px] font-semibold text-[var(--track-text)]">
                {t("singleSignOn")}
              </h3>
              <p className="max-w-[520px] text-[12px] leading-5 text-[var(--track-text-muted)]">
                {t("ssoWorkspaceDescription")}
              </p>
            </div>
            <button
              aria-label={t("ssoEnableLabel")}
              aria-pressed={enabled}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                enabled ? "bg-[var(--track-accent)]" : "bg-[var(--track-border)]"
              }`}
              onClick={() => setEnabled((value) => !value)}
              type="button"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                  enabled ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SsoField
              label={t("ssoProfileName")}
              onChange={setProfileName}
              placeholder={t("ssoProfileNamePlaceholder")}
              value={profileName}
            />
            <SsoField
              label={t("ssoDomain")}
              onChange={setEmailDomain}
              placeholder="example.com"
              value={emailDomain}
            />
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="flex flex-col gap-3 p-5">
          <div>
            <h3 className="mb-1 text-[14px] font-semibold text-[var(--track-text)]">
              {t("ssoIntegrationDetails")}
            </h3>
            <p className="text-[12px] leading-5 text-[var(--track-text-muted)]">
              {t("ssoIntegrationDetailsDescription")}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <SsoReadOnlyField label={t("ssoSpEntityId")} value={config.sp_entity_id} />
            <SsoReadOnlyField label={t("ssoAcsUrl")} value={config.acs_url} />
            <SsoReadOnlyField label={t("ssoSignInUrl")} value={config.sign_in_url} />
            <SsoReadOnlyField label={t("ssoMetadataUrl")} value={config.metadata_url} />
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="flex flex-col gap-3 p-5">
          <div>
            <h3 className="mb-1 text-[14px] font-semibold text-[var(--track-text)]">
              {t("ssoIdpInformation")}
            </h3>
            <p className="text-[12px] leading-5 text-[var(--track-text-muted)]">
              {t("ssoIdpInformationDescription")}
            </p>
          </div>
          <SsoField
            label={t("ssoIdpMetadataUrl")}
            onChange={setIdpMetadataUrl}
            placeholder="https://idp.example.com/metadata"
            value={idpMetadataUrl}
          />
          <div className="grid grid-cols-2 gap-3">
            <SsoField
              label={t("ssoIdpSignInUrl")}
              onChange={setIdpSsoUrl}
              placeholder="https://idp.example.com/sso"
              value={idpSsoUrl}
            />
            <SsoField
              label={t("ssoIdpEntityId")}
              onChange={setIdpEntityId}
              placeholder="https://idp.example.com/entity"
              value={idpEntityId}
            />
          </div>
          <SsoTextArea
            label={t("ssoIdpCertificate")}
            onChange={setIdpCertificate}
            placeholder="-----BEGIN CERTIFICATE-----"
            value={idpCertificate}
          />
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="flex flex-col gap-3 p-5">
          <div>
            <h3 className="mb-1 text-[14px] font-semibold text-[var(--track-text)]">
              {t("ssoTestTitle")}
            </h3>
            <p className="text-[12px] leading-5 text-[var(--track-text-muted)]">
              {t("ssoTestDescription")}
            </p>
          </div>
          <div>
            <button
              className="rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-4 py-2 text-[14px] font-medium text-[var(--track-text)] transition-colors hover:border-[var(--track-accent)] disabled:opacity-50"
              disabled={testMutation.isPending}
              onClick={runTest}
              type="button"
            >
              {testMutation.isPending ? t("ssoTesting") : t("ssoTestRun")}
            </button>
          </div>
          {testMutation.data ? <SsoDiagnosticsResults result={testMutation.data} /> : null}
        </div>
      </SurfaceCard>

      <div>
        <button
          className="rounded-[8px] bg-[var(--track-accent)] px-4 py-2 text-[14px] font-medium text-white disabled:opacity-50"
          disabled={updateMutation.isPending}
          onClick={save}
          type="button"
        >
          {updateMutation.isPending ? t("ssoSaving") : t("ssoSave")}
        </button>
      </div>
    </div>
  );
}

function SsoState(props: {
  description: string;
  title: string;
  tone: "empty" | "error" | "loading";
}): ReactElement {
  return (
    <SurfaceCard>
      <AppSurfaceState
        className="border-none bg-transparent text-[var(--track-text-muted)]"
        description={props.description}
        title={props.title}
        tone={props.tone}
      />
    </SurfaceCard>
  );
}
