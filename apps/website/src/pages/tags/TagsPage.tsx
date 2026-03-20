import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type FormEvent, type ReactElement, useState } from "react";

import { useCreateTagMutation, useTagsQuery } from "../../shared/query/web-shell.ts";
import { useSession } from "../../shared/session/session-context.tsx";

export function TagsPage(): ReactElement {
  const session = useSession();
  const tagsQuery = useTagsQuery(session.currentWorkspace.id);
  const createTagMutation = useCreateTagMutation(session.currentWorkspace.id);
  const [tagName, setTagName] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  if (tagsQuery.isPending) {
    return (
      <AppPanel className="bg-white/95">
        <p className="text-sm text-slate-600">Loading tags…</p>
      </AppPanel>
    );
  }

  const tags = tagsQuery.data?.tags ?? [];
  const activeCount = tags.filter((tag) => tag.active).length;

  async function handleCreateTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await createTagMutation.mutateAsync({
      workspace_id: session.currentWorkspace.id,
      name: tagName,
    });
    setTagName("");
    setStatus("Tag created");
  }

  return (
    <AppPanel className="bg-white/95">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Tags</h1>
          <p className="text-sm leading-6 text-slate-600">
            Contract-backed tag records reuse the project-page list skeleton while staying a
            distinct product object.
          </p>
        </div>
        <AppButton type="button">Create tag</AppButton>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3" onSubmit={handleCreateTag}>
        <label className="flex min-w-[18rem] flex-col gap-2 text-sm font-medium text-slate-700">
          Tag name
          <input
            className="rounded-2xl border border-slate-300 px-4 py-3"
            value={tagName}
            onChange={(event) => setTagName(event.target.value)}
          />
        </label>
        <AppButton type="submit">Save tag</AppButton>
        {status ? <p className="text-sm font-medium text-emerald-700">{status}</p> : null}
      </form>

      <ul className="mt-6 divide-y divide-slate-200" aria-label="Tags list">
        {tags.map((tag) => {
          const statusLabel = tag.active ? "Active" : "Inactive";

          return (
            <li key={tag.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{tag.name}</p>
                <p className="text-xs text-slate-600">Contract-backed tag · {statusLabel}</p>
                <p className="text-[11px] text-slate-500">Workspace {tag.workspace_id}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {statusLabel}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p>
          This placeholder slice exposes {tags.length} tag{tags.length === 1 ? "" : "s"} for
          workspace {session.currentWorkspace.id}, with {activeCount} active.
        </p>
      </div>
    </AppPanel>
  );
}
