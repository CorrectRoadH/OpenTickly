type ColorSeed = {
  color?: string | null;
  name?: string | null;
};

export const TRACK_COLOR_SWATCHES = [
  "var(--track-project-color-1)",
  "var(--track-project-color-2)",
  "var(--track-project-color-3)",
  "var(--track-project-color-4)",
  "var(--track-project-color-5)",
  "var(--track-project-color-6)",
  "var(--track-project-color-7)",
  "var(--track-project-color-8)",
  "var(--track-project-color-9)",
  "var(--track-project-color-10)",
  "var(--track-project-color-11)",
  "var(--track-project-color-12)",
  "var(--track-project-color-13)",
  "var(--track-project-color-14)",
  "var(--track-project-color-15)",
] as const;

export const DEFAULT_PROJECT_COLOR = TRACK_COLOR_SWATCHES[0];

export function isTrackHexColor(value: string | null | undefined): value is string {
  return Boolean(value && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim()));
}

export function pickTrackColorFromSeed(seed: string): string {
  let hash = 0;

  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return TRACK_COLOR_SWATCHES[hash % TRACK_COLOR_SWATCHES.length];
}

export function resolveProjectColorValue({ color, name }: ColorSeed): string {
  if (isTrackHexColor(color)) {
    return color.trim();
  }

  return pickTrackColorFromSeed(name?.trim() || "project");
}
