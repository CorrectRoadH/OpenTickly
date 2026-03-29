import { type ReactElement, useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppButton } from "@opentoggl/web-ui";

import type { OnboardingStepDto } from "../../shared/api/web-contract.ts";
import { useOnboardingQuery, useUpdateOnboardingMutation } from "../../shared/query/web-shell.ts";

export function OnboardingChecklist({
  workspaceId,
  onInviteClick,
}: {
  workspaceId: number;
  onInviteClick: () => void;
}): ReactElement | null {
  const onboardingQuery = useOnboardingQuery(workspaceId);
  const updateMutation = useUpdateOnboardingMutation(workspaceId);
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);

  const handleDismiss = useCallback(() => {
    updateMutation.mutate({ dismissed: true });
  }, [updateMutation]);

  const handleCompleteStep = useCallback(
    (stepId: string) => {
      updateMutation.mutate({ steps: [{ step_id: stepId, completed: true }] });
    },
    [updateMutation],
  );

  const handleStepAction = useCallback(
    (step: OnboardingStepDto) => {
      if (step.step_id === "invite_team") {
        onInviteClick();
        return;
      }
      if (step.step_id === "connect_cli") {
        handleCompleteStep(step.step_id);
        return;
      }
      if (step.step_id === "start_tracking") {
        void navigate({ to: `/workspaces/${workspaceId}/timer` });
        return;
      }
      if (step.href) {
        void navigate({ to: step.href });
      }
    },
    [handleCompleteStep, navigate, onInviteClick, workspaceId],
  );

  if (!onboardingQuery.data || onboardingQuery.data.dismissed) {
    return null;
  }

  const { steps } = onboardingQuery.data;
  const completedCount = steps.filter((step) => step.completed).length;
  const allCompleted = completedCount === steps.length;

  if (allCompleted) {
    return null;
  }

  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <section
      className="rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-5 py-4"
      data-testid="onboarding-checklist"
    >
      <div className="flex items-center justify-between gap-3">
        <button
          className="flex min-w-0 flex-1 items-center gap-3 bg-transparent px-0 text-left"
          onClick={() => setExpanded(!expanded)}
          type="button"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold leading-5 text-white">
              Get started with OpenToggl
            </p>
            <p className="text-[12px] leading-4 text-[var(--track-text-muted)]">
              {completedCount} of {steps.length} completed
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[12px] font-semibold leading-none text-white">
              {progressPercent}%
            </span>
            <div className="h-1 w-[72px] rounded-full bg-[var(--track-border)]">
              <div
                className="h-1 rounded-full bg-[var(--track-accent)] transition-[width] duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span
              className={`text-[12px] text-[var(--track-text-muted)] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            >
              ▾
            </span>
          </div>
        </button>
        <button
          className="ml-2 shrink-0 text-[11px] text-[var(--track-text-muted)] hover:text-white"
          onClick={handleDismiss}
          title="Dismiss onboarding"
          type="button"
        >
          ✕
        </button>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-2 border-t border-[var(--track-border)] pt-4">
          {steps.map((step) => (
            <OnboardingStepRow
              key={step.step_id}
              onAction={() => handleStepAction(step)}
              onComplete={() => handleCompleteStep(step.step_id)}
              step={step}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function OnboardingStepRow({
  onAction,
  onComplete,
  step,
}: {
  onAction: () => void;
  onComplete: () => void;
  step: OnboardingStepDto;
}): ReactElement {
  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-[var(--track-input-bg)]">
      <button
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
          step.completed
            ? "border-[var(--track-accent)] bg-[var(--track-accent)]"
            : "border-[var(--track-text-muted)] bg-transparent"
        }`}
        disabled={step.completed}
        onClick={onComplete}
        type="button"
      >
        {step.completed ? (
          <svg fill="none" height={10} viewBox="0 0 10 10" width={10}>
            <path d="M2 5L4.5 7.5L8 3" stroke="var(--track-surface)" strokeWidth={1.5} />
          </svg>
        ) : null}
      </button>
      <span
        className={`min-w-0 flex-1 text-[14px] leading-5 ${step.completed ? "text-[var(--track-text-muted)] line-through" : "text-white"}`}
      >
        {step.label}
      </span>
      {!step.completed ? (
        <AppButton onClick={onAction} size="sm" tone="ghost" type="button">
          {stepActionLabel(step)}
        </AppButton>
      ) : null}
    </div>
  );
}

function stepActionLabel(step: OnboardingStepDto): string {
  switch (step.step_id) {
    case "import_data":
      return "Import";
    case "configure_workspace":
      return "Configure";
    case "invite_team":
      return "Invite";
    case "connect_cli":
      return "Done";
    case "start_tracking":
      return "Start";
    default:
      return "Go";
  }
}
