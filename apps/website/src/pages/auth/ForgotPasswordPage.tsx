import { type FormEvent, type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PublicMainPanelFrame } from "../../app/PublicMainPanelFrame.tsx";
import { AuthLanguageSwitcher } from "../../features/auth/AuthLanguageSwitcher.tsx";
import { WebApiError } from "../../shared/api/web-client.ts";
import { useRequestPasswordResetMutation } from "../../shared/query/web-shell.ts";

const fieldClassName =
  "h-9 w-full rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 text-[14px] text-[var(--track-text)] shadow-[0_1px_0_0_var(--track-depth-border)] outline-none transition-[border-color,box-shadow] duration-[var(--duration-fast)] placeholder:text-[var(--track-text-soft)] focus:border-[var(--track-accent)]";

const submitButtonClassName =
  "flex h-9 w-full items-center justify-center rounded-[6px] border border-[var(--track-accent)] bg-[var(--track-accent)] px-3 text-[14px] font-semibold text-[var(--track-button-text)] shadow-[var(--track-depth-accent-shadow)] transition-[transform,box-shadow,background] duration-[var(--duration-fast)] ease-[var(--ease-spring)] hover:-translate-y-px hover:bg-[var(--track-accent-fill-hover)] hover:shadow-[var(--track-depth-accent-shadow-hover)] active:translate-y-px active:shadow-[var(--track-depth-shadow-active)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

export function ForgotPasswordPage(): ReactElement {
  const { t } = useTranslation("auth");
  const { t: tToast } = useTranslation("toast");
  const mutation = useRequestPasswordResetMutation();
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    try {
      await mutation.mutateAsync({ email: trimmed });
      setSubmittedEmail(trimmed);
    } catch (error) {
      if (error instanceof WebApiError && error.status === 422) {
        const code = extractErrorCode(error);
        if (code === "site_url_not_configured") {
          toast.error(tToast("siteUrlNotConfigured"));
        } else {
          toast.error(tToast("emailSendingNotConfigured"));
        }
        return;
      }
      toast.error(t("couldNotCompleteRequest"));
    }
  }

  if (submittedEmail) {
    return (
      <PublicMainPanelFrame badge={t("forgotPasswordBadge")} title={t("forgotPasswordCheckInbox")}>
        <div className="space-y-4">
          <p className="text-[14px] leading-5 text-[var(--track-text-muted)]">
            {t("forgotPasswordSentHint", { email: submittedEmail })}
          </p>
          <a className="block text-[14px] text-[var(--track-accent)] hover:underline" href="/login">
            {t("backToLogin")}
          </a>
        </div>
        <AuthLanguageSwitcher />
      </PublicMainPanelFrame>
    );
  }

  return (
    <PublicMainPanelFrame badge={t("forgotPasswordBadge")} title={t("forgotPasswordTitle")}>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <p className="text-[14px] leading-5 text-[var(--track-text-muted)]">
          {t("forgotPasswordDescription")}
        </p>

        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase text-[var(--track-text-muted)]">
            {t("email")}
          </span>
          <input
            autoFocus
            className={fieldClassName}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("emailPlaceholder")}
            type="email"
            value={email}
          />
        </label>

        <button className={submitButtonClassName} disabled={mutation.isPending} type="submit">
          {mutation.isPending ? t("submitting") : t("forgotPasswordSubmit")}
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

function extractErrorCode(error: WebApiError): string | undefined {
  const data = error.data;
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    return (data as { error: string }).error;
  }
  return undefined;
}

export default ForgotPasswordPage;
