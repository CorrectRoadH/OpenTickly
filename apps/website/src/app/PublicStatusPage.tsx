import { type LucideIcon } from "lucide-react";
import { type ReactElement, type ReactNode } from "react";

import { PublicMainPanelFrame } from "./PublicMainPanelFrame.tsx";

type PublicStatusPageProps = {
  badge: string;
  children?: ReactNode;
  description?: string;
  icon: LucideIcon;
  title: string;
  tone?: "error" | "neutral" | "success";
};

const toneClassNames = {
  error: "bg-[var(--track-danger-tint)] text-[var(--track-state-error-text)]",
  neutral: "bg-[var(--track-surface)] text-[var(--track-text-muted)]",
  success: "bg-[var(--track-accent-tint)] text-[var(--track-accent)]",
} as const;

export function PublicStatusPage({
  badge,
  children,
  description,
  icon: Icon,
  title,
  tone = "neutral",
}: PublicStatusPageProps): ReactElement {
  return (
    <PublicMainPanelFrame
      badge={badge}
      description={description}
      headerGraphic={
        <div
          className={`flex size-12 items-center justify-center rounded-full ${toneClassNames[tone]}`}
          data-testid="public-status-icon"
          data-tone={tone}
        >
          <Icon aria-hidden="true" className="size-6" strokeWidth={1.8} />
        </div>
      }
      title={title}
    >
      {children ?? null}
    </PublicMainPanelFrame>
  );
}
