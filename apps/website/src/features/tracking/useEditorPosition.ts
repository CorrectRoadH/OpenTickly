import { useLayoutEffect, useRef, useState } from "react";
import type { TimeEntryEditorAnchor } from "./time-entry-editor-types.ts";
import { resolveEditorPosition } from "./time-entry-editor-utils.ts";

export function useEditorPosition(anchor: TimeEntryEditorAnchor, picker: "project" | "tag" | null) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number; containerHeight: number }>();
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      const containerHeight =
        window.innerHeight - (element.offsetParent?.getBoundingClientRect().top ?? 0);
      setSize((previous) =>
        previous?.width === width &&
        previous.height === height &&
        previous.containerHeight === containerHeight
          ? previous
          : { width, height, containerHeight },
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [anchor]);
  return {
    ref,
    position: resolveEditorPosition(
      { ...anchor, containerHeight: size?.containerHeight ?? anchor.containerHeight },
      picker,
      size,
    ),
  };
}
