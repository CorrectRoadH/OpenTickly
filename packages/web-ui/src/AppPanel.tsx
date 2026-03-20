import { type HTMLAttributes, type ReactNode } from "react";

type AppPanelProps = {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLElement>;

export function AppPanel({ children, className, ...props }: AppPanelProps) {
  return (
    <section
      className={`rounded-[2rem] border border-slate-200/80 px-6 py-5 shadow-[0_20px_60px_rgba(22,50,39,0.08)] backdrop-blur ${className ?? ""}`}
      {...props}
    >
      {children}
    </section>
  );
}
