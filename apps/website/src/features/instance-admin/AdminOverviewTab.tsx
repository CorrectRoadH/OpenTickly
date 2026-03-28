import { AppSurfaceState, ShellSurfaceCard } from "@opentoggl/web-ui";
import type { ReactElement } from "react";

import { useInstanceHealthQuery } from "../../shared/query/instance-admin.ts";

export function AdminOverviewTab(): ReactElement {
  const healthQuery = useInstanceHealthQuery();

  if (healthQuery.isPending) {
    return (
      <ShellSurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent text-[var(--track-text-muted)]"
          description="Loading instance health..."
          title="Health"
          tone="loading"
        />
      </ShellSurfaceCard>
    );
  }

  if (healthQuery.isError || !healthQuery.data) {
    return (
      <ShellSurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent text-[var(--track-text-muted)]"
          description="Could not load instance health data."
          title="Health unavailable"
          tone="error"
        />
      </ShellSurfaceCard>
    );
  }

  const health = healthQuery.data;

  return (
    <div className="flex flex-col gap-4">
      <ShellSurfaceCard>
        <div className="p-5">
          <h3 className="mb-4 text-[16px] font-semibold text-[var(--track-text)]">
            Instance Health
          </h3>
          <div className="flex items-center gap-3">
            <StatusBadge status={health.status} />
            <span className="text-[14px] text-[var(--track-text-soft)]">
              Checked {new Date(health.checked_at).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </ShellSurfaceCard>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Users" value={health.user_count} />
        <StatCard label="Job Backlog" value={health.job_backlog} />
        <DependencyCard label="Database" dep={health.database} />
        <DependencyCard label="Redis" dep={health.redis} />
      </div>
    </div>
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
      className={`inline-flex items-center rounded-full px-3 py-1 text-[13px] font-medium ${colors[status] ?? "bg-gray-500/20 text-gray-400"}`}
    >
      {status}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number }): ReactElement {
  return (
    <ShellSurfaceCard>
      <div className="p-4">
        <div className="text-[12px] font-medium uppercase tracking-wide text-[var(--track-text-muted)]">
          {label}
        </div>
        <div className="mt-1 text-[24px] font-semibold text-[var(--track-text)]">{value}</div>
      </div>
    </ShellSurfaceCard>
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
    <ShellSurfaceCard>
      <div className="p-4">
        <div className="text-[12px] font-medium uppercase tracking-wide text-[var(--track-text-muted)]">
          {label}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${isUp ? "bg-green-400" : "bg-red-400"}`} />
          <span className="text-[14px] text-[var(--track-text)]">{dep.status}</span>
          {dep.latency_ms !== undefined ? (
            <span className="text-[12px] text-[var(--track-text-muted)]">{dep.latency_ms}ms</span>
          ) : null}
        </div>
      </div>
    </ShellSurfaceCard>
  );
}
