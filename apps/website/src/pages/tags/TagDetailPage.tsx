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
          Formal detail entry point for workspace tags.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          Workspace {workspaceId}
        </span>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
          Tag {tagId}
        </span>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">
          This entry point keeps the formal tag route stable while the workspace directory remains
          the canonical place to review and update tag records.
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Return to the tags directory to create records, switch status views, and open another tag
          detail route.
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
