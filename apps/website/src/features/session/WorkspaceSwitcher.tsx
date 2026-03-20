import { type ChangeEvent, type ReactElement } from "react";

type WorkspaceSwitcherProps = {
  currentWorkspaceId: number;
  onChange: (workspaceId: number) => void;
  workspaces: Array<{
    id: number;
    name: string;
  }>;
};

export function WorkspaceSwitcher({
  currentWorkspaceId,
  onChange,
  workspaces,
}: WorkspaceSwitcherProps): ReactElement {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    onChange(Number(event.target.value));
  }

  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
      Workspace
      <select
        aria-label="Workspace"
        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm"
        onChange={handleChange}
        value={String(currentWorkspaceId)}
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={String(workspace.id)}>
            {workspace.name}
          </option>
        ))}
      </select>
    </label>
  );
}
