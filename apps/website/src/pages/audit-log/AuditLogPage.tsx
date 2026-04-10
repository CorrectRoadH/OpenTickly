import { type ReactElement, type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DirectorySurfaceMessage,
  DirectoryTable,
  type DirectoryTableColumn,
  SelectDropdown,
} from "@opentoggl/web-ui";
import { useQuery } from "@tanstack/react-query";

import { getAuditLogs } from "../../shared/api/public/track/index.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import { AuditLogIcon } from "../../shared/ui/icons.tsx";
import { formatAuditTitle } from "./format-audit-log.ts";

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
  metadata?: string;
  created_at: string;
};

type SourceFilter = "" | "web" | "api";

function toRFC3339(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function defaultFrom(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return toRFC3339(date);
}

function defaultTo(): string {
  return toRFC3339(new Date());
}

function sourceLabel(source: string, t: (key: string) => string): string {
  if (source === "web") return t("webCookie");
  if (source === "api") return t("apiTokenCli");
  return source || "-";
}

const auditLogColumns = (t: (key: string) => string): DirectoryTableColumn[] => [
  { key: "action", label: t("action"), width: "minmax(0,1fr)" },
  { key: "source", label: t("source"), width: "80px" },
  { key: "entityType", label: t("entityType"), width: "120px" },
  { key: "entityId", label: t("entityId"), width: "80px" },
  { key: "time", label: t("time"), width: "180px" },
];

export function AuditLogPage(): ReactElement {
  const { t } = useTranslation("auditLog");
  const session = useSession();
  const organizationId = session.currentOrganization?.id;
  const workspaceId = session.currentWorkspace.id;

  const [pageNumber, setPageNumber] = useState(1);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("");
  const [expandedIds, setExpandedIds] = useState<Set<number | string>>(new Set());
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
    return <DirectorySurfaceMessage message={t("noOrganizationAvailable")} />;
  }

  if (auditLogsQuery.isPending) {
    return <DirectorySurfaceMessage message={t("loadingAuditLogs")} />;
  }

  if (auditLogsQuery.isError) {
    return <DirectorySurfaceMessage message={t("unableToLoadAuditLogs")} tone="error" />;
  }

  const logs = auditLogsQuery.data;

  function renderAuditLogRow(log: AuditLogEntry): ReactNode {
    const { title, details } = formatAuditTitle(log.action, log.request_body, log.metadata);
    return (
      <>
        <div className="flex min-h-[46px] flex-col justify-center py-1.5">
          <span className="text-[12px] text-white">{title}</span>
          {details.length > 0 ? (
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
              {details.map((d) => (
                <span className="text-[10px]" key={d.field}>
                  <span className="text-[var(--track-text-muted)]">{d.field}: </span>
                  {d.oldValue !== undefined && d.oldValue !== d.newValue ? (
                    <>
                      <span className="text-red-400/70 line-through">{d.oldValue}</span>
                      <span className="mx-0.5 text-[var(--track-text-muted)]">&rarr;</span>
                      <span className="text-green-400">{d.newValue}</span>
                    </>
                  ) : (
                    <span className="text-white">{d.newValue}</span>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[10px] text-[var(--track-text-muted)]">{log.action}</span>
          )}
        </div>
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
            {sourceLabel(log.source, t)}
          </span>
        </div>
        <div className="flex h-[46px] items-center text-[12px] text-[var(--track-text-muted)]">
          {log.entity_type}
        </div>
        <div className="flex h-[46px] items-center text-[12px] text-[var(--track-text-muted)]">
          {log.entity_id ?? "-"}
        </div>
        <div className="flex h-[46px] items-center text-[12px] text-[var(--track-text-muted)]">
          {new Date(log.created_at).toLocaleString()}
        </div>
      </>
    );
  }

  return (
    <div
      className="w-full min-w-0 bg-[var(--track-surface)] text-white"
      data-testid="audit-log-page"
    >
      <header className="border-b border-[var(--track-border)]">
        <div className="flex min-h-[66px] items-center px-5 py-3">
          <h1 className="text-[20px] font-semibold leading-[30px] text-white">{t("auditLog")}</h1>
        </div>
        <div className="flex min-h-[46px] flex-wrap items-center gap-4 border-t border-[var(--track-border)] px-5 py-2">
          <SelectDropdown
            aria-label={t("sourceFilter")}
            onChange={(v) => {
              setSourceFilter(v as SourceFilter);
              setPageNumber(1);
            }}
            options={[
              { value: "", label: t("allSources") },
              { value: "web", label: t("webCookie") },
              { value: "api", label: t("apiTokenCli") },
            ]}
            value={sourceFilter}
          />
        </div>
      </header>

      <DirectoryTable
        columns={auditLogColumns(t)}
        data-testid="audit-log-list"
        emptyIcon={<AuditLogIcon className="size-5" />}
        emptyTitle={t("noAuditLogEntries")}
        expandable
        expandedIds={expandedIds}
        onToggleExpand={(id) => {
          const log = logs.find((l) => l.id === id);
          if (!log?.request_body && !log?.response_body) return;
          setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          });
        }}
        renderExpandedContent={(log) => (
          <div className="space-y-3 pb-4">
            {log.request_body ? (
              <details className="group" open>
                <summary className="cursor-pointer text-[11px] text-[var(--track-text-muted)] hover:text-white">
                  {t("request")}
                </summary>
                <pre className="mt-1 max-h-[200px] overflow-auto rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] p-3 text-[11px] leading-relaxed text-[var(--track-text-muted)]">
                  {formatBody(log.request_body)}
                </pre>
              </details>
            ) : null}
            {log.response_body ? (
              <details className="group">
                <summary className="cursor-pointer text-[11px] text-[var(--track-text-muted)] hover:text-white">
                  {t("response")}
                </summary>
                <pre className="mt-1 max-h-[200px] overflow-auto rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] p-3 text-[11px] leading-relaxed text-[var(--track-text-muted)]">
                  {formatBody(log.response_body)}
                </pre>
              </details>
            ) : null}
          </div>
        )}
        renderRow={renderAuditLogRow}
        rowKey={(log) => log.id}
        rows={logs}
        footer={
          <span>
            {t("page")} {pageNumber}
          </span>
        }
        pagination={
          <div className="flex justify-end gap-2 border-t border-[var(--track-border)] px-5 py-3">
            <button
              className="rounded-[6px] border border-[var(--track-border)] px-3 py-1 text-[11px] text-[var(--track-text-muted)] hover:text-white disabled:opacity-40"
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((p) => p - 1)}
              type="button"
            >
              {t("previous")}
            </button>
            <button
              className="rounded-[6px] border border-[var(--track-border)] px-3 py-1 text-[11px] text-[var(--track-text-muted)] hover:text-white disabled:opacity-40"
              disabled={logs.length < pageSize}
              onClick={() => setPageNumber((p) => p + 1)}
              type="button"
            >
              {t("next")}
            </button>
          </div>
        }
      />
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
