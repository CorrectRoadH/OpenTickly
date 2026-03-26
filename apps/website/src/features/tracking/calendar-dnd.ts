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

export function beginCalendarDrag(
  entryId: number,
  gesture: CalendarDragGesture,
  event: ReactPointerEvent<HTMLElement>,
): CalendarDragSession {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.setPointerCapture?.(event.pointerId);

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
