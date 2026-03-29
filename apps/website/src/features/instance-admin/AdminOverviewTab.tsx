import { AppSurfaceState, SurfaceCard } from "@opentoggl/web-ui";
import type { ReactElement } from "react";
import { Github, Zap } from "lucide-react";

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
          <Zap
            aria-hidden="true"
            className="h-7 w-7 text-[var(--track-accent)]"
            size={28}
            strokeWidth={2}
          />
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
              <Github aria-hidden="true" className="h-5 w-5" size={20} />
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
