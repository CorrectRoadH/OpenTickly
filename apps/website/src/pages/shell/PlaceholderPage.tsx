import type { ReactElement } from "react";

/**
 * Placeholder page for features that are not yet implemented.
 * Used by sidebar nav items that would otherwise be disabled stubs.
 */
export function PlaceholderPage({
  description,
  title,
}: {
  description?: string;
  title: string;
}): ReactElement {
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-[var(--track-surface)] text-white"
      data-testid="placeholder-page"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-[21px] font-semibold">{title}</h1>
        {description ? (
          <p className="max-w-[480px] text-[14px] leading-5 text-[var(--track-text-muted)]">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
