import { type ReactElement, useState } from "react";
import { DirectorySurfaceMessage } from "@opentoggl/web-ui";
import { useQuery } from "@tanstack/react-query";

import { getAuditLogs } from "../../shared/api/public/track/index.ts";
import { useSession } from "../../shared/session/session-context.tsx";

type AuditLogEntry = {
  id: number;
  organization_id: number;
  workspace_id?: number;
  entity_type: string;
  entity_id?: number;
  action: string;
  user_id?: number;
  created_at: string;
};

function defaultFrom(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString();
}

function defaultTo(): string {
  return new Date().toISOString();
}

export function AuditLogPage(): ReactElement {
  const session = useSession();
  const organizationId = session.currentOrganization?.id;
  const workspaceId = session.currentWorkspace.id;

  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 50;

  const auditLogsQuery = useQuery({
    queryKey: ["audit-logs", organizationId, workspaceId, pageNumber],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }
      const response = await getAuditLogs({
        path: {
          organization_id: organizationId,
          from: defaultFrom(),
          to: defaultTo(),
        },
        query: {
          workspace_id: workspaceId,
          user_id: session.user.id ?? undefined,
          page_size: pageSize,
          page_number: pageNumber,
        },
      });
      return (response.data ?? []) as AuditLogEntry[];
    },
    enabled: organizationId != null,
  });

  if (!organizationId) {
    return <DirectorySurfaceMessage message="No organization available." />;
  }

  if (auditLogsQuery.isPending) {
    return <DirectorySurfaceMessage message="Loading audit logs..." />;
  }

  if (auditLogsQuery.isError) {
    return (
      <DirectorySurfaceMessage
        message="Unable to load audit logs. Refresh to try again."
        tone="error"
      />
    );
  }

  const logs = auditLogsQuery.data;

  return (
    <div
      className="w-full min-w-0 bg-[var(--track-surface)] text-white"
      data-testid="audit-log-page"
    >
      <header className="border-b border-[var(--track-border)]">
        <div className="flex min-h-[66px] items-center px-5 py-3">
          <h1 className="text-[21px] font-semibold leading-[30px] text-white">Audit Log</h1>
        </div>
      </header>

      {logs.length > 0 ? (
        <div data-testid="audit-log-list">
          <div className="grid grid-cols-[minmax(0,1fr)_120px_100px_100px_180px] border-b border-[var(--track-border)] px-5 text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
            <div className="flex h-[34px] items-center">Action</div>
            <div className="flex h-[34px] items-center">Entity Type</div>
            <div className="flex h-[34px] items-center">Entity ID</div>
            <div className="flex h-[34px] items-center">User ID</div>
            <div className="flex h-[34px] items-center">Time</div>
          </div>
          {logs.map((log) => (
            <div
              className="grid grid-cols-[minmax(0,1fr)_120px_100px_100px_180px] items-center border-b border-[var(--track-border)] px-5 text-[12px]"
              key={log.id}
            >
              <div className="flex h-[46px] items-center text-white">{log.action}</div>
              <div className="flex h-[46px] items-center text-[var(--track-text-muted)]">
                {log.entity_type}
              </div>
              <div className="flex h-[46px] items-center text-[var(--track-text-muted)]">
                {log.entity_id ?? "-"}
              </div>
              <div className="flex h-[46px] items-center text-[var(--track-text-muted)]">
                {log.user_id ?? "-"}
              </div>
              <div className="flex h-[46px] items-center text-[var(--track-text-muted)]">
                {new Date(log.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 py-10" data-testid="audit-log-empty">
          <p className="text-sm text-[var(--track-text-muted)]">
            No audit log entries found for the last 30 days.
          </p>
        </div>
      )}

      <div className="flex items-center gap-4 border-t border-[var(--track-border)] px-5 py-3 text-[11px] text-[var(--track-text-muted)]">
        <span>Page {pageNumber}</span>
        <div className="ml-auto flex gap-2">
          <button
            className="rounded-[6px] border border-[var(--track-border)] px-3 py-1 text-[var(--track-text-muted)] hover:text-white disabled:opacity-40"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => p - 1)}
            type="button"
          >
            Previous
          </button>
          <button
            className="rounded-[6px] border border-[var(--track-border)] px-3 py-1 text-[var(--track-text-muted)] hover:text-white disabled:opacity-40"
            disabled={logs.length < pageSize}
            onClick={() => setPageNumber((p) => p + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
