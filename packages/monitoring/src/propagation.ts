/** One finite allowlist shared by SDK injection and the outer redirect guard. */
export function browserTargets(component: "web" | "landing", origin: string): RegExp[] {
  if (component === "landing") return [];
  const parsed = new URL(origin);
  if (parsed.origin !== origin || parsed.username || parsed.password) return [];
  const escaped = origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [
    new RegExp(
      `^${escaped}/(?!api/v9/desktop_login(?:/|[?#]|$))(?!(?:[^?#]*%))(?:(?:web/v1|api/v9|reports/api/v3|insights/api/v1|import/v1|admin/v1|webhooks/api/v1)(?:/[^?#]*)?|auth/sso/resolve)(?:[?#].*)?$`,
    ),
  ];
}

const guarded = new WeakSet<typeof fetch>();
export function installFetchGuard(
  host: { fetch: typeof fetch },
  targets: RegExp[],
  origin: string,
) {
  if (guarded.has(host.fetch) || targets.length === 0) return;
  const original = host.fetch;
  const guard: typeof fetch = function (input, init) {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    let allowed = false;
    try {
      const url = new URL(raw, origin);
      allowed = !url.username && !url.password && targets.some((target) => target.test(url.href));
    } catch {
      /* Let native fetch report malformed input. */
    }
    if (!allowed) return original.call(host, input, init);
    const redirect = init?.redirect ?? (input instanceof Request ? input.redirect : "follow");
    return original.call(host, input, {
      ...init,
      redirect: redirect === "manual" ? "manual" : "error",
    });
  };
  guarded.add(guard);
  host.fetch = guard;
}
