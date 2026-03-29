import { type ReactElement, useState } from "react";
import { DirectorySurfaceMessage } from "@opentoggl/web-ui";
import { useQuery } from "@tanstack/react-query";

import { getAuditLogs } from "../../shared/api/public/track/index.ts";
import { ChevronDownIcon, ChevronRightIcon } from "../../shared/ui/icons.tsx";
import { useSession } from "../../shared/session/session-context.tsx";

type AuditLogEntry = {
  id: number;
  organization_id: number;
  workspace_id?: number;
  entity_type: string;
  entity_id?: number;
  action: string;
  user_id?: number;
  source: string;
  request_body: string;
  response_body: string;
  created_at: string;
};

type SourceFilter = "" | "web" | "api";

function defaultFrom(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString();
}

function defaultTo(): string {
  return new Date().toISOString();
}

function sourceLabel(source: string): string {
  if (source === "web") return "Web";
  if (source === "api") return "API";
  return source || "-";
}

export function AuditLogPage(): ReactElement {
  const session = useSession();
  const organizationId = session.currentOrganization?.id;
  const workspaceId = session.currentWorkspace.id;

  const [pageNumber, setPageNumber] = useState(1);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const pageSize = 50;

  const auditLogsQuery = useQuery({
    queryKey: ["audit-logs", organizationId, workspaceId, pageNumber, sourceFilter],
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
          source: sourceFilter || undefined,
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
        <div className="flex min-h-[46px] flex-wrap items-center gap-4 border-t border-[var(--track-border)] px-5 py-2">
          <label className="relative shrink-0">
            <select
              aria-label="Source filter"
              className="h-9 appearance-none rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 pr-8 text-[12px] text-white"
              onChange={(event) => {
                setSourceFilter(event.target.value as SourceFilter);
                setPageNumber(1);
              }}
              value={sourceFilter}
            >
              <option value="">All sources</option>
              <option value="web">Web (Cookie)</option>
              <option value="api">API (Token/CLI)</option>
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--track-text-muted)]">
              <ChevronDownIcon className="size-3" />
            </span>
          </label>
        </div>
      </header>

      {logs.length > 0 ? (
        <div data-testid="audit-log-list">
          <div className="grid grid-cols-[24px_minmax(0,1fr)_80px_120px_80px_180px] border-b border-[var(--track-border)] px-5 text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
            <div className="h-[34px]" />
            <div className="flex h-[34px] items-center">Action</div>
            <div className="flex h-[34px] items-center">Source</div>
            <div className="flex h-[34px] items-center">Entity Type</div>
            <div className="flex h-[34px] items-center">Entity ID</div>
            <div className="flex h-[34px] items-center">Time</div>
          </div>
          {logs.map((log) => {
            const isExpanded = expandedId === log.id;
            const hasBody = log.request_body || log.response_body;
            return (
              <div key={log.id} className="border-b border-[var(--track-border)]">
                <button
                  className="grid w-full grid-cols-[24px_minmax(0,1fr)_80px_120px_80px_180px] items-center px-5 text-left text-[12px]"
                  onClick={() => hasBody && setExpandedId(isExpanded ? null : log.id)}
                  type="button"
                >
                  <div className="flex h-[46px] items-center text-[var(--track-text-muted)]">
                    {hasBody ? (
                      isExpanded ? (
                        <ChevronDownIcon className="size-3" />
                      ) : (
                        <ChevronRightIcon className="size-3" />
                      )
                    ) : null}
                  </div>
                  <div className="flex h-[46px] items-center text-white">{log.action}</div>
                  <div className="flex h-[46px] items-center">
                    <span
                      className={`rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium ${
                        log.source === "api"
                          ? "bg-blue-500/20 text-blue-400"
                          : log.source === "web"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-[var(--track-border)] text-[var(--track-text-muted)]"
                      }`}
                    >
                      {sourceLabel(log.source)}
                    </span>
                  </div>
                  <div className="flex h-[46px] items-center text-[var(--track-text-muted)]">
                    {log.entity_type}
                  </div>
                  <div className="flex h-[46px] items-center text-[var(--track-text-muted)]">
                    {log.entity_id ?? "-"}
                  </div>
                  <div className="flex h-[46px] items-center text-[var(--track-text-muted)]">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </button>
                {isExpanded && hasBody ? (
                  <div className="space-y-3 px-5 pb-4">
                    {log.request_body ? (
                      <div>
                        <div className="mb-1 text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
                          Request Body
                        </div>
                        <pre className="max-h-[200px] overflow-auto rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] p-3 text-[11px] leading-relaxed text-[var(--track-text-muted)]">
                          {formatBody(log.request_body)}
                        </pre>
                      </div>
                    ) : null}
                    {log.response_body ? (
                      <div>
                        <div className="mb-1 text-[11px] uppercase tracking-[0.04em] text-[var(--track-text-muted)]">
                          Response Body
                        </div>
                        <pre className="max-h-[200px] overflow-auto rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] p-3 text-[11px] leading-relaxed text-[var(--track-text-muted)]">
                          {formatBody(log.response_body)}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
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

function formatBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}
