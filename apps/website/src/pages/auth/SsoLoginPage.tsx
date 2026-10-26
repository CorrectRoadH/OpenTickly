import { Link } from "@tanstack/react-router";
import { type FormEvent, type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";

import { PublicMainPanelFrame } from "../../app/PublicMainPanelFrame.tsx";
import { AuthLanguageSwitcher } from "../../features/auth/AuthLanguageSwitcher.tsx";
import { useSsoResolveMutation, type SsoResolveResult } from "../../shared/query/web-shell.ts";

const fieldClassName =
  "h-9 w-full rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 text-[14px] text-[var(--track-text)] shadow-[0_1px_0_0_var(--track-depth-border)] outline-none transition-[border-color,box-shadow] duration-[var(--duration-fast)] placeholder:text-[var(--track-text-soft)] focus:border-[var(--track-accent)]";

const submitButtonClassName =
  "flex h-9 w-full items-center justify-center rounded-[6px] border border-[var(--track-accent)] bg-[var(--track-accent)] px-3 text-[14px] font-semibold text-[var(--track-button-text)] shadow-[var(--track-depth-accent-shadow)] transition-[transform,box-shadow,background] duration-[var(--duration-fast)] ease-[var(--ease-spring)] hover:-translate-y-px hover:bg-[var(--track-accent-fill-hover)] hover:shadow-[var(--track-depth-accent-shadow-hover)] active:translate-y-px active:shadow-[var(--track-depth-shadow-active)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

// SsoLoginPage owns its own email field so a keystroke never re-renders the
// public shell. Discovery shows the workspace and provider before navigation.
export function SsoLoginPage(): ReactElement {
  const { t } = useTranslation("auth");
  const mutation = useSsoResolveMutation();
  const [email, setEmail] = useState("");
  const [resolved, setResolved] = useState<SsoResolveResult | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setNotFound(false);
    const result = await mutation.mutateAsync(trimmed).catch(() => null);
    if (result?.found && result.login_path) {
      setResolved(result);
      return;
    }
    setNotFound(true);
  }

  return (
    <PublicMainPanelFrame badge={t("accountLogin")} title={t("ssoLoginTitle")}>
      <form className="space-y-5" data-testid="sso-login-page" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase text-[var(--track-text-muted)]">
            {t("ssoLoginEmailLabel")}
          </span>
          <input
            autoFocus
            className={fieldClassName}
            onChange={(event) => {
              setEmail(event.target.value);
              setResolved(null);
              if (notFound) setNotFound(false);
            }}
            placeholder={t("emailPlaceholder")}
            type="email"
            value={email}
          />
        </label>

        {notFound ? (
          <p className="text-[13px] leading-5 text-[var(--track-state-danger-text)]" role="alert">
            {t("ssoNotConfiguredForEmail")}
          </p>
        ) : null}

        {resolved ? (
          <div className="space-y-3 text-[14px]" role="status">
            <p>
              {t("ssoConfirmProvider", {
                workspace: resolved.workspace_name,
                provider: resolved.profile_name,
                host: resolved.idp_host,
              })}
            </p>
            <p className="text-[12px] text-[var(--track-text-muted)]">{t("ssoDiscoveryHint")}</p>
            <button
              type="button"
              className={submitButtonClassName}
              onClick={() => window.location.assign(resolved.login_path!)}
            >
              {t("ssoContinueProvider")}
            </button>
          </div>
        ) : null}
        {!resolved ? (
          <button className={submitButtonClassName} disabled={mutation.isPending} type="submit">
            {mutation.isPending ? t("submitting") : t("continue")}
          </button>
        ) : null}

        <Link
          className="block text-center text-[14px] text-[var(--track-accent)] hover:underline"
          to="/login"
        >
          {t("ssoLoginDifferentMethod")}
        </Link>
      </form>
      <AuthLanguageSwitcher />
    </PublicMainPanelFrame>
  );
}

export default SsoLoginPage;
