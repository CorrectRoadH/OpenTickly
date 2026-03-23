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
    <label className="block">
      <span className="sr-only">Workspace</span>
      <select
        aria-label="Workspace"
        className="h-10 w-full rounded-lg border border-white/8 bg-[#141416] px-3 text-sm font-medium text-white outline-none transition focus:border-[#b36cb8]"
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
