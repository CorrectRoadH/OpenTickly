import { AppSurfaceState, SurfaceCard } from "@opentoggl/web-ui";
import { type ReactElement, useState } from "react";
import { toast } from "sonner";

import {
  useInstanceConfigQuery,
  useSendTestEmailMutation,
  useUpdateInstanceConfigMutation,
} from "../../shared/query/instance-admin.ts";

const registrationModes = [
  { value: "open" as const, label: "Open", desc: "Anyone can register." },
  { value: "closed" as const, label: "Closed", desc: "No new registrations." },
  { value: "invite_only" as const, label: "Invite Only", desc: "Only invited users." },
];

export function AdminConfigTab(): ReactElement {
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
              onSuccess: () => toast.success("Site URL updated"),
              onError: () => toast.error("Failed to update site URL"),
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
              onSuccess: () => toast.success(`Registration set to ${mode}`),
              onError: () => toast.error("Failed to update registration policy"),
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
            toast.error("Configure SMTP before enabling email verification");
            return;
          }
          updateMutation.mutate(
            { email_verification_required: enabled },
            {
              onSuccess: () =>
                toast.success(
                  enabled ? "Email verification enabled" : "Email verification disabled",
                ),
              onError: () => toast.error("Failed to update"),
            },
          );
        }}
        saving={updateMutation.isPending}
      />

      <SmtpSection
        configured={config.smtp_configured}
        senderEmail={config.sender_email}
        senderName={config.sender_name}
        onSave={(values) => {
          updateMutation.mutate(values, {
            onSuccess: () => toast.success("Email settings updated"),
            onError: () => toast.error("Failed to update email settings"),
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
  const [value, setValue] = useState(siteUrl);

  return (
    <SurfaceCard>
      <div className="p-5">
        <h3 className="mb-1 text-[16px] font-semibold text-[var(--track-text)]">Site URL</h3>
        <p className="mb-4 text-[13px] text-[var(--track-text-muted)]">
          The public URL of this OpenToggl instance. Used in emails and links.
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
            Save
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
  return (
    <SurfaceCard>
      <div className="p-5">
        <h3 className="mb-1 text-[16px] font-semibold text-[var(--track-text)]">
          Registration Policy
        </h3>
        <p className="mb-4 text-[13px] text-[var(--track-text-muted)]">
          Controls whether new users can create accounts on this instance.
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
                  {mode.label}
                </span>
                <span className="ml-2 text-[13px] text-[var(--track-text-muted)]">{mode.desc}</span>
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
  return (
    <SurfaceCard>
      <div className="flex items-center justify-between p-5">
        <div>
          <h3 className="text-[16px] font-semibold text-[var(--track-text)]">Email Verification</h3>
          <p className="text-[13px] text-[var(--track-text-muted)]">
            Require new users to verify their email address after registration.
            {!smtpConfigured ? " Requires SMTP to be configured." : ""}
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
  onSave,
  saving,
}: {
  configured: boolean;
  senderEmail: string;
  senderName: string;
  onSave: (values: Record<string, unknown>) => void;
  saving: boolean;
}): ReactElement {
  const [email, setEmail] = useState(senderEmail);
  const [name, setName] = useState(senderName);
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [testTo, setTestTo] = useState("");
  const testMutation = useSendTestEmailMutation();

  return (
    <SurfaceCard>
      <div className="p-5">
        <h3 className="mb-1 text-[16px] font-semibold text-[var(--track-text)]">Email / SMTP</h3>
        <p className="mb-4 text-[13px] text-[var(--track-text-muted)]">
          Configure outgoing email for notifications and invitations.
          {configured
            ? " SMTP is configured."
            : " SMTP is not configured — emails will not be sent."}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <ConfigField label="Sender Name" onChange={setName} value={name} />
          <ConfigField label="Sender Email" onChange={setEmail} type="email" value={email} />
          <ConfigField
            label="SMTP Host"
            onChange={setHost}
            placeholder="smtp.example.com"
            value={host}
          />
          <ConfigField label="SMTP Port" onChange={setPort} type="number" value={port} />
          <ConfigField label="SMTP Username" onChange={setUsername} value={username} />
          <ConfigField
            label="SMTP Password"
            onChange={setPassword}
            type="password"
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
                ...(host
                  ? {
                      smtp_host: host,
                      smtp_port: parseInt(port, 10),
                      smtp_username: username,
                      smtp_password: password,
                    }
                  : {}),
              })
            }
            type="button"
          >
            Save Email Settings
          </button>
        </div>

        {configured ? (
          <div className="mt-5 border-t border-[var(--track-border)] pt-4">
            <h4 className="mb-2 text-[14px] font-medium text-[var(--track-text)]">
              Send Test Email
            </h4>
            <div className="flex items-center gap-3">
              <input
                className="flex-1 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 py-2 text-[14px] text-[var(--track-text)] placeholder:text-[var(--track-text-muted)] focus:border-[var(--track-accent)] focus:outline-none"
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="recipient@example.com"
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
                    onError: () => toast.error("Failed to send test email"),
                  });
                }}
                type="button"
              >
                {testMutation.isPending ? "Sending..." : "Send Test"}
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

function ConfigLoading(): ReactElement {
  return (
    <SurfaceCard>
      <AppSurfaceState
        className="border-none bg-transparent text-[var(--track-text-muted)]"
        description="Loading configuration..."
        title="Config"
        tone="loading"
      />
    </SurfaceCard>
  );
}

function ConfigError(): ReactElement {
  return (
    <SurfaceCard>
      <AppSurfaceState
        className="border-none bg-transparent text-[var(--track-text-muted)]"
        description="Could not load configuration."
        title="Config unavailable"
        tone="error"
      />
    </SurfaceCard>
  );
}
