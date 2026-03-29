import { AppSurfaceState, SurfaceCard } from "@opentoggl/web-ui";
import type { ReactElement } from "react";

import {
  useInstanceHealthQuery,
  useInstanceVersionQuery,
} from "../../shared/query/instance-admin.ts";

export function AdminOverviewTab(): ReactElement {
  return (
    <div className="flex flex-col gap-5">
      <OnboardingBanner />
      <VersionCard />
      <HealthSection />
    </div>
  );
}

function OnboardingBanner(): ReactElement {
  return (
    <SurfaceCard>
      <div className="flex items-start gap-5 p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--track-accent)]/10 text-[24px]">
          <svg
            className="h-7 w-7 text-[var(--track-accent)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-[14px] font-semibold text-[var(--track-text)]">
            Welcome to OpenToggl
          </h3>
          <p className="mt-1 text-[14px] leading-relaxed text-[var(--track-text-muted)]">
            OpenToggl is an open-source, self-hosted time tracking platform compatible with Toggl
            Track. If you find it useful, consider starring us on GitHub — it helps others discover
            the project.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a
              className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--track-overlay-surface-raised)] px-4 py-2 text-[14px] font-medium text-white transition hover:bg-[var(--track-overlay-border-strong)]"
              href="https://github.com/CorrectRoadH/opentoggl"
              rel="noopener noreferrer"
              target="_blank"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Star on GitHub
            </a>
            <a
              className="inline-flex items-center gap-1 text-[14px] text-[var(--track-accent)] hover:underline"
              href="https://github.com/CorrectRoadH/opentoggl/issues"
              rel="noopener noreferrer"
              target="_blank"
            >
              Report an issue
            </a>
            <a
              className="inline-flex items-center gap-1 text-[14px] text-[var(--track-text-muted)] hover:text-[var(--track-text)]"
              href="https://github.com/CorrectRoadH/opentoggl/blob/main/CHANGELOG.md"
              rel="noopener noreferrer"
              target="_blank"
            >
              Changelog
            </a>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}

function VersionCard(): ReactElement {
  const versionQuery = useInstanceVersionQuery();

  if (versionQuery.isPending) {
    return (
      <SurfaceCard>
        <div className="flex items-center gap-3 p-5">
          <div className="h-4 w-32 animate-pulse rounded bg-[var(--track-border)]" />
        </div>
      </SurfaceCard>
    );
  }

  const version = versionQuery.data;

  return (
    <SurfaceCard>
      <div className="flex items-center justify-between p-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-medium text-[var(--track-text)]">
              OpenToggl v{version?.current_version ?? "unknown"}
            </span>
            {version?.update_available ? (
              <span className="rounded-full bg-[var(--track-accent)]/15 px-2.5 py-0.5 text-[12px] font-medium text-[var(--track-accent)]">
                Update available: v{version.latest_version}
              </span>
            ) : (
              <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-[12px] font-medium text-green-400">
                Up to date
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {version?.update_available && version.release_url ? (
            <a
              className="rounded-[8px] bg-[var(--track-accent)] px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-90"
              href={version.release_url}
              rel="noopener noreferrer"
              target="_blank"
            >
              View Release
            </a>
          ) : null}
          {version?.changelog_url ? (
            <a
              className="text-[12px] text-[var(--track-text-muted)] hover:text-[var(--track-text)]"
              href={version.changelog_url}
              rel="noopener noreferrer"
              target="_blank"
            >
              Changelog
            </a>
          ) : null}
        </div>
      </div>
    </SurfaceCard>
  );
}

function HealthSection(): ReactElement {
  const healthQuery = useInstanceHealthQuery();

  if (healthQuery.isPending) {
    return (
      <SurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent text-[var(--track-text-muted)]"
          description="Loading instance health..."
          title="Health"
          tone="loading"
        />
      </SurfaceCard>
    );
  }

  if (healthQuery.isError || !healthQuery.data) {
    return (
      <SurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent text-[var(--track-text-muted)]"
          description="Could not load instance health data."
          title="Health unavailable"
          tone="error"
        />
      </SurfaceCard>
    );
  }

  const health = healthQuery.data;

  return (
    <>
      <SurfaceCard>
        <div className="p-5">
          <h3 className="mb-4 text-[14px] font-semibold text-[var(--track-text)]">
            Instance Health
          </h3>
          <div className="flex items-center gap-3">
            <StatusBadge status={health.status} />
            <span className="text-[14px] text-[var(--track-text-soft)]">
              Checked {new Date(health.checked_at).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Users" value={health.user_count} />
        <StatCard label="Job Backlog" value={health.job_backlog} />
        <DependencyCard label="Database" dep={health.database} />
        <DependencyCard label="Redis" dep={health.redis} />
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: string }): ReactElement {
  const colors: Record<string, string> = {
    healthy: "bg-green-500/20 text-green-400",
    degraded: "bg-yellow-500/20 text-yellow-400",
    unhealthy: "bg-red-500/20 text-red-400",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-medium ${colors[status] ?? "bg-gray-500/20 text-gray-400"}`}
    >
      {status}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number }): ReactElement {
  return (
    <SurfaceCard>
      <div className="p-4">
        <div className="text-[12px] font-medium uppercase tracking-wide text-[var(--track-text-muted)]">
          {label}
        </div>
        <div className="mt-1 text-[24px] font-semibold text-[var(--track-text)]">{value}</div>
      </div>
    </SurfaceCard>
  );
}

function DependencyCard({
  label,
  dep,
}: {
  label: string;
  dep: { status: string; latency_ms?: number };
}): ReactElement {
  const isUp = dep.status === "up";

  return (
    <SurfaceCard>
      <div className="p-4">
        <div className="text-[12px] font-medium uppercase tracking-wide text-[var(--track-text-muted)]">
          {label}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${isUp ? "bg-green-400" : "bg-red-400"}`} />
          <span className="text-[14px] text-[var(--track-text)]">{dep.status}</span>
          {dep.latency_ms != null && dep.latency_ms > 0 ? (
            <span className="text-[12px] text-[var(--track-text-muted)]">{dep.latency_ms}ms</span>
          ) : null}
        </div>
      </div>
    </SurfaceCard>
  );
}
