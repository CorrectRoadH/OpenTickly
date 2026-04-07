import { MinusIcon, PlusIcon } from "../../shared/ui/icons.tsx";

export function CalendarZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
}: {
  zoom: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}) {
  return (
    <div
      className="flex items-center justify-center gap-1 py-2"
      data-testid="calendar-zoom-controls"
    >
      <button
        aria-label="Decrease zoom"
        className="flex size-6 items-center justify-center rounded text-[var(--track-text-soft)] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        disabled={zoom <= -1}
        onClick={onZoomOut}
        type="button"
      >
        <MinusIcon className="size-3" />
      </button>
      <button
        aria-label="Increase zoom"
        className="flex size-6 items-center justify-center rounded text-[var(--track-text-soft)] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        disabled={zoom >= 1}
        onClick={onZoomIn}
        type="button"
      >
        <PlusIcon className="size-3" />
      </button>
    </div>
  );
}
