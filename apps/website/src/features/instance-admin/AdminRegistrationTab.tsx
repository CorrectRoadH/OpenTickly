import { AppSurfaceState, ShellSurfaceCard } from "@opentoggl/web-ui";
import type { ReactElement } from "react";
import { toast } from "sonner";

import {
  useRegistrationPolicyQuery,
  useUpdateRegistrationPolicyMutation,
} from "../../shared/query/instance-admin.ts";

const modes = [
  {
    value: "open" as const,
    label: "Open",
    description: "Anyone can register a new account.",
  },
  {
    value: "closed" as const,
    label: "Closed",
    description: "No new registrations allowed. Only existing users can log in.",
  },
  {
    value: "invite_only" as const,
    label: "Invite Only",
    description: "Only users with a valid invitation can register.",
  },
];

export function AdminRegistrationTab(): ReactElement {
  const policyQuery = useRegistrationPolicyQuery();
  const updateMutation = useUpdateRegistrationPolicyMutation();

  if (policyQuery.isPending) {
    return (
      <ShellSurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent text-[var(--track-text-muted)]"
          description="Loading registration policy..."
          title="Registration"
          tone="loading"
        />
      </ShellSurfaceCard>
    );
  }

  if (policyQuery.isError || !policyQuery.data) {
    return (
      <ShellSurfaceCard>
        <AppSurfaceState
          className="border-none bg-transparent text-[var(--track-text-muted)]"
          description="Could not load registration policy."
          title="Registration unavailable"
          tone="error"
        />
      </ShellSurfaceCard>
    );
  }

  const currentMode = policyQuery.data.mode;

  return (
    <div className="flex flex-col gap-4">
      <ShellSurfaceCard>
        <div className="p-5">
          <h3 className="mb-1 text-[16px] font-semibold text-[var(--track-text)]">
            Registration Policy
          </h3>
          <p className="mb-5 text-[14px] text-[var(--track-text-muted)]">
            Controls whether new users can create accounts on this instance.
          </p>

          <div className="flex flex-col gap-3">
            {modes.map((mode) => (
              <button
                className={`flex items-start gap-3 rounded-[10px] border p-4 text-left transition ${
                  currentMode === mode.value
                    ? "border-[var(--track-accent)] bg-[var(--track-accent)]/5"
                    : "border-[var(--track-border)] hover:border-[var(--track-text-muted)]"
                }`}
                disabled={updateMutation.isPending}
                key={mode.value}
                onClick={() => {
                  if (mode.value === currentMode) return;
                  updateMutation.mutate(mode.value, {
                    onSuccess: () => toast.success(`Registration policy set to ${mode.label}`),
                    onError: () => toast.error("Failed to update registration policy"),
                  });
                }}
                type="button"
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    currentMode === mode.value
                      ? "border-[var(--track-accent)]"
                      : "border-[var(--track-text-muted)]"
                  }`}
                >
                  {currentMode === mode.value ? (
                    <span className="h-2 w-2 rounded-full bg-[var(--track-accent)]" />
                  ) : null}
                </span>
                <div>
                  <div className="text-[14px] font-medium text-[var(--track-text)]">
                    {mode.label}
                  </div>
                  <div className="text-[13px] text-[var(--track-text-muted)]">
                    {mode.description}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 text-[12px] text-[var(--track-text-muted)]">
            Last updated: {new Date(policyQuery.data.updated_at).toLocaleString()}
          </div>
        </div>
      </ShellSurfaceCard>
    </div>
  );
}
