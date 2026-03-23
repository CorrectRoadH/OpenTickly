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
        className="h-9 w-full appearance-none rounded-lg border border-transparent bg-[#0d0d0d] px-[7px] pr-9 text-[16px] leading-[22.88px] font-semibold text-white outline-none transition hover:bg-[#121212] focus:border-[#472443]"
        onChange={handleChange}
        value={String(currentWorkspaceId)}
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={String(workspace.id)}>
            {workspace.name}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-[13px] flex items-center text-[#a4a4a4]">
        <TrackingIcon className="size-4" name="chevron-down" />
      </span>
    </label>
  );
}
