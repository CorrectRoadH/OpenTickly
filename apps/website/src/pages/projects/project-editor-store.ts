import { create } from "zustand";

import type { GithubComTogglTogglApiInternalModelsProject } from "../../shared/api/generated/public-track/types.gen.ts";

export type ProjectEditorState =
  | { mode: "create" }
  | { mode: "edit"; project: GithubComTogglTogglApiInternalModelsProject }
  | null;

type ProjectEditorStore = {
  editor: ProjectEditorState;
  openCreate: () => void;
  openEdit: (project: GithubComTogglTogglApiInternalModelsProject) => void;
  close: () => void;
};

/**
 * Module-scoped store for the ProjectsPage editor dialog. Keeping this
 * state out of ProjectsPage (and out of any component that renders the
 * DirectoryTable) is what prevents "open dialog"/"close dialog" from
 * cascading a re-render into every project row. Actions are stable
 * references, safe to wire directly to `onClick`.
 */
export const useProjectEditorStore = create<ProjectEditorStore>((set) => ({
  close: () => set({ editor: null }),
  editor: null,
  openCreate: () => set({ editor: { mode: "create" } }),
  openEdit: (project) => set({ editor: { mode: "edit", project } }),
}));

export const openCreateProjectEditor = () => useProjectEditorStore.getState().openCreate();
export const openEditProjectEditor = (project: GithubComTogglTogglApiInternalModelsProject) =>
  useProjectEditorStore.getState().openEdit(project);
export const closeProjectEditor = () => useProjectEditorStore.getState().close();
