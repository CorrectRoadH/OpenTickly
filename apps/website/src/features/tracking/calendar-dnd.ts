import { type PointerEvent as ReactPointerEvent } from "react";

export type CalendarDragGesture =
  | {
      kind: "move";
    }
  | {
      edge: "start" | "end";
      kind: "resize";
    };

export type CalendarDragSession = {
  entryId: number;
  gesture: CalendarDragGesture;
  originClientY: number;
};

export type CalendarDragBindings = {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
};

export function beginCalendarDrag(
  entryId: number,
  gesture: CalendarDragGesture,
  event: ReactPointerEvent<HTMLElement>,
): CalendarDragSession {
  event.preventDefault();
  event.stopPropagation();

  return {
    entryId,
    gesture,
    originClientY: event.clientY,
  };
}

export function resolveCalendarDragMinutes(session: CalendarDragSession, clientY: number): number {
  const deltaPixels = clientY - session.originClientY;
  const quarterHour = 15;
  return Math.round(deltaPixels / quarterHour) * quarterHour;
}

export function bindCalendarDragSession(
  _session: CalendarDragSession,
  onFinish: (clientY: number) => void,
): () => void {
  function handlePointerUp(event: PointerEvent) {
    onFinish(event.clientY);
  }

  window.addEventListener("pointerup", handlePointerUp, { once: true });
  return () => {
    window.removeEventListener("pointerup", handlePointerUp);
  };
}
