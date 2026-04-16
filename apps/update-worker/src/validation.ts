import { z } from "zod";

// Semver-ish: accepts "1.2.3", "1.2.3-rc.1", "dev". Kept permissive because
// self-hosters may run patched/forked builds.
const versionString = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9._+-]+$/, "invalid version characters");

const shortToken = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[A-Za-z0-9._+\-/]+$/, "invalid token characters");

/**
 * Query params for `GET update.opentoggl.com/`. Every field is optional — a
 * bare `GET /` is valid and returns the manifest without any client context.
 * Invalid values are dropped silently rather than 400'd so poorly-configured
 * callers still get an answer.
 */
export const queryParamsSchema = z.object({
  instanceId: z.string().uuid().optional(),
  version: versionString.optional(),
  goVersion: shortToken.optional(),
  os: shortToken.optional(),
  arch: shortToken.optional(),
  locale: shortToken.optional(),
});

export type QueryParams = z.infer<typeof queryParamsSchema>;

/**
 * Parses URLSearchParams loosely: unknown params are ignored, and any field
 * that fails its individual regex is dropped rather than failing the whole
 * request. The endpoint is a read with no side effects (beyond best-effort
 * analytics), so strict validation would only block legitimate traffic.
 */
export function parseQueryParams(params: URLSearchParams): QueryParams {
  const raw: Record<string, string> = {};
  for (const key of ["instanceId", "version", "goVersion", "os", "arch", "locale"]) {
    const v = params.get(key);
    if (v !== null) raw[key] = v;
  }
  const parsed = queryParamsSchema.safeParse(raw);
  if (parsed.success) return parsed.data;

  // Salvage: keep each valid field, drop the bad ones.
  const salvaged: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const one = queryParamsSchema.pick({ [key]: true } as never).safeParse({ [key]: value });
    if (one.success) Object.assign(salvaged, one.data);
  }
  return queryParamsSchema.parse(salvaged);
}
