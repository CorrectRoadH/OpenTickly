import { AppPanel } from "@opentoggl/web-ui";
import { type ReactElement } from "react";

type TagDetailPageProps = {
  tagId: number;
  workspaceId: number;
};

export function TagDetailPage({ tagId, workspaceId }: TagDetailPageProps): ReactElement {
  return (
    <AppPanel className="bg-white/95">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Tag details</h1>
        <p className="text-sm leading-6 text-slate-600">
          Workspace {workspaceId} · Tag {tagId}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-emerald-600 hover:text-emerald-800"
          href={`/workspaces/${workspaceId}/tags`}
        >
          Back to tags
        </a>
      </div>
    </AppPanel>
  );
}
