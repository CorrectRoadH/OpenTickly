import { motion } from "motion/react";
import type { ReactElement } from "react";

const activeIndicatorTransition = {
  damping: 40,
  mass: 0.45,
  stiffness: 520,
  type: "spring",
} as const;

export function AnimatedActiveIndicator({
  className,
  layoutId,
}: {
  className: string;
  layoutId: string;
}): ReactElement {
  if (typeof window === "undefined") {
    return <span aria-hidden="true" className={className} />;
  }

  return (
    <motion.span
      aria-hidden="true"
      className={className}
      layoutId={layoutId}
      transition={activeIndicatorTransition}
    />
  );
}
