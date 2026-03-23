import { type ChangeEvent, type ReactElement } from "react";

import { TrackingIcon } from "../tracking/tracking-icons.tsx";

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
    <label className="relative block w-full">
      <span className="sr-only">Workspace</span>
      <select
        aria-label="Workspace"
        className="h-9 w-full appearance-none rounded-lg border border-transparent bg-[var(--track-panel)] px-3 pr-9 text-[16px] font-semibold text-white outline-none transition hover:bg-[#111111] focus:border-[var(--track-accent-soft)]"
        onChange={handleChange}
        value={String(currentWorkspaceId)}
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={String(workspace.id)}>
            {workspace.name}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--track-text-muted)]">
        <TrackingIcon className="size-4" name="chevron-down" />
      </span>
    </label>
  );
}
