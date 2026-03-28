import type {
  InstanceHealth,
  InstanceUserList,
  RegistrationPolicy,
  InstanceConfig,
  OrganizationList,
} from "./generated/admin/types.gen.ts";

class AdminApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  const response = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new AdminApiError(text || response.statusText, response.status);
  }
  return response.json() as Promise<T>;
}

export function fetchInstanceHealth(): Promise<InstanceHealth> {
  return adminFetch("/admin/v1/health");
}

export function fetchRegistrationPolicy(): Promise<RegistrationPolicy> {
  return adminFetch("/admin/v1/registration-policy");
}

export function updateRegistrationPolicyApi(mode: string): Promise<RegistrationPolicy> {
  return adminFetch("/admin/v1/registration-policy", {
    method: "PUT",
    body: JSON.stringify({ mode }),
  });
}

export function fetchInstanceUsers(params?: {
  status?: string;
  query?: string;
  page?: number;
  per_page?: number;
}): Promise<InstanceUserList> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.query) search.set("query", params.query);
  if (params?.page) search.set("page", String(params.page));
  if (params?.per_page) search.set("per_page", String(params.per_page));
  const qs = search.toString();
  return adminFetch(`/admin/v1/users${qs ? `?${qs}` : ""}`);
}

export function disableInstanceUserApi(userId: number): Promise<unknown> {
  return adminFetch(`/admin/v1/users/${userId}/disable`, { method: "POST" });
}

export function restoreInstanceUserApi(userId: number): Promise<unknown> {
  return adminFetch(`/admin/v1/users/${userId}/restore`, { method: "POST" });
}

export function fetchInstanceConfig(): Promise<InstanceConfig> {
  return adminFetch("/admin/v1/config");
}

export function updateInstanceConfigApi(body: Record<string, unknown>): Promise<InstanceConfig> {
  return adminFetch("/admin/v1/config", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function fetchOrganizations(): Promise<OrganizationList> {
  return adminFetch("/admin/v1/organizations");
}

export type InstanceVersionInfo = {
  current_version: string;
  latest_version?: string;
  update_available: boolean;
  release_url?: string;
  changelog_url: string;
};

export function fetchInstanceVersion(): Promise<InstanceVersionInfo> {
  return adminFetch("/admin/v1/version");
}

export function sendTestEmailApi(to: string): Promise<{ success: boolean; message: string }> {
  return adminFetch("/admin/v1/config/test-email", {
    method: "POST",
    body: JSON.stringify({ to }),
  });
}
