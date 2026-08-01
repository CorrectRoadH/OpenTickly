import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { FileQuestion } from "lucide-react";
import { type ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { PublicStatusPage } from "../app/PublicStatusPage.tsx";

export const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFoundPage,
});

function NotFoundPage(): ReactElement {
  const { t } = useTranslation();
  return (
    <PublicStatusPage
      badge="404"
      description={t("pageNotFoundDescription")}
      icon={FileQuestion}
      title={t("pageNotFound")}
    >
      <div className="flex flex-wrap gap-3">
        <Link
          className="inline-flex h-9 items-center rounded-[6px] border border-[var(--track-accent)] bg-[var(--track-accent)] px-4 text-[14px] font-semibold text-[var(--track-button-text)] shadow-[var(--track-depth-accent-shadow)] transition hover:bg-[var(--track-accent-fill-hover)]"
          to="/timer"
        >
          {t("goToTimer")}
        </Link>
      </div>
    </PublicStatusPage>
  );
}
