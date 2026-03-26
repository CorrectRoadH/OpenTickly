import type { ReactElement } from "react";

import { TrackingIcon } from "./tracking-icons.tsx";

export function GoalsFavoritesSidebar(): ReactElement {
  return (
    <div
      className="flex w-[220px] shrink-0 flex-col border-l border-[var(--track-border)] bg-[var(--track-surface)]"
      data-testid="goals-favorites-sidebar"
    >
      <SidebarSection title="Goals" />
      <SidebarSection title="Favorites" />
    </div>
  );
}

function SidebarSection({ title }: { title: string }): ReactElement {
  return (
    <details className="group" open>
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-[13px] font-medium text-white select-none">
        <TrackingIcon
          className="size-3 text-[var(--track-text-muted)] transition group-open:rotate-90"
          name="chevron-right"
        />
        <span className="flex-1">{title}</span>
        <button
          aria-label={`Add ${title.toLowerCase()}`}
          className="flex size-5 items-center justify-center rounded text-[var(--track-text-muted)] transition hover:bg-[var(--track-row-hover)] hover:text-white"
          onClick={(e) => e.stopPropagation()}
          type="button"
        >
          <TrackingIcon className="size-3" name="plus" />
        </button>
      </summary>
      <div className="px-4 pb-3 text-[12px] text-[var(--track-text-muted)]">
        No {title.toLowerCase()} yet
      </div>
    </details>
  );
}
