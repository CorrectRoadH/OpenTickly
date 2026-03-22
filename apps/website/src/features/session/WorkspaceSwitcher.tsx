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
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
      Workspace
      <select
        aria-label="Workspace"
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
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
