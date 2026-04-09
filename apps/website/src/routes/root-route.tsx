import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

export const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFoundPage,
});

function NotFoundPage(): ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--track-canvas)] text-[var(--track-text)]">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-[64px] font-bold leading-none text-[var(--track-text-muted)]">404</p>
        <h1 className="text-[20px] font-semibold">{t("pageNotFound")}</h1>
        <p className="max-w-[320px] text-[14px] leading-5 text-[var(--track-text-muted)]">
          {t("pageNotFoundDescription")}
        </p>
        <Link
          className="mt-2 inline-flex h-9 items-center rounded-[6px] bg-[var(--track-accent)] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-[var(--track-accent-hover)]"
          to="/timer"
        >
          {t("goToTimer")}
        </Link>
      </div>
    </div>
  );
}
