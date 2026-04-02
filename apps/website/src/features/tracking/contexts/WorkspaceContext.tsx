import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import type { GithubComTogglTogglApiInternalModelsProject } from "../../../shared/api/generated/public-track/types.gen.ts";
import {
  useBulkDeleteTimeEntriesMutation,
  useBulkEditTimeEntriesMutation,
  useDeleteTimeEntryMutation,
  useProjectsQuery,
  useStartTimeEntryMutation,
  useStopTimeEntryMutation,
  useTagsQuery,
  useUpdateTimeEntryMutation,
  useUpdateWebSessionMutation,
} from "../../../shared/query/web-shell.ts";
import { useUserPreferences } from "../../../shared/query/useUserPreferences.ts";
import {
  useSession,
  useSessionActions,
  type SessionSnapshot,
} from "../../../shared/session/session-context.tsx";
import { normalizeProjects, normalizeTags } from "./timer-page-utils.ts";

export interface WorkspaceContextValue {
  workspaceId: number;
  timezone: string;
  session: SessionSnapshot;
  beginningOfWeek: number;
  collapseTimeEntries: boolean;
  durationFormat: "improved" | "classic" | "decimal";

  projectOptions: GithubComTogglTogglApiInternalModelsProject[];
  tagOptions: { id: number; name: string }[];

  startTimeEntryMutation: ReturnType<typeof useStartTimeEntryMutation>;
  stopTimeEntryMutation: ReturnType<typeof useStopTimeEntryMutation>;
  updateTimeEntryMutation: ReturnType<typeof useUpdateTimeEntryMutation>;
  deleteTimeEntryMutation: ReturnType<typeof useDeleteTimeEntryMutation>;
  bulkEditMutation: ReturnType<typeof useBulkEditTimeEntriesMutation>;
  bulkDeleteMutation: ReturnType<typeof useBulkDeleteTimeEntriesMutation>;

  switchWorkspace: (nextWorkspaceId: number) => void;
}

const WorkspaceCtx = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const { setCurrentWorkspaceId } = useSessionActions();
  const workspaceId = session.currentWorkspace.id;
  const timezone = session.user.timezone || "UTC";
  const { beginningOfWeek, collapseTimeEntries, durationFormat } = useUserPreferences();

  const projectsQuery = useProjectsQuery(workspaceId, "all");
  const tagsQuery = useTagsQuery(workspaceId);

  const projectOptions = useMemo(() => normalizeProjects(projectsQuery.data), [projectsQuery.data]);
  const tagOptions = useMemo(() => normalizeTags(tagsQuery.data), [tagsQuery.data]);

  const startTimeEntryMutation = useStartTimeEntryMutation(workspaceId);
  const stopTimeEntryMutation = useStopTimeEntryMutation();
  const updateTimeEntryMutation = useUpdateTimeEntryMutation();
  const deleteTimeEntryMutation = useDeleteTimeEntryMutation();
  const bulkEditMutation = useBulkEditTimeEntriesMutation(workspaceId);
  const bulkDeleteMutation = useBulkDeleteTimeEntriesMutation(workspaceId);
  const updateWebSessionMutation = useUpdateWebSessionMutation();

  const switchWorkspace = useCallback(
    (nextWorkspaceId: number) => {
      const previousWorkspaceId = workspaceId;
      setCurrentWorkspaceId(nextWorkspaceId);
      void updateWebSessionMutation.mutateAsync({ workspace_id: nextWorkspaceId }).catch(() => {
        setCurrentWorkspaceId(previousWorkspaceId);
      });
    },
    [workspaceId, setCurrentWorkspaceId, updateWebSessionMutation],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaceId,
      timezone,
      session,
      beginningOfWeek,
      collapseTimeEntries,
      durationFormat,
      projectOptions,
      tagOptions,
      startTimeEntryMutation,
      stopTimeEntryMutation,
      updateTimeEntryMutation,
      deleteTimeEntryMutation,
      bulkEditMutation,
      bulkDeleteMutation,
      switchWorkspace,
    }),
    [
      workspaceId,
      timezone,
      session,
      beginningOfWeek,
      collapseTimeEntries,
      durationFormat,
      projectOptions,
      tagOptions,
      startTimeEntryMutation,
      stopTimeEntryMutation,
      updateTimeEntryMutation,
      deleteTimeEntryMutation,
      bulkEditMutation,
      bulkDeleteMutation,
      switchWorkspace,
    ],
  );

  return <WorkspaceCtx.Provider value={value}>{children}</WorkspaceCtx.Provider>;
}

export function useWorkspaceContext(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceCtx);
  if (!ctx) {
    throw new Error("WorkspaceProvider is required");
  }
  return ctx;
}
