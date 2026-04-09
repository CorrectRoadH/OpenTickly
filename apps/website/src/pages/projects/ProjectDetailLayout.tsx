import { Link } from "@tanstack/react-router";
import { type ReactElement, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AppButton, pageLayoutTabClass } from "@opentoggl/web-ui";

import { ChevronRightIcon, FocusIcon } from "../../shared/ui/icons.tsx";
import { AnimatedActiveIndicator } from "../../shared/ui/AnimatedActiveIndicator.tsx";
import { useProjectDetailQuery } from "../../shared/query/web-shell.ts";

type ProjectDetailLayoutProps = {
  activeTab: "dashboard" | "tasks" | "team";
  children: ReactNode;
  projectId: number;
  workspaceId: number;
};

export function ProjectDetailLayout({
  activeTab,
  children,
  projectId,
  workspaceId,
}: ProjectDetailLayoutProps): ReactElement {
  const { t } = useTranslation("projects");
  const projectQuery = useProjectDetailQuery(workspaceId, projectId);
  const project = projectQuery.data;
  const routeParams = {
    workspaceId: String(workspaceId),
    projectId: String(projectId),
  };

  const PROJECT_TABS = [
    { key: "dashboard", label: t("dashboard"), to: "/$workspaceId/projects/$projectId/dashboard" },
    { key: "tasks", label: t("tasks"), to: "/$workspaceId/projects/$projectId/tasks" },
    { key: "team", label: t("team"), to: "/$workspaceId/projects/$projectId/team" },
  ] as const;

  return (
    <main className="min-h-dvh bg-[var(--track-surface)] px-5 py-4 text-white">
      <div className="mx-auto max-w-[1384px]">
        <header>
          <div className="flex items-center gap-2 px-5 pb-2 pt-3 text-[12px] text-[var(--track-text-muted)]">
            <Link
              params={{ workspaceId: String(workspaceId) }}
              search={{ status: "default" }}
              to="/projects/$workspaceId/list"
            >
              {t("projects")}
            </Link>
            <ChevronRightIcon className="size-3" />
            <span className="font-medium text-[var(--track-accent)]">
              {project?.name ?? `Project ${projectId}`}
            </span>
            <FocusIcon className="size-3" />
          </div>
          <div className="flex items-center justify-between gap-4 px-5 pb-2">
            <h1 className="text-[20px] font-semibold leading-[30px] text-white">
              {project?.name ?? `Project ${projectId}`}
            </h1>
            <AppButton type="button">{t("editProject")}</AppButton>
          </div>
          <nav
            className="flex h-[40px] items-end gap-0 border-b border-[var(--track-border)] px-5"
            aria-label={t("projectSections")}
          >
            {PROJECT_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Link
                  key={tab.key}
                  aria-current={isActive ? "page" : undefined}
                  className={pageLayoutTabClass(isActive)}
                  params={routeParams}
                  to={tab.to}
                >
                  {tab.label}
                  {isActive ? (
                    <AnimatedActiveIndicator
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--track-accent)]"
                      layoutId="project-detail-tab-indicator"
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </main>
  );
}
