import type { ReactElement } from "react";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { resolveTimeEntryProjectId } from "./time-entry-ids.ts";
import { TimerComposerSuggestionsDialog } from "./TimerComposerSuggestionsDialog.tsx";
import type { useTimerComposer } from "./useTimerComposer.ts";
import type { useWorkspaceData } from "./useWorkspaceData.ts";

export function ComposerSuggestionsPortal({
  composer,
  favorites,
  projectOptions,
  recentWorkspaceEntries,
  session,
  tasks,
  workspaceId,
}: {
  composer: ReturnType<typeof useTimerComposer>;
  favorites: Array<{
    description?: string;
    project_id?: number;
    tag_ids?: number[];
    billable?: boolean;
  }>;
  projectOptions: Parameters<typeof TimerComposerSuggestionsDialog>[0]["projects"];
  recentWorkspaceEntries: GithubComTogglTogglApiInternalModelsTimeEntry[];
  session: ReturnType<typeof useWorkspaceData>["session"];
  tasks: Parameters<typeof TimerComposerSuggestionsDialog>[0]["tasks"];
  workspaceId: number;
}): ReactElement {
  return (
    <TimerComposerSuggestionsDialog
      anchor={composer.composerSuggestionsAnchor!}
      currentWorkspaceId={workspaceId}
      favorites={favorites}
      onClose={composer.closeComposerSuggestions}
      onFavoriteSelect={(fav) => {
        composer.setDraftDescription(fav.description ?? "");
        composer.setDraftProjectId(fav.project_id ?? null);
        composer.setDraftTagIds(fav.tag_ids ?? []);
        composer.setDraftBillable(fav.billable ?? false);
        composer.closeComposerSuggestions();
      }}
      query={composer.timerDescriptionValue}
      onProjectSelect={(projectId) => {
        composer.setDraftProjectId(projectId);
        composer.setDraftTaskId(null);
        composer.closeComposerSuggestions();
      }}
      onTaskSelect={(projectId, taskId) => {
        composer.setDraftProjectId(projectId);
        composer.setDraftTaskId(taskId);
        composer.closeComposerSuggestions();
      }}
      onTimeEntrySelect={(entry) => {
        composer.setDraftDescription(entry.description ?? "");
        composer.setDraftProjectId(resolveTimeEntryProjectId(entry));
        composer.setDraftTaskId(entry.task_id ?? null);
        composer.setDraftTagIds(entry.tag_ids ?? []);
        composer.closeComposerSuggestions();
      }}
      onWorkspaceSelect={(nextWorkspaceId) => {
        composer.switchWorkspace(nextWorkspaceId);
        composer.closeComposerSuggestions();
      }}
      projects={projectOptions}
      searchResults={composer.searchedTimeEntries}
      tasks={tasks}
      timeEntries={recentWorkspaceEntries}
      workspaces={session.availableWorkspaces.map((workspace) => ({
        id: workspace.id,
        isCurrent: workspace.isCurrent,
        name: workspace.name,
      }))}
    />
  );
}
