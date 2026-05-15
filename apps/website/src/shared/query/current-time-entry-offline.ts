import type { QueryClient } from "@tanstack/react-query";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../api/generated/public-track/types.gen.ts";

import { currentTimeEntryQueryKey } from "./web-shell-time-entries.ts";

const STORAGE_KEY = "opentoggl:offline:current-time-entry";
const STORAGE_VERSION = 1;

type StoredCurrentTimeEntry = {
  entry: GithubComTogglTogglApiInternalModelsTimeEntry;
  savedAt: string;
  version: typeof STORAGE_VERSION;
};

function isBrowserStorageAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isRunningEntry(
  entry: GithubComTogglTogglApiInternalModelsTimeEntry | null | undefined,
): entry is GithubComTogglTogglApiInternalModelsTimeEntry {
  return entry != null && entry.stop == null && typeof entry.start === "string";
}

function readStoredCurrentTimeEntry():
  | GithubComTogglTogglApiInternalModelsTimeEntry
  | null
  | undefined {
  if (!isBrowserStorageAvailable()) return undefined;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredCurrentTimeEntry>;
    if (parsed.version !== STORAGE_VERSION || !isRunningEntry(parsed.entry)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed.entry;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function writeStoredCurrentTimeEntry(
  entry: GithubComTogglTogglApiInternalModelsTimeEntry | null | undefined,
): void {
  if (!isBrowserStorageAvailable()) return;

  try {
    if (!isRunningEntry(entry)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const payload: StoredCurrentTimeEntry = {
      entry,
      savedAt: new Date().toISOString(),
      version: STORAGE_VERSION,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage can be unavailable or full; the in-memory query cache still works.
  }
}

export function installCurrentTimeEntryOfflinePersistence(queryClient: QueryClient): void {
  const storedEntry = readStoredCurrentTimeEntry();
  if (
    storedEntry &&
    queryClient.getQueryData<GithubComTogglTogglApiInternalModelsTimeEntry | null>(
      currentTimeEntryQueryKey,
    ) === undefined
  ) {
    queryClient.setQueryData(currentTimeEntryQueryKey, storedEntry);
  }

  queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== "updated") return;
    if (event.query.queryHash !== JSON.stringify(currentTimeEntryQueryKey)) return;

    writeStoredCurrentTimeEntry(
      event.query.state.data as GithubComTogglTogglApiInternalModelsTimeEntry | null | undefined,
    );
  });
}
