import { type HTMLAttributes, type ReactNode } from "react";

type AppPanelProps = {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLElement>;

export function AppPanel({ children, className, ...props }: AppPanelProps) {
  return (
    <section
      className={`rounded-xl border border-white/8 bg-[#222225] px-5 py-5 shadow-sm ${className ?? ""}`}
      {...props}
    >
      {children}
    </section>
  );
}
