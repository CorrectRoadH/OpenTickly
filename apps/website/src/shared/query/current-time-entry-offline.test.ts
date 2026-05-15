/* @vitest-environment jsdom */
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it } from "vitest";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../api/generated/public-track/types.gen.ts";

import { installCurrentTimeEntryOfflinePersistence } from "./current-time-entry-offline.ts";
import { currentTimeEntryQueryKey } from "./web-shell-time-entries.ts";

const STORAGE_KEY = "opentoggl:offline:current-time-entry";

function makeRunningEntry(
  overrides?: Partial<GithubComTogglTogglApiInternalModelsTimeEntry>,
): GithubComTogglTogglApiInternalModelsTimeEntry {
  return {
    id: 1001,
    workspace_id: 123,
    wid: 123,
    description: "Offline-safe timer",
    start: "2026-05-15T08:00:00Z",
    duration: -1,
    billable: false,
    tag_ids: [],
    project_id: null,
    task_id: null,
    ...overrides,
  };
}

function createClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

describe("current time entry offline persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("persists the running entry whenever the current timer cache changes", () => {
    const queryClient = createClient();
    installCurrentTimeEntryOfflinePersistence(queryClient);

    queryClient.setQueryData(currentTimeEntryQueryKey, makeRunningEntry());

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored.entry.description).toBe("Offline-safe timer");
    expect(stored.entry.stop).toBeUndefined();
  });

  it("removes the persisted timer when the current entry is stopped or cleared", () => {
    const queryClient = createClient();
    installCurrentTimeEntryOfflinePersistence(queryClient);

    queryClient.setQueryData(currentTimeEntryQueryKey, makeRunningEntry());
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    queryClient.setQueryData(currentTimeEntryQueryKey, null);

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("hydrates a fresh query client from the persisted running entry", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        entry: makeRunningEntry({ description: "Recovered after offline restart" }),
        savedAt: "2026-05-15T08:01:00Z",
        version: 1,
      }),
    );

    const queryClient = createClient();
    installCurrentTimeEntryOfflinePersistence(queryClient);

    const hydrated =
      queryClient.getQueryData<GithubComTogglTogglApiInternalModelsTimeEntry>(
        currentTimeEntryQueryKey,
      );
    expect(hydrated?.description).toBe("Recovered after offline restart");
  });
});
