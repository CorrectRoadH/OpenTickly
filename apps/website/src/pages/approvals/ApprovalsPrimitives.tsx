import type { ReactElement } from "react";

import { MembersIcon } from "../../shared/ui/icons.tsx";

export function FilterButton({ label }: { label: string }): ReactElement {
  return (
    <button
      className="flex h-7 items-center gap-1 rounded-[6px] border border-[var(--track-border)] px-3 text-[11px] text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
      type="button"
    >
      <MembersIcon className="size-3" />
      {label}
    </button>
  );
}
