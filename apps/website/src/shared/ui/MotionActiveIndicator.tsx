import { motion } from "motion/react";
import type { ReactElement } from "react";

const activeIndicatorTransition = {
  damping: 40,
  mass: 0.45,
  stiffness: 520,
  type: "spring",
} as const;

// Isolated so the ~39KB gz Motion runtime is code-split out of the eager
// app-shell entry chunk and only fetched when an animated indicator actually
// renders (animations enabled, client-side). Loaded lazily by
// AnimatedActiveIndicator behind a plain <span> fallback.
export default function MotionActiveIndicator({
  className,
  layoutId,
}: {
  className: string;
  layoutId: string;
}): ReactElement {
  return (
    <motion.span
      aria-hidden="true"
      className={className}
      layoutId={layoutId}
      transition={activeIndicatorTransition}
    />
  );
}
