import { type HTMLAttributes, type ReactNode } from "react";

import { getSurfaceClassName, type AppSurfaceTone } from "./surfaceStyles.ts";

type AppPanelProps = {
  children: ReactNode;
  className?: string;
  tone?: AppSurfaceTone;
} & HTMLAttributes<HTMLElement>;

export function AppPanel({ children, className, tone = "default", ...props }: AppPanelProps) {
  return (
    <section className={`${getSurfaceClassName(tone, className)} px-5 py-5`} {...props}>
      {children}
    </section>
  );
}
