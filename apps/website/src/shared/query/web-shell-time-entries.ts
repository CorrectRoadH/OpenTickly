import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../api/generated/public-track/types.gen.ts";
import { unwrapWebApiResult } from "../api/web-client.ts";
import {
  getCurrentTimeEntry,
  getTimeEntries,
  deleteWorkspaceTimeEntries,
  patchWorkspaceStopTimeEntryHandler,
  postWorkspaceTimeEntries,
  putWorkspaceTimeEntryHandler,
} from "../api/public/track/index.ts";

import { toTrackUtcString } from "./web-shell.ts";

const timeEntriesQueryKey = (startDate?: string, endDate?: string, includeSharing?: boolean) =>
  ["time-entries", startDate ?? null, endDate ?? null, includeSharing ?? false] as const;
const currentTimeEntryQueryKey = ["current-time-entry"] as const;

export function useTimeEntriesQuery(options: {
  endDate?: string;
  includeSharing?: boolean;
  startDate?: string;
}) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        getTimeEntries({
          query: {
            end_date: options?.endDate,
            include_sharing: options?.includeSharing,
            meta: true,
            start_date: options?.startDate,
          },
        }),
      ),
    queryKey: timeEntriesQueryKey(options?.startDate, options?.endDate, options?.includeSharing),
    refetchInterval: 30_000,
  });
}

export function useCurrentTimeEntryQuery() {
  return useQuery({
    queryFn: () => unwrapWebApiResult(getCurrentTimeEntry()),
    queryKey: currentTimeEntryQueryKey,
    retry: false,
    refetchInterval: 30_000,
  });
}

export function useStartTimeEntryMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: {
      billable?: boolean;
      description: string;
      projectColor?: string | null;
      projectId?: number | null;
      projectName?: string | null;
      start: string;
      tagIds?: number[];
      tagNames?: string[];
      taskId?: number | null;
    }) =>
      unwrapWebApiResult(
        postWorkspaceTimeEntries({
          body: {
            billable: request.billable,
            created_with: "opentoggl-web",
            description: request.description,
            duration: -1,
            project_id: request.projectId ?? undefined,
            start: toTrackUtcString(request.start),
            tag_ids: request.tagIds,
            task_id: request.taskId ?? undefined,
            workspace_id: workspaceId,
          },
          path: {
            workspace_id: workspaceId,
          },
        }),
      ),
    onMutate: (request) => {
      const previous =
        queryClient.getQueryData<GithubComTogglTogglApiInternalModelsTimeEntry | null>(
          currentTimeEntryQueryKey,
        );
      const previousLists = queryClient.getQueriesData<
        GithubComTogglTogglApiInternalModelsTimeEntry[]
      >({ queryKey: ["time-entries"] });
      const optimistic: GithubComTogglTogglApiInternalModelsTimeEntry = {
        id: -Date.now(),
        workspace_id: workspaceId,
        wid: workspaceId,
        description: request.description,
        start: request.start,
        duration: -1,
        billable: request.billable ?? false,
        project_id: request.projectId ?? null,
        project_name: request.projectName ?? undefined,
        project_color: request.projectColor ?? undefined,
        tag_ids: request.tagIds ?? [],
        tags: request.tagNames ?? undefined,
        task_id: request.taskId ?? null,
      };
      // setQueryData FIRST so the UI re-renders in the same tick; cancel in the background.
      queryClient.setQueryData(currentTimeEntryQueryKey, optimistic);
      // Auto-stop the previous running entry in all list caches so the UI
      // doesn't show two running blocks while the server round-trips.
      // Toggl's server auto-stops the prior timer on start; this keeps the
      // lists in sync optimistically.
      //
      // NOTE: we intentionally do NOT prepend the new optimistic entry to
      // list caches here. The page may subscribe to multiple ["time-entries"]
      // query instances (e.g. mobile has both a date-ranged query and a
      // recent-entries query). Broadcasting a prepend via setQueriesData
      // duplicates the entry across every cache instance, causing the same
      // description to render in 3+ DOM nodes (strict-mode violation in
      // tests, visual duplication for users). The composer bar already
      // shows the running entry from currentTimeEntryQueryKey; list caches
      // receive the confirmed entry in onSuccess (~200ms later).
      const previousRunningId = previous?.id;
      if (previousRunningId != null) {
        const stopNowIso = request.start;
        queryClient.setQueriesData<GithubComTogglTogglApiInternalModelsTimeEntry[]>(
          { queryKey: ["time-entries"] },
          (old) =>
            old?.map((entry) => {
              if (entry.id !== previousRunningId) return entry;
              const startMs = entry.start ? new Date(entry.start).getTime() : Date.now();
              const stopMs = new Date(stopNowIso).getTime();
              const durationSec = Math.max(0, Math.round((stopMs - startMs) / 1000));
              return { ...entry, stop: stopNowIso, duration: durationSec };
            }),
        );
      }
      void queryClient.cancelQueries({ queryKey: currentTimeEntryQueryKey });
      void queryClient.cancelQueries({ queryKey: ["time-entries"] });
      return { previous, previousLists };
    },
    onError: (_err, _vars, context) => {
      if (!navigator.onLine) return;
      if (context?.previous !== undefined) {
        queryClient.setQueryData(currentTimeEntryQueryKey, context.previous);
      }
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(currentTimeEntryQueryKey, data);
      // Insert the confirmed entry into list caches so the UI is stable
      // across the followup invalidation refetch — without this, the
      // lists would briefly drop the just-started entry before the
      // refetch brings it back.
      queryClient.setQueriesData<GithubComTogglTogglApiInternalModelsTimeEntry[]>(
        { queryKey: ["time-entries"] },
        (old) => {
          if (!old) return old;
          return old.some((e) => e.id === data.id) ? old : [data, ...old];
        },
      );
      await queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      await queryClient.invalidateQueries({ queryKey: currentTimeEntryQueryKey });
    },
  });
}

export function useCreateTimeEntryMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: {
      billable?: boolean;
      description?: string;
      duration: number;
      projectId?: number | null;
      start: string;
      stop: string;
      tagIds?: number[];
      taskId?: number | null;
    }) =>
      unwrapWebApiResult(
        postWorkspaceTimeEntries({
          body: {
            billable: request.billable,
            created_with: "opentoggl-web",
            description: request.description,
            duration: request.duration,
            project_id: request.projectId ?? undefined,
            start: toTrackUtcString(request.start),
            stop: toTrackUtcString(request.stop),
            tag_ids: request.tagIds,
            task_id: request.taskId ?? undefined,
            workspace_id: workspaceId,
          },
          path: {
            workspace_id: workspaceId,
          },
          query: {
            meta: true,
          },
        }),
      ),
    onMutate: (request) => {
      const previousLists = queryClient.getQueriesData<
        GithubComTogglTogglApiInternalModelsTimeEntry[]
      >({ queryKey: ["time-entries"] });

      const optimistic: GithubComTogglTogglApiInternalModelsTimeEntry = {
        id: -Date.now(),
        workspace_id: workspaceId,
        wid: workspaceId,
        description: request.description ?? "",
        start: request.start,
        stop: request.stop,
        duration: request.duration,
        billable: request.billable ?? false,
        project_id: request.projectId ?? null,
        tag_ids: request.tagIds ?? [],
        task_id: request.taskId ?? null,
      };

      // setQueriesData FIRST so the UI re-renders in the same tick; cancel in the background.
      queryClient.setQueriesData<GithubComTogglTogglApiInternalModelsTimeEntry[]>(
        { queryKey: ["time-entries"] },
        (old) => (old ? [optimistic, ...old] : [optimistic]),
      );
      void queryClient.cancelQueries({ queryKey: ["time-entries"] });

      return { previousLists };
    },
    onError: (_err, _vars, context) => {
      if (!navigator.onLine) return;
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["time-entries"],
      });
      await queryClient.invalidateQueries({
        queryKey: currentTimeEntryQueryKey,
      });
    },
  });
}

export function useStopTimeEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ timeEntryId, workspaceId }: { timeEntryId: number; workspaceId: number }) =>
      unwrapWebApiResult(
        patchWorkspaceStopTimeEntryHandler({
          path: {
            time_entry_id: timeEntryId,
            workspace_id: workspaceId,
          },
        }),
      ),
    onMutate: ({ timeEntryId }) => {
      const previous =
        queryClient.getQueryData<GithubComTogglTogglApiInternalModelsTimeEntry | null>(
          currentTimeEntryQueryKey,
        );
      const previousLists = queryClient.getQueriesData<
        GithubComTogglTogglApiInternalModelsTimeEntry[]
      >({ queryKey: ["time-entries"] });

      const nowIso = new Date().toISOString();
      // setQueryData FIRST so the UI re-renders in the same tick; cancel in the background.
      queryClient.setQueryData(currentTimeEntryQueryKey, null);

      // Flip the running entry to a stopped entry in every list so the
      // calendar block and the recent-entries row settle to their final
      // layout on tap instead of re-arranging when the server responds.
      queryClient.setQueriesData<GithubComTogglTogglApiInternalModelsTimeEntry[]>(
        { queryKey: ["time-entries"] },
        (old) =>
          old?.map((entry) => {
            if (entry.id !== timeEntryId) return entry;
            const startMs = entry.start ? new Date(entry.start).getTime() : Date.now();
            const durationSec = Math.max(0, Math.round((Date.now() - startMs) / 1000));
            return { ...entry, stop: nowIso, duration: durationSec };
          }),
      );

      void queryClient.cancelQueries({ queryKey: currentTimeEntryQueryKey });
      void queryClient.cancelQueries({ queryKey: ["time-entries"] });
      return { previous, previousLists };
    },
    onError: (_err, _vars, context) => {
      if (!navigator.onLine) return;
      if (context?.previous !== undefined) {
        queryClient.setQueryData(currentTimeEntryQueryKey, context.previous);
      }
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["time-entries"],
      });
      await queryClient.invalidateQueries({
        queryKey: currentTimeEntryQueryKey,
      });
    },
  });
}

export function useUpdateTimeEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      request,
      timeEntryId,
      workspaceId,
    }: {
      request: {
        billable?: boolean;
        description?: string;
        projectColor?: string | null;
        projectId?: number | null;
        projectName?: string | null;
        start?: string;
        stop?: string;
        tagIds?: number[];
        taskId?: number | null;
      };
      timeEntryId: number;
      workspaceId: number;
    }) =>
      unwrapWebApiResult(
        putWorkspaceTimeEntryHandler({
          // Explicit null on `task_id` is the clearing signal — `?? undefined`
          // would drop it and leave the server-side task_id untouched, which
          // breaks project-switch flows where the stale task belongs to the
          // old project. Upstream Toggl OpenAPI types `task_id` as `number`
          // only, so we cast at this boundary to preserve the null.
          body: {
            billable: request.billable,
            description: request.description,
            project_id: request.projectId === undefined ? undefined : request.projectId,
            start: toTrackUtcString(request.start),
            stop: toTrackUtcString(request.stop),
            tag_ids: request.tagIds,
            task_id:
              request.taskId === undefined ? undefined : (request.taskId as unknown as number),
          },
          path: {
            time_entry_id: timeEntryId,
            workspace_id: workspaceId,
          },
          query: {
            include_sharing: true,
            meta: true,
          },
        }),
      ),
    onMutate: ({ request, timeEntryId }) => {
      // `project_name` / `project_color` are server-denormalized fields
      // that rows render directly (MobileTimeEntryRow reads
      // `entry.project_name`, the list view's ProjectPicker too, not
      // the projects query). On optimistic project change the caller
      // MUST pass the matching `projectName` / `projectColor` — they
      // already hold the picked project object from the picker list.
      // Reading the projects cache from here would be a second, fragile
      // source of truth (cache may be wrapped `{ projects: [...] }` or
      // `{ data: [...] }` instead of a plain Array — see
      // `normalizeProjects` — and/or not yet populated on first paint).
      const applyPatch = (
        entry: GithubComTogglTogglApiInternalModelsTimeEntry,
      ): GithubComTogglTogglApiInternalModelsTimeEntry => ({
        ...entry,
        ...(request.description !== undefined && { description: request.description }),
        ...(request.billable !== undefined && { billable: request.billable }),
        ...(request.projectId !== undefined && {
          project_id: request.projectId,
          project_name: request.projectId === null ? undefined : (request.projectName ?? undefined),
          project_color:
            request.projectId === null ? undefined : (request.projectColor ?? undefined),
        }),
        ...(request.start !== undefined && { start: request.start }),
        ...(request.stop !== undefined && { stop: request.stop }),
        ...(request.tagIds !== undefined && { tag_ids: request.tagIds }),
        ...(request.taskId !== undefined && {
          task_id: request.taskId,
          task_name: request.taskId === null ? undefined : entry.task_name,
        }),
      });

      const previousCurrent = queryClient.getQueryData(currentTimeEntryQueryKey);
      const previousLists = queryClient.getQueriesData<
        GithubComTogglTogglApiInternalModelsTimeEntry[]
      >({ queryKey: ["time-entries"] });

      // setQueryData FIRST so the UI re-renders in the same tick; cancel in the background.
      queryClient.setQueryData(
        currentTimeEntryQueryKey,
        (current: GithubComTogglTogglApiInternalModelsTimeEntry | null | undefined) => {
          if (current?.id !== timeEntryId) return current;
          return applyPatch(current);
        },
      );
      // Optimistically patch the list cache too — without this, list-view
      // mutations (tag toggle, billable, project pick, inline description
      // edit) wait for a full network round-trip + invalidation refetch
      // before the row reflects the change. Same shape as the delete
      // mutation's optimistic list patch below.
      queryClient.setQueriesData<GithubComTogglTogglApiInternalModelsTimeEntry[]>(
        { queryKey: ["time-entries"] },
        (old) => old?.map((entry) => (entry.id === timeEntryId ? applyPatch(entry) : entry)),
      );
      void queryClient.cancelQueries({ queryKey: currentTimeEntryQueryKey });
      void queryClient.cancelQueries({ queryKey: ["time-entries"] });
      return { previousCurrent, previousLists };
    },
    onError: (_err, _vars, context) => {
      if (!navigator.onLine) return;
      if (context?.previousCurrent !== undefined) {
        queryClient.setQueryData(currentTimeEntryQueryKey, context.previousCurrent);
      }
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSuccess: async (data) => {
      // Patch the response data in-place so denormalized fields
      // (project_name, project_color, tag string list) settle from the
      // server WITHOUT a full refetch. The full invalidate that used to
      // run here triggered a list-wide refetch on every keystroke /
      // toggle, which compounded the picker-cascade slowdown.
      queryClient.setQueryData(
        currentTimeEntryQueryKey,
        (current: GithubComTogglTogglApiInternalModelsTimeEntry | null | undefined) =>
          current?.id === data.id ? data : current,
      );
      queryClient.setQueriesData<GithubComTogglTogglApiInternalModelsTimeEntry[]>(
        { queryKey: ["time-entries"] },
        (old) => old?.map((entry) => (entry.id === data.id ? data : entry)),
      );
    },
  });
}

export function useDeleteTimeEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ timeEntryId, workspaceId }: { timeEntryId: number; workspaceId: number }) =>
      unwrapWebApiResult(
        deleteWorkspaceTimeEntries({
          path: {
            time_entry_id: timeEntryId,
            workspace_id: workspaceId,
          },
        }),
      ),
    onMutate: ({ timeEntryId }) => {
      const previousLists = queryClient.getQueriesData<
        GithubComTogglTogglApiInternalModelsTimeEntry[]
      >({ queryKey: ["time-entries"] });
      const previousCurrent = queryClient.getQueryData(currentTimeEntryQueryKey);

      // setQueryData FIRST so the UI re-renders in the same tick; cancel in the background.
      queryClient.setQueriesData<GithubComTogglTogglApiInternalModelsTimeEntry[]>(
        { queryKey: ["time-entries"] },
        (old) => old?.filter((e) => e.id !== timeEntryId),
      );
      queryClient.setQueryData(
        currentTimeEntryQueryKey,
        (current: GithubComTogglTogglApiInternalModelsTimeEntry | null | undefined) =>
          current?.id === timeEntryId ? null : current,
      );
      void queryClient.cancelQueries({ queryKey: ["time-entries"] });
      void queryClient.cancelQueries({ queryKey: currentTimeEntryQueryKey });

      return { previousLists, previousCurrent };
    },
    onError: (_err, _vars, context) => {
      if (!navigator.onLine) return;
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousCurrent !== undefined) {
        queryClient.setQueryData(currentTimeEntryQueryKey, context.previousCurrent);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["time-entries"],
      });
      await queryClient.invalidateQueries({
        queryKey: currentTimeEntryQueryKey,
      });
    },
  });
}
