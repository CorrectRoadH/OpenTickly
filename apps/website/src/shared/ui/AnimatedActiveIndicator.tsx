import { lazy, Suspense } from "react";
import type { ReactElement } from "react";

import { useUserPreferences } from "../query/useUserPreferences.ts";

const MotionActiveIndicator = lazy(() => import("./MotionActiveIndicator.tsx"));

export function AnimatedActiveIndicator({
  className,
  layoutId,
}: {
  className: string;
  layoutId: string;
}): ReactElement {
  const { showAnimations } = useUserPreferences();

  const plain = <span aria-hidden="true" className={className} />;

  if (typeof window === "undefined" || !showAnimations) {
    return plain;
  }

  return (
    <Suspense fallback={plain}>
      <MotionActiveIndicator className={className} layoutId={layoutId} />
    </Suspense>
  );
}
