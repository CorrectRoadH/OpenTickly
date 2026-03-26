import type { GithubComTogglTogglApiInternalModelsProject } from "../../shared/api/generated/public-track/types.gen.ts";
import { resolveProjectColorValue } from "../../shared/lib/project-colors.ts";

export type ClientStatusFilter = "active" | "all" | "inactive";

export type ClientListItem = {
  active?: boolean | null;
  archived?: boolean | null;
  id: number;
  name: string;
  wid?: number | null;
  workspace_id?: number | null;
};

export function normalizeClients(data: unknown): ClientListItem[] {
  if (Array.isArray(data)) {
    return data as ClientListItem[];
  }

  if (hasClientArray(data, "clients")) {
    return data.clients;
  }

  if (hasClientArray(data, "data")) {
    return data.data;
  }

  return [];
}

export function normalizeProjects(data: unknown): GithubComTogglTogglApiInternalModelsProject[] {
  if (Array.isArray(data)) {
    return data as GithubComTogglTogglApiInternalModelsProject[];
  }

  if (hasProjectArray(data, "projects")) {
    return data.projects;
  }

  if (hasProjectArray(data, "data")) {
    return data.data;
  }

  return [];
}

export function isClientActive(client: ClientListItem): boolean {
  if (typeof client.archived === "boolean") {
    return !client.archived;
  }

  return client.active !== false;
}

export function resolveProjectColor(project: GithubComTogglTogglApiInternalModelsProject): string {
  return resolveProjectColorValue(project);
}

export function emptyStateTitle(statusFilter: ClientStatusFilter): string {
  if (statusFilter === "active") {
    return "No active clients match this view.";
  }

  if (statusFilter === "inactive") {
    return "No inactive clients match this view.";
  }

  return "No clients in this workspace yet.";
}

function hasClientArray(
  value: unknown,
  key: "clients" | "data",
): value is Record<typeof key, ClientListItem[]> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>)[key])
  );
}

function hasProjectArray(
  value: unknown,
  key: "data" | "projects",
): value is Record<typeof key, GithubComTogglTogglApiInternalModelsProject[]> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>)[key])
  );
}
