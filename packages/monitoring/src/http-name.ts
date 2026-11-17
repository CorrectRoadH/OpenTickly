// Only statically registered API shapes may become telemetry names.
export function httpOperation(method: string, value: unknown, origin: string): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin || url.username || url.password || url.pathname.includes("%")) return;
    const path = url.pathname;
    if (method === "POST") {
      if (path === "/web/v1/auth/login") return "auth.login";
      if (path === "/web/v1/auth/logout") return "auth.logout";
      if (path === "/auth/sso/resolve") return "auth.sso.resolve";
    }
    if (/^\/(?:api\/v9|web\/v1)\/workspaces\/\d+\/projects(?:\/\d+)?$/.test(path))
      return method === "GET"
        ? "project.list"
        : ["POST", "PUT", "PATCH", "DELETE"].includes(method)
          ? "project.save"
          : undefined;
    if (/^\/(?:api\/v9|web\/v1)\/workspaces\/\d+\/clients(?:\/\d+)?$/.test(path))
      return method === "GET"
        ? "client.list"
        : ["POST", "PUT", "PATCH", "DELETE"].includes(method)
          ? "client.save"
          : undefined;
    if (/^\/api\/v9\/(?:me\/|workspaces\/\d+\/)?time_entries(?:\/(?:\d+|current))?$/.test(path)) {
      if (method === "GET") return "time_entry.list";
      if (method === "POST") return "time_entry.create";
      if (["PUT", "PATCH"].includes(method)) return "time_entry.update";
      if (method === "DELETE") return "time_entry.delete";
    }
    if (method === "PATCH" && /^\/api\/v9\/workspaces\/\d+\/time_entries\/\d+\/stop$/.test(path))
      return "timer.stop";
    if (
      ["GET", "POST"].includes(method) &&
      /^\/reports\/api\/v3\/workspace\/\d+\/(?:search|summary|weekly)\/time_entries$/.test(path)
    )
      return "report.load";
  } catch {
    /* Unknown targets retain the generic HTTP operation. */
  }
}
