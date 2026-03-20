import { type ReactNode } from "react";

type StatusPillProps = {
  children: ReactNode;
  tone?: "neutral" | "success";
};

const toneClassNames = {
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export function StatusPill({ children, tone = "neutral" }: StatusPillProps) {
  return (
    <span
      className={`inline-flex w-fit rounded-full border px-3 py-1 text-sm font-semibold ${toneClassNames[tone]}`}
    >
      {children}
    </span>
  );
}
