import { useEffect, useState, type ReactElement } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PublicMainPanelFrame } from "../../app/PublicMainPanelFrame.tsx";
import { AuthLanguageSwitcher } from "../../features/auth/AuthLanguageSwitcher.tsx";
import { WebApiError } from "../../shared/api/web-client.ts";
import { resolveHomePath } from "../../shared/lib/workspace-routing.ts";
import {
  useResendVerificationEmailMutation,
  useVerifyEmailMutation,
} from "../../shared/query/web-shell.ts";

export function VerifyEmailPage(): ReactElement {
  const { t } = useTranslation("auth");
  const search = useSearch({ strict: false }) as { token?: string; email?: string };
  const token = search.token;
  const email = search.email;

  if (token) {
    return <VerifyTokenFlow token={token} />;
  }

  return (
    <PublicMainPanelFrame badge={t("checkYourEmail")} title={t("checkYourEmail")}>
      <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--track-accent-tint)]">
          <svg
            className="h-8 w-8 text-[var(--track-accent)]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="text-[14px] text-[var(--track-text-muted)]">
          {email ? t("verificationEmailSentTo", { email }) : t("verificationEmailSent")}
        </p>
        {email ? <ResendVerificationEmailButton email={email} /> : null}
        <a className="text-[14px] text-[var(--track-accent)] hover:underline" href="/login">
          {t("backToLogin")}
        </a>
      </div>
      <AuthLanguageSwitcher />
    </PublicMainPanelFrame>
  );
}

function ResendVerificationEmailButton({ email }: { email: string }): ReactElement {
  const { t } = useTranslation("auth");
  const { t: tToast } = useTranslation("toast");
  const mutation = useResendVerificationEmailMutation();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const handle = window.setInterval(() => {
      setCooldown((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(handle);
  }, [cooldown]);

  async function handleClick(): Promise<void> {
    try {
      await mutation.mutateAsync({ email });
      toast.success(tToast("verificationEmailResent"));
      setCooldown(60);
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

  if (cooldown > 0) {
    return (
      <p className="text-[13px] text-[var(--track-text-muted)]">
        {t("resendVerificationCooldown", { seconds: cooldown })}
      </p>
    );
  }

  return (
    <button
      className="text-[14px] font-semibold text-[var(--track-accent)] hover:underline disabled:opacity-50"
      disabled={mutation.isPending}
      onClick={handleClick}
      type="button"
    >
      {mutation.isPending ? t("submitting") : t("resendVerificationButton")}
    </button>
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

function VerifyTokenFlow({ token }: { token: string }): ReactElement {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const verifyMutation = useVerifyEmailMutation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    verifyMutation.mutate(
      { token },
      {
        onSuccess: () => {
          void navigate({ to: resolveHomePath() });
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : t("verificationFailed"));
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <PublicMainPanelFrame badge={t("emailVerification")} title={t("emailVerification")}>
      <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
        {error ? (
          <>
            <p className="text-[14px] text-[var(--track-state-error-text)]">{error}</p>
            <a className="text-[14px] text-[var(--track-accent)] hover:underline" href="/login">
              {t("backToLogin")}
            </a>
          </>
        ) : (
          <p className="text-[14px] text-[var(--track-text-muted)]">{t("verifyingEmail")}</p>
        )}
      </div>
      <AuthLanguageSwitcher />
    </PublicMainPanelFrame>
  );
}
