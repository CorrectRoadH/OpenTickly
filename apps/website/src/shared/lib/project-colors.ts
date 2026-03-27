type ColorSeed = {
  color?: string | null;
  name?: string | null;
};

export const TRACK_COLOR_SWATCHES = [
  "#1a4a7f",
  "#7e6cff",
  "#c04a9f",
  "#e28c1c",
  "#d5af1f",
  "#65b741",
  "#85d0ff",
  "#85c05f",
  "#f2a483",
  "#6d7dde",
  "#a85adb",
  "#e4c63d",
  "#7d9a31",
  "#d75a47",
  "#56565c",
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
