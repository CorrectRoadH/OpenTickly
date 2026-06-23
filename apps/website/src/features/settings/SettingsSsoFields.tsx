import { Check, Copy } from "lucide-react";
import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";

const inputClassName =
  "rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 py-2 text-[14px] text-[var(--track-text)] placeholder:text-[var(--track-text-muted)] focus:border-[var(--track-accent)] focus:outline-none";

// SsoField is a labelled single-line text input mirroring the ConfigField
// pattern used by the instance-admin config tab.
export function SsoField({
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
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] font-medium text-[var(--track-text-muted)]">{label}</span>
      <input
        className={inputClassName}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </label>
  );
}

// SsoTextArea is a labelled multiline input for the X.509 certificate.
export function SsoTextArea({
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
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] font-medium text-[var(--track-text-muted)]">{label}</span>
      <textarea
        className={`${inputClassName} min-h-[120px] resize-y font-mono text-[12px]`}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

// SsoReadOnlyField shows a service-provider value the admin pastes into their
// IdP, with a copy-to-clipboard button.
export function SsoReadOnlyField({ label, value }: { label: string; value: string }): ReactElement {
  const { t } = useTranslation("settings");
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] font-medium text-[var(--track-text-muted)]">{label}</span>
      <div className="flex items-stretch gap-2">
        <input className={`${inputClassName} flex-1`} readOnly type="text" value={value} />
        <button
          aria-label={copied ? t("ssoCopied") : t("ssoCopy")}
          className="flex w-9 shrink-0 items-center justify-center rounded-[8px] border border-[var(--track-border)] text-[var(--track-text-muted)] hover:bg-[var(--track-surface-hover)] hover:text-[var(--track-text)]"
          onClick={copy}
          type="button"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
    </label>
  );
}
