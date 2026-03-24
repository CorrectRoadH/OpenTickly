import { type HTMLAttributes, type ReactNode } from "react";

type AppPanelProps = {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLElement>;

export function AppPanel({ children, className, ...props }: AppPanelProps) {
  return (
    <section
      className={`rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-5 py-5 ${className ?? ""}`}
      {...props}
    >
      {children}
    </section>
  );
}
