import { useNavigate, useSearch } from "@tanstack/react-router";
import { type FormEvent, type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PublicMainPanelFrame } from "../../app/PublicMainPanelFrame.tsx";
import { AuthLanguageSwitcher } from "../../features/auth/AuthLanguageSwitcher.tsx";
import { WebApiError } from "../../shared/api/web-client.ts";
import { useResetPasswordMutation } from "../../shared/query/web-shell.ts";

const fieldClassName =
  "h-9 w-full rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 text-[14px] text-[var(--track-text)] shadow-[0_1px_0_0_var(--track-depth-border)] outline-none transition-[border-color,box-shadow] duration-[var(--duration-fast)] placeholder:text-[var(--track-text-soft)] focus:border-[var(--track-accent)]";

const submitButtonClassName =
  "flex h-9 w-full items-center justify-center rounded-[6px] border border-[var(--track-accent)] bg-[var(--track-accent)] px-3 text-[14px] font-semibold text-[var(--track-button-text)] shadow-[var(--track-depth-accent-shadow)] transition-[transform,box-shadow,background] duration-[var(--duration-fast)] ease-[var(--ease-spring)] hover:-translate-y-px hover:bg-[var(--track-accent-fill-hover)] hover:shadow-[var(--track-depth-accent-shadow-hover)] active:translate-y-px active:shadow-[var(--track-depth-shadow-active)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

export function ResetPasswordPage(): ReactElement {
  const { t } = useTranslation("auth");
  const { t: tToast } = useTranslation("toast");
  const navigate = useNavigate();
  const mutation = useResetPasswordMutation();
  const search = useSearch({ strict: false }) as { token?: string };
  const token = search.token;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [tokenRejected, setTokenRejected] = useState(false);

  if (!token) {
    return <TokenErrorPanel heading={t("resetPasswordMissingToken")} />;
  }

  if (tokenRejected) {
    return <TokenErrorPanel heading={t("resetPasswordTokenInvalid")} />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFieldError(null);
    if (password.length < 6) {
      setFieldError(t("resetPasswordTooShort"));
      return;
    }
    if (password !== confirm) {
      setFieldError(t("resetPasswordMismatch"));
      return;
    }
    try {
      await mutation.mutateAsync({ token: token!, password });
      toast.success(tToast("passwordResetComplete"));
      void navigate({ to: "/login" });
    } catch (error) {
      if (error instanceof WebApiError && error.status === 400) {
        setTokenRejected(true);
        return;
      }
      toast.error(t("couldNotCompleteRequest"));
    }
  }

  return (
    <PublicMainPanelFrame badge={t("resetPasswordBadge")} title={t("resetPasswordTitle")}>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <p className="text-[14px] leading-5 text-[var(--track-text-muted)]">
          {t("resetPasswordDescription")}
        </p>

        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase text-[var(--track-text-muted)]">
            {t("resetPasswordNewLabel")}
          </span>
          <input
            autoComplete="new-password"
            autoFocus
            className={fieldClassName}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase text-[var(--track-text-muted)]">
            {t("resetPasswordConfirmLabel")}
          </span>
          <input
            autoComplete="new-password"
            className={fieldClassName}
            onChange={(event) => setConfirm(event.target.value)}
            type="password"
            value={confirm}
          />
        </label>

        {fieldError ? (
          <p
            className="rounded-[6px] border border-[var(--track-state-error-border)] bg-[var(--track-danger-tint)] px-3 py-2 text-[14px] leading-5 text-[var(--track-accent-text)]"
            role="alert"
          >
            {fieldError}
          </p>
        ) : null}

        <button className={submitButtonClassName} disabled={mutation.isPending} type="submit">
          {mutation.isPending ? t("submitting") : t("resetPasswordSubmit")}
        </button>

        <a
          className="block text-center text-[14px] text-[var(--track-accent)] hover:underline"
          href="/login"
        >
          {t("backToLogin")}
        </a>
      </form>
      <AuthLanguageSwitcher />
    </PublicMainPanelFrame>
  );
}

function TokenErrorPanel({ heading }: { heading: string }): ReactElement {
  const { t } = useTranslation("auth");
  return (
    <PublicMainPanelFrame badge={t("resetPasswordBadge")} title={heading}>
      <div className="space-y-4">
        <p className="text-[14px] leading-5 text-[var(--track-text-muted)]">
          {t("resetPasswordInvalidHint")}
        </p>
        <a
          className="block text-[14px] text-[var(--track-accent)] hover:underline"
          href="/forgot-password"
        >
          {t("resetPasswordRestart")}
        </a>
        <a className="block text-[14px] text-[var(--track-accent)] hover:underline" href="/login">
          {t("backToLogin")}
        </a>
      </div>
      <AuthLanguageSwitcher />
    </PublicMainPanelFrame>
  );
}

export default ResetPasswordPage;
