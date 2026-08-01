import { Link } from "@tanstack/react-router";
import { CircleCheck } from "lucide-react";
import { type ReactElement } from "react";

import { PublicStatusPage } from "../../app/PublicStatusPage.tsx";

type InviteStatusJoinedPageProps = {
  workspaceId?: number;
  workspaceName?: string;
};

export function InviteStatusJoinedPage({
  workspaceId,
  workspaceName,
}: InviteStatusJoinedPageProps): ReactElement {
  const resolvedWorkspaceName =
    workspaceName && workspaceName.trim().length > 0 ? workspaceName.trim() : "your workspace";

  return (
    <PublicStatusPage
      badge="Invite status"
      description={`You joined ${resolvedWorkspaceName}. Continue into the workspace app or return to login from here.`}
      icon={CircleCheck}
      title="Workspace invitation accepted"
      tone="success"
    >
      <div className="flex flex-wrap gap-3">
        {workspaceId ? (
          <Link className={primaryLinkClassName} to="/timer">
            Open workspace
          </Link>
        ) : null}
        <Link className={secondaryLinkClassName} to="/login">
          Log in
        </Link>
      </div>
    </PublicStatusPage>
  );
}

const primaryLinkClassName =
  "inline-flex h-9 items-center rounded-[6px] border border-[var(--track-accent)] bg-[var(--track-accent)] px-4 text-[14px] font-semibold text-[var(--track-button-text)] shadow-[var(--track-depth-accent-shadow)] transition hover:bg-[var(--track-accent-fill-hover)]";
const secondaryLinkClassName =
  "inline-flex h-9 items-center rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface)] px-4 text-[14px] font-semibold text-[var(--track-text)] transition hover:border-[var(--track-accent)] hover:text-[var(--track-accent)]";
