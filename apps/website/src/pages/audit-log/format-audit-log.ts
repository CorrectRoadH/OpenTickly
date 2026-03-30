type ParsedAction = {
  method: string;
  entityType: string;
  entityId: string | null;
  subResource: string | null;
};

function parseAction(action: string): ParsedAction | null {
  const match = action.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(.+)$/);
  if (!match) return null;

  const method = match[1];
  const path = match[2];

  // Strip /api/v9/ or /web/v1/ prefix, then workspaces/{id}/
  const trimmed = path.replace(/^\/(api\/v9|web\/v1)\//, "").replace(/^workspaces\/\d+\//, "");

  const parts = trimmed.split("/");

  // e.g. ["time_entries", "6048"] or ["time_entries", "6048", "stop"]
  // or ["projects"] or ["projects", "123"]
  const entityType = parts[0] ?? "";
  const entityId = parts[1] && /^\d+$/.test(parts[1]) ? parts[1] : null;
  const subResource = entityId && parts[2] ? parts[2] : null;

  return { method, entityType, entityId, subResource };
}

const entityLabels: Record<string, string> = {
  time_entries: "time entry",
  projects: "project",
  clients: "client",
  tags: "tag",
  tasks: "task",
  groups: "group",
  workspaces: "workspace",
  organizations: "organization",
  workspace_users: "workspace member",
  organization_users: "organization member",
  invitations: "invitation",
  alerts: "alert",
  timesheet_setups: "timesheet setup",
  timesheets: "timesheet",
  preferences: "preferences",
  subscriptions: "subscription",
  lost_passwords: "password reset",
};

function entityLabel(type: string): string {
  return entityLabels[type] ?? type.replace(/_/g, " ");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatAuditTitle(
  action: string,
  requestBody: string,
  metadata?: string,
): { title: string; details: ChangeDetail[] } {
  const parsed = parseAction(action);
  if (!parsed) return { title: action, details: [] };

  const { method, entityType, subResource } = parsed;
  const label = entityLabel(entityType);

  // Sub-resource actions like POST .../time_entries/123/stop
  if (subResource) {
    return { title: `${capitalize(subResource)} ${label}`, details: [] };
  }

  // Time entry specific: detect start/stop/update semantics from request
  if (entityType === "time_entries" && method === "PUT") {
    const changes = parseChangeSummary(requestBody);
    if (changes.length === 1 && changes[0].startsWith("duration")) {
      return { title: `Stopped ${label}`, details: [] };
    }
  }

  const details = formatAuditDetails(requestBody, metadata);

  let title: string;
  switch (method) {
    case "POST":
      title = `Created ${label}`;
      break;
    case "PUT":
    case "PATCH":
      title = `Updated ${label}`;
      break;
    case "DELETE":
      title = `Deleted ${label}`;
      break;
    default:
      title = `${method} ${label}`;
  }
  return { title, details };
}

type ChangeDetail = {
  field: string;
  oldValue?: string;
  newValue: string;
};

const fieldLabels: Record<string, string> = {
  description: "Description",
  project_id: "Project",
  task_id: "Task",
  tag_ids: "Tags",
  tags: "Tags",
  billable: "Billable",
  start: "Start time",
  stop: "Stop time",
  duration: "Duration",
  created_with: "Created with",
  workspace_id: "Workspace",
  user_id: "User",
  wid: "Workspace",
  pid: "Project",
  tid: "Task",
  tag_action: "Tag action",
  name: "Name",
  color: "Color",
  active: "Active",
  is_private: "Private",
  auto_estimates: "Auto estimates",
  estimated_hours: "Estimated hours",
  rate: "Rate",
  currency: "Currency",
  at: "Updated at",
  server_deleted_at: "Deleted at",
};

function fieldLabel(key: string): string {
  return fieldLabels[key] ?? key.replace(/_/g, " ");
}

const ignoredFields = new Set([
  "id",
  "at",
  "server_deleted_at",
  "created_with",
  "uid",
  "guid",
  "wid",
]);

function parseChangeSummary(requestBody: string): string[] {
  if (!requestBody) return [];
  try {
    const body = JSON.parse(requestBody) as Record<string, unknown>;
    return Object.keys(body).filter((k) => !ignoredFields.has(k));
  } catch {
    return [];
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "(empty)";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (value.length === 0) return "(none)";
    return value.join(", ");
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    // ISO date
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return new Date(value).toLocaleString();
    }
    return value;
  }
  return JSON.stringify(value);
}

// Maps API request field names to DB column names (for row_to_json snapshots).
const apiToDbColumn: Record<string, string> = {
  start: "start_time",
  stop: "stop_time",
  duration: "duration_seconds",
  project_id: "project_id",
  task_id: "task_id",
  description: "description",
  billable: "billable",
  tag_ids: "tag_ids",
  tags: "tag_ids",
  name: "name",
  color: "color",
  active: "active",
  is_private: "is_private",
};

function parsePrevious(metadata: string): Record<string, unknown> | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata) as { previous?: Record<string, unknown> };
    return parsed.previous ?? null;
  } catch {
    return null;
  }
}

export function formatAuditDetails(requestBody: string, metadata?: string): ChangeDetail[] {
  if (!requestBody) return [];
  try {
    const body = JSON.parse(requestBody) as Record<string, unknown>;
    const previous = parsePrevious(metadata ?? "");

    return Object.entries(body)
      .filter(([key]) => !ignoredFields.has(key))
      .map(([key, value]) => {
        const detail: ChangeDetail = {
          field: fieldLabel(key),
          newValue: formatValue(value),
        };
        if (previous) {
          const dbCol = apiToDbColumn[key] ?? key;
          if (dbCol in previous) {
            detail.oldValue = formatValue(previous[dbCol]);
          }
        }
        return detail;
      });
  } catch {
    return [];
  }
}
