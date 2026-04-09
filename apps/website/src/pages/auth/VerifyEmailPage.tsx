import { useEffect, useState, type ReactElement } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { PublicMainPanelFrame } from "../../app/PublicMainPanelFrame.tsx";
import { AuthLanguageSwitcher } from "../../features/auth/AuthLanguageSwitcher.tsx";
import { resolveHomePath } from "../../shared/lib/workspace-routing.ts";
import { useVerifyEmailMutation } from "../../shared/query/web-shell.ts";

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
        <a className="text-[14px] text-[var(--track-accent)] hover:underline" href="/login">
          {t("backToLogin")}
        </a>
      </div>
      <AuthLanguageSwitcher />
    </PublicMainPanelFrame>
  );
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
