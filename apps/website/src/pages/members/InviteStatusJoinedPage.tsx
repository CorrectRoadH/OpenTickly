import { AppPanel } from "@opentickly/web-ui";
import { Link } from "@tanstack/react-router";
import { type ReactElement } from "react";

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
    <main className="min-h-screen px-4 py-8">
      <AppPanel className="mx-auto max-w-2xl" tone="light">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
              Invite status
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Workspace invitation accepted
            </h1>
            <p className="text-sm leading-6 text-slate-600">
              You joined{" "}
              <span className="font-semibold text-slate-950">{resolvedWorkspaceName}</span>.
              Continue into the workspace app or return to login from here.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {workspaceId ? (
              <Link
                className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-600"
                to="/timer"
              >
                Open workspace
              </Link>
            ) : null}
            <Link
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-emerald-600 hover:text-emerald-800"
              to="/login"
            >
              Log in
            </Link>
          </div>
        </div>
      </AppPanel>
    </main>
  );
}
