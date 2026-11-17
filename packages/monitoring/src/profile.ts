import type { TelemetryConfig } from "./policy.ts";
export interface ProfileManifest {
  release: string;
  assets: Record<string, string[]>;
}
export const validId = (value: unknown, length = 32): value is string =>
  typeof value === "string" &&
  new RegExp(`^[a-f0-9]{${length}}$`).test(value) &&
  !/^0+$/.test(value);
const record = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
const index = (value: unknown, size: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value < size;
const thread = (value: string) => /^(0|[1-9][0-9]*)$/.test(value);
export function artifactPath(value: unknown, origin?: string): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value, origin);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.origin !== origin)
      return;
    return url.pathname;
  } catch {
    return;
  }
}
export function profileManifest(value: unknown, release: string): ProfileManifest | undefined {
  const object = record(value);
  const assets = record(object?.assets);
  if (!assets || object?.release !== release) return;
  const result: ProfileManifest = { release, assets: {} };
  for (const [path, symbols] of Object.entries(assets)) {
    if (
      !path.startsWith("/") ||
      path.includes("?") ||
      path.includes("#") ||
      !Array.isArray(symbols) ||
      !symbols.every((s) => typeof s === "string")
    )
      return;
    Object.defineProperty(result.assets, path, { value: [...symbols], enumerable: true });
  }
  return result;
}
export function sanitizeProfile(
  value: unknown,
  config: TelemetryConfig,
  manifest?: ProfileManifest,
  origin?: string,
) {
  const body = record(value);
  const raw = record(body?.profile);
  if (
    !body ||
    body.version !== "2" ||
    body.platform !== "javascript" ||
    !validId(body.profiler_id) ||
    !validId(body.chunk_id) ||
    !raw
  )
    return;
  const { samples, stacks, frames } = raw;
  const metadata = record(raw.thread_metadata);
  if (
    !Array.isArray(samples) ||
    !samples.length ||
    !Array.isArray(stacks) ||
    !stacks.length ||
    !Array.isArray(frames) ||
    !frames.length ||
    !metadata
  )
    return;
  if (!Object.keys(metadata).every((id) => thread(id) && id === "0")) return;
  const cleanFrames = frames.map((value) => {
    const frame = record(value);
    const path = artifactPath(frame?.abs_path ?? frame?.file, origin);
    const allowed =
      path && manifest?.release === config.release && Object.hasOwn(manifest.assets, path)
        ? manifest.assets[path]
        : undefined;
    if (
      !frame ||
      !path ||
      !allowed ||
      typeof frame.function !== "string" ||
      !allowed.includes(frame.function)
    )
      return { function: "redacted" };
    const clean: {
      function: string;
      abs_path?: string;
      file?: string;
      lineno?: number;
      colno?: number;
      in_app?: boolean;
    } = { function: frame.function };
    if (frame.abs_path !== undefined) clean.abs_path = new URL(path, origin).href;
    if (frame.file !== undefined) clean.file = path;
    for (const key of ["lineno", "colno"] as const) {
      const number = frame[key];
      if (typeof number === "number" && Number.isSafeInteger(number) && number >= 0)
        clean[key] = number;
    }
    if (typeof frame.in_app === "boolean") clean.in_app = frame.in_app;
    return clean;
  });
  const cleanStacks: number[][] = [];
  for (const stack of stacks) {
    if (!Array.isArray(stack) || !stack.every((i) => index(i, frames.length))) return;
    cleanStacks.push([...stack]);
  }
  const cleanSamples: { stack_id: number; thread_id: string; timestamp: number }[] = [];
  for (const value of samples) {
    const sample = record(value);
    if (
      !sample ||
      !index(sample.stack_id, stacks.length) ||
      typeof sample.timestamp !== "number" ||
      !Number.isFinite(sample.timestamp) ||
      sample.timestamp < 0 ||
      typeof sample.thread_id !== "string" ||
      !thread(sample.thread_id) ||
      !Object.hasOwn(metadata, sample.thread_id)
    )
      return;
    cleanSamples.push({
      stack_id: sample.stack_id,
      thread_id: sample.thread_id,
      timestamp: sample.timestamp,
    });
  }
  const images = record(body.debug_meta)?.images;
  const cleanImages = Array.isArray(images)
    ? images.flatMap((value) => {
        const image = record(value);
        const path = artifactPath(image?.code_file, origin);
        return image?.type === "sourcemap" &&
          typeof image.debug_id === "string" &&
          /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(image.debug_id) &&
          path &&
          manifest?.release === config.release &&
          Object.hasOwn(manifest.assets, path)
          ? [
              {
                type: "sourcemap" as const,
                debug_id: image.debug_id,
                code_file: new URL(path, origin).href,
              },
            ]
          : [];
      })
    : [];
  return {
    version: "2",
    platform: "javascript",
    profiler_id: body.profiler_id,
    chunk_id: body.chunk_id,
    release: config.release,
    environment: config.environment,
    client_sdk: { name: "sentry.javascript.react", version: "11.12.0" },
    debug_meta: { images: cleanImages },
    profile: {
      samples: cleanSamples,
      stacks: cleanStacks,
      frames: cleanFrames,
      thread_metadata: Object.fromEntries(
        Object.keys(metadata).map((id) => [id, { name: "main" }]),
      ),
    },
  };
}
