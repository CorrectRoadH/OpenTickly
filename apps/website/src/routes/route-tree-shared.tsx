import { Navigate, useRouterState } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { lazy, useEffect, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PublicMainPanelFrame } from "../app/PublicMainPanelFrame.tsx";
import { WebApiError } from "../shared/api/web-client.ts";

export const pageSpinner = (
  <div className="flex min-h-screen items-center justify-center">
    <LoaderCircle className="size-8 animate-spin text-[var(--track-text-muted)]" />
  </div>
);

export function lazyNamed<T extends Record<string, ComponentType<any>>, K extends keyof T & string>(
  factory: () => Promise<T>,
  name: K,
) {
  return lazy(() => factory().then((m) => ({ default: m[name] })));
}

export function isSessionAccessDenied(error: unknown) {
  return error instanceof WebApiError && (error.status === 401 || error.status === 403);
}

export function SessionPendingPanel() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--track-surface)]">
      <div className="flex flex-col items-center gap-4">
        <svg
          aria-hidden="true"
          className="size-10 animate-pulse"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect fill="#e05d26" height="32" rx="8" width="32" />
          <text
            fill="white"
            fontFamily="Arial, sans-serif"
            fontSize="20"
            fontWeight="bold"
            textAnchor="middle"
            x="16"
            y="23"
          >
            t
          </text>
        </svg>
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}

export function SessionUnavailablePanel() {
  const { t } = useTranslation();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  useEffect(() => {
    toast.error(t("toast:sessionUnavailable"), {
      description: t("account:couldNotLoadAccount"),
    });
  }, [t]);

  return (
    <PublicMainPanelFrame
      badge="Session Error"
      description="The app could not restore your current session from the canonical web session endpoint."
      title="Session unavailable"
    >
      <p className="text-pretty text-[14px] leading-5 text-[var(--track-text-muted)]">
        The app could not bootstrap the current session from
        <code className="mx-1 rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface)] px-2 py-1 text-[12px] text-[var(--track-text)]">
          /web/v1/session
        </code>
        while rendering {pathname}.
      </p>
    </PublicMainPanelFrame>
  );
}

export function SessionExpiredRedirect() {
  const { t } = useTranslation();

  useEffect(() => {
    toast.error(t("toast:sessionExpired"), {
      description: t("auth:pleaseLogInAgain"),
    });
  }, [t]);

  return <Navigate replace to="/login" />;
}
