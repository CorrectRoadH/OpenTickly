import { Link } from "@tanstack/react-router";
import { type ReactElement, type ReactNode } from "react";
import { AppButton, pageLayoutTabClass, PageLayoutTabIndicator } from "@opentoggl/web-ui";

import { ChevronRightIcon, FocusIcon } from "../../shared/ui/icons.tsx";
import { useProjectDetailQuery } from "../../shared/query/web-shell.ts";

type ProjectDetailLayoutProps = {
  activeTab: "dashboard" | "tasks" | "team";
  children: ReactNode;
  projectId: number;
  sidebar?: ReactNode;
  workspaceId: number;
};

const PROJECT_TABS = [
  { key: "dashboard", label: "Dashboard", to: "/$workspaceId/projects/$projectId/dashboard" },
  { key: "tasks", label: "Tasks", to: "/$workspaceId/projects/$projectId/tasks" },
  { key: "team", label: "Team", to: "/$workspaceId/projects/$projectId/team" },
] as const;

export function ProjectDetailLayout({
  activeTab,
  children,
  projectId,
  sidebar,
  workspaceId,
}: ProjectDetailLayoutProps): ReactElement {
  const projectQuery = useProjectDetailQuery(workspaceId, projectId);
  const project = projectQuery.data;
  const routeParams = {
    workspaceId: String(workspaceId),
    projectId: String(projectId),
  };

  return (
    <main className="min-h-dvh bg-[var(--track-surface)] px-5 py-4 text-white">
      <div
        className={
          sidebar
            ? "mx-auto grid max-w-[1384px] gap-6 lg:grid-cols-[minmax(0,1fr)_210px]"
            : "mx-auto max-w-[1384px]"
        }
      >
        <section className="min-w-0">
          <header>
            <div className="flex items-center gap-2 px-5 pb-2 pt-3 text-[12px] text-[var(--track-text-muted)]">
              <Link
                params={{ workspaceId: String(workspaceId) }}
                search={{ status: "default" }}
                to="/projects/$workspaceId/list"
              >
                Projects
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
              <AppButton type="button">Edit Project</AppButton>
            </div>
            <nav
              className="flex h-[40px] items-end gap-0 border-b border-[var(--track-border)] px-5"
              aria-label="Project sections"
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
                    {isActive ? <PageLayoutTabIndicator /> : null}
                  </Link>
                );
              })}
            </nav>
          </header>
          <div className="flex-1">{children}</div>
        </section>
        {sidebar}
      </div>
    </main>
  );
}
