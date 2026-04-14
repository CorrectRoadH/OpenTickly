import { type ReactElement } from "react";

import { ProjectEditorDialog, type ProjectEditorMode } from "./ProjectEditorDialog.tsx";
import { closeProjectEditor, useProjectEditorStore } from "./project-editor-store.ts";

type ProjectEditorDialogHostProps = {
  onSuccess: (mode: ProjectEditorMode) => void;
};

/**
 * Sibling-of-DirectoryTable host that subscribes to the module-scoped
 * editor store and renders the dialog. Keeping this component separate
 * from ProjectsPage ensures "open dialog" / "close dialog" does not
 * re-render the page shell or the project list table — enforced by
 * `projects-list-rerender.spec.ts`.
 */
export function ProjectEditorDialogHost({
  onSuccess,
}: ProjectEditorDialogHostProps): ReactElement | null {
  const editor = useProjectEditorStore((s) => s.editor);
  if (editor == null) return null;
  return (
    <ProjectEditorDialog
      mode={editor.mode}
      onClose={closeProjectEditor}
      onSuccess={onSuccess}
      project={editor.mode === "edit" ? editor.project : null}
    />
  );
}
