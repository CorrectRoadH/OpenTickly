import { AppSurfaceState, SurfaceCard } from "@opentickly/web-ui";
import { Eye, EyeOff } from "lucide-react";
import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useInstanceConfigQuery,
  useSendTestEmailMutation,
  useUpdateInstanceConfigMutation,
} from "../../shared/query/instance-admin.ts";
import { WebApiError } from "../../shared/api/web-client.ts";

const registrationModes = [
  {
    value: "open" as const,
    labelKey: "instanceAdmin:open",
    descKey: "instanceAdmin:openDescription",
  },
  {
    value: "closed" as const,
    labelKey: "instanceAdmin:closed",
    descKey: "instanceAdmin:closedDescription",
  },
  {
    value: "invite_only" as const,
    labelKey: "instanceAdmin:inviteOnly",
    descKey: "instanceAdmin:inviteOnlyDescription",
  },
];

export function AdminConfigTab(): ReactElement {
  const { t } = useTranslation();
  const configQuery = useInstanceConfigQuery();
  const updateMutation = useUpdateInstanceConfigMutation();

  if (configQuery.isPending) {
    return <ConfigLoading />;
  }
  if (configQuery.isError || !configQuery.data) {
    return <ConfigError />;
  }

  const config = configQuery.data;

  return (
    <div className="flex flex-col gap-5">
      <SiteSection
        siteUrl={config.site_url}
        onSave={(siteUrl) => {
          updateMutation.mutate(
            { site_url: siteUrl },
            {
              onSuccess: () => toast.success(t("toast:siteUrlUpdated")),
              onError: (err) =>
                toast.error(
                  err instanceof WebApiError ? err.userMessage : t("toast:failedToUpdateSiteUrl"),
                ),
            },
          );
        }}
        saving={updateMutation.isPending}
      />

      <RegistrationSection
        currentMode={config.registration_mode}
        onSelect={(mode) => {
          updateMutation.mutate(
            { registration_mode: mode },
            {
              onSuccess: () => toast.success(t("toast:registrationSet", { mode })),
              onError: (err) =>
                toast.error(
                  err instanceof WebApiError
                    ? err.userMessage
                    : t("toast:failedToUpdateRegistrationPolicy"),
                ),
            },
          );
        }}
        saving={updateMutation.isPending}
      />

      <EmailVerificationSection
        enabled={config.email_verification_required}
        smtpConfigured={config.smtp_configured}
        onToggle={(enabled) => {
          if (enabled && !config.smtp_configured) {
            toast.error(t("toast:configureSmtpFirst"));
            return;
          }
          updateMutation.mutate(
            { email_verification_required: enabled },
            {
              onSuccess: () =>
                toast.success(
                  t(enabled ? "toast:emailVerificationEnabled" : "toast:emailVerificationDisabled"),
                ),
              onError: (err) =>
                toast.error(
                  err instanceof WebApiError ? err.userMessage : t("toast:failedToUpdate"),
                ),
            },
          );
        }}
        saving={updateMutation.isPending}
      />

      <SmtpSection
        configured={config.smtp_configured}
        senderEmail={config.sender_email}
        senderName={config.sender_name}
        smtpHost={config.smtp_host ?? ""}
        smtpPassword={config.smtp_password ?? ""}
        smtpPort={config.smtp_port ?? 587}
        smtpUsername={config.smtp_username ?? ""}
        onSave={(values) => {
          updateMutation.mutate(values, {
            onSuccess: () => toast.success(t("toast:emailSettingsUpdated")),
            onError: (err) =>
              toast.error(
                err instanceof WebApiError
                  ? err.userMessage
                  : t("toast:failedToUpdateEmailSettings"),
              ),
          });
        }}
        saving={updateMutation.isPending}
      />
    </div>
  );
}

function SiteSection({
  siteUrl,
  onSave,
  saving,
}: {
  siteUrl: string;
  onSave: (url: string) => void;
  saving: boolean;
}): ReactElement {
  const { t } = useTranslation();
  const [value, setValue] = useState(siteUrl);

  return (
    <SurfaceCard>
      <div className="p-5">
        <h3 className="mb-1 text-[14px] font-semibold text-[var(--track-text)]">
          {t("instanceAdmin:siteUrl")}
        </h3>
        <p className="mb-4 text-[12px] text-[var(--track-text-muted)]">
          {t("instanceAdmin:siteUrlDescription")}
        </p>
        <div className="flex items-center gap-3">
          <input
            className="flex-1 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 py-2 text-[14px] text-[var(--track-text)] placeholder:text-[var(--track-text-muted)] focus:border-[var(--track-accent)] focus:outline-none"
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://track.example.com"
            type="url"
            value={value}
          />
          <button
            className="rounded-[8px] bg-[var(--track-accent)] px-4 py-2 text-[14px] font-medium text-white disabled:opacity-50"
            disabled={saving || value === siteUrl}
            onClick={() => onSave(value)}
            type="button"
          >
            {t("instanceAdmin:save")}
          </button>
        </div>
      </div>
    </SurfaceCard>
  );
}

function RegistrationSection({
  currentMode,
  onSelect,
  saving,
}: {
  currentMode: string;
  onSelect: (mode: string) => void;
  saving: boolean;
}): ReactElement {
  const { t } = useTranslation();

  return (
    <SurfaceCard>
      <div className="p-5">
        <h3 className="mb-1 text-[14px] font-semibold text-[var(--track-text)]">
          {t("instanceAdmin:registrationPolicy")}
        </h3>
        <p className="mb-4 text-[12px] text-[var(--track-text-muted)]">
          {t("instanceAdmin:registrationPolicyDescription")}
        </p>
        <div className="flex flex-col gap-2">
          {registrationModes.map((mode) => (
            <button
              className={`flex items-center gap-3 rounded-[8px] border p-3 text-left transition ${
                currentMode === mode.value
                  ? "border-[var(--track-accent)] bg-[var(--track-accent)]/5"
                  : "border-[var(--track-border)] hover:border-[var(--track-text-muted)]"
              }`}
              disabled={saving}
              key={mode.value}
              onClick={() => {
                if (mode.value !== currentMode) onSelect(mode.value);
              }}
              type="button"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
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
                <span className="text-[14px] font-medium text-[var(--track-text)]">
                  {t(mode.labelKey)}
                </span>
                <span className="ml-2 text-[12px] text-[var(--track-text-muted)]">
                  {t(mode.descKey)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </SurfaceCard>
  );
}

function EmailVerificationSection({
  enabled,
  smtpConfigured,
  onToggle,
  saving,
}: {
  enabled: boolean;
  smtpConfigured: boolean;
  onToggle: (enabled: boolean) => void;
  saving: boolean;
}): ReactElement {
  const { t } = useTranslation();

  return (
    <SurfaceCard>
      <div className="flex items-center justify-between p-5">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--track-text)]">
            {t("instanceAdmin:emailVerification")}
          </h3>
          <p className="text-[12px] text-[var(--track-text-muted)]">
            {t("instanceAdmin:emailVerificationDescription")}
            {!smtpConfigured ? t("instanceAdmin:requiresSmtp") : ""}
          </p>
        </div>
        <button
          className={`relative h-6 w-11 rounded-full transition ${
            enabled ? "bg-[var(--track-accent)]" : "bg-[var(--track-border)]"
          }`}
          disabled={saving}
          onClick={() => onToggle(!enabled)}
          type="button"
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
              enabled ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </div>
    </SurfaceCard>
  );
}

function SmtpSection({
  configured,
  senderEmail,
  senderName,
  smtpHost,
  smtpPassword,
  smtpPort,
  smtpUsername,
  onSave,
  saving,
}: {
  configured: boolean;
  senderEmail: string;
  senderName: string;
  smtpHost: string;
  smtpPassword: string;
  smtpPort: number;
  smtpUsername: string;
  onSave: (values: Record<string, unknown>) => void;
  saving: boolean;
}): ReactElement {
  const { t } = useTranslation();
  const [email, setEmail] = useState(senderEmail);
  const [name, setName] = useState(senderName);
  const [host, setHost] = useState(smtpHost);
  const [port, setPort] = useState(String(smtpPort));
  const [username, setUsername] = useState(smtpUsername);
  const [password, setPassword] = useState(smtpPassword);
  const [testTo, setTestTo] = useState("");
  const testMutation = useSendTestEmailMutation();

  return (
    <SurfaceCard>
      <div className="p-5">
        <h3 className="mb-1 text-[14px] font-semibold text-[var(--track-text)]">
          {t("instanceAdmin:emailSmtp")}
        </h3>
        <p className="mb-4 text-[12px] text-[var(--track-text-muted)]">
          {t("instanceAdmin:emailSmtpDescription")}
          {configured ? t("instanceAdmin:smtpConfigured") : t("instanceAdmin:smtpNotConfigured")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <ConfigField label={t("instanceAdmin:senderName")} onChange={setName} value={name} />
          <ConfigField
            label={t("instanceAdmin:senderEmail")}
            onChange={setEmail}
            type="email"
            value={email}
          />
          <ConfigField
            label={t("instanceAdmin:smtpHost")}
            onChange={setHost}
            placeholder="smtp.example.com"
            value={host}
          />
          <ConfigField
            label={t("instanceAdmin:smtpPort")}
            onChange={setPort}
            type="number"
            value={port}
          />
          <ConfigField
            label={t("instanceAdmin:smtpUsername")}
            onChange={setUsername}
            value={username}
          />
          <SecretField
            label={t("instanceAdmin:smtpPassword")}
            onChange={setPassword}
            value={password}
          />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            className="rounded-[8px] bg-[var(--track-accent)] px-4 py-2 text-[14px] font-medium text-white disabled:opacity-50"
            disabled={saving}
            onClick={() =>
              onSave({
                sender_name: name,
                sender_email: email,
                smtp_host: host,
                smtp_port: parseInt(port, 10),
                smtp_username: username,
                smtp_password: password,
              })
            }
            type="button"
          >
            {t("instanceAdmin:saveEmailSettings")}
          </button>
        </div>

        {configured ? (
          <div className="mt-5 border-t border-[var(--track-border)] pt-4">
            <h4 className="mb-2 text-[14px] font-medium text-[var(--track-text)]">
              {t("instanceAdmin:sendTestEmail")}
            </h4>
            <div className="flex items-center gap-3">
              <input
                className="flex-1 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 py-2 text-[14px] text-[var(--track-text)] placeholder:text-[var(--track-text-muted)] focus:border-[var(--track-accent)] focus:outline-none"
                onChange={(e) => setTestTo(e.target.value)}
                placeholder={t("instanceAdmin:recipientEmail")}
                type="email"
                value={testTo}
              />
              <button
                className="rounded-[8px] border border-[var(--track-border)] px-4 py-2 text-[14px] font-medium text-[var(--track-text)] hover:bg-[var(--track-surface-hover)] disabled:opacity-50"
                disabled={!testTo || testMutation.isPending}
                onClick={() => {
                  testMutation.mutate(testTo, {
                    onSuccess: (result) => {
                      if (result.success) {
                        toast.success(result.message);
                      } else {
                        toast.error(result.message);
                      }
                    },
                    onError: (err) => {
                      const fallback = t("toast:failedToSendTestEmail");
                      if (err instanceof WebApiError) {
                        toast.error(err.userMessage);
                        return;
                      }
                      const detail = err instanceof Error ? err.message : "";
                      toast.error(detail ? `${fallback}: ${detail}` : fallback);
                    },
                  });
                }}
                type="button"
              >
                {testMutation.isPending ? t("instanceAdmin:sending") : t("instanceAdmin:sendTest")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  );
}

function ConfigField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}): ReactElement {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] font-medium text-[var(--track-text-muted)]">{label}</span>
      <input
        className="rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 py-2 text-[14px] text-[var(--track-text)] placeholder:text-[var(--track-text-muted)] focus:border-[var(--track-accent)] focus:outline-none"
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function SecretField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}): ReactElement {
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] font-medium text-[var(--track-text-muted)]">{label}</span>
      <div className="relative">
        <input
          className="w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 py-2 pr-10 text-[14px] text-[var(--track-text)] placeholder:text-[var(--track-text-muted)] focus:border-[var(--track-accent)] focus:outline-none"
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={visible ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={visible ? t("instanceAdmin:hideSecret") : t("instanceAdmin:showSecret")}
          className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[6px] text-[var(--track-text-muted)] hover:bg-[var(--track-surface-hover)] hover:text-[var(--track-text)]"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          type="button"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}

function ConfigLoading(): ReactElement {
  const { t } = useTranslation();

  return (
    <SurfaceCard>
      <AppSurfaceState
        className="border-none bg-transparent text-[var(--track-text-muted)]"
        description={t("instanceAdmin:loadingConfig")}
        title={t("instanceAdmin:config")}
        tone="loading"
      />
    </SurfaceCard>
  );
}

function ConfigError(): ReactElement {
  const { t } = useTranslation();

  return (
    <SurfaceCard>
      <AppSurfaceState
        className="border-none bg-transparent text-[var(--track-text-muted)]"
        description={t("instanceAdmin:couldNotLoadConfig")}
        title={t("instanceAdmin:configUnavailable")}
        tone="error"
      />
    </SurfaceCard>
  );
}
