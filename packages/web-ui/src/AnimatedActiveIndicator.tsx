import type { ReactElement } from "react";

export function AnimatedActiveIndicator({
  className,
  layoutId: _layoutId,
}: {
  className: string;
  layoutId: string;
}): ReactElement {
  return <span aria-hidden="true" className={className} />;
}
