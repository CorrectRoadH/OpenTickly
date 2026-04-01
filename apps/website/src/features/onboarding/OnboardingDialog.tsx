import { AppButton } from "@opentoggl/web-ui";
import { useNavigate } from "@tanstack/react-router";
import { type ReactElement, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import i18n, {
  languageLabels,
  normalizeSupportedLanguage,
  supportedLanguages,
  type SupportedLanguage,
} from "../../app/i18n.ts";
import { resolveHomePath } from "../../shared/lib/workspace-routing.ts";
import {
  useCompleteOnboardingMutation,
  useOnboardingQuery,
  usePreferencesQuery,
  useUpdatePreferencesMutation,
} from "../../shared/query/web-shell.ts";
import { ModalDialogWithNav } from "../../shared/ui/ModalDialog.tsx";

export const ONBOARDING_VERSION = 1;
const ONBOARDING_STEP_STORAGE_KEY = "opentoggl_onboarding_step";

export type OnboardingStepConfig = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  actions: OnboardingStepAction[];
};

export type OnboardingStepAction = {
  labelKey: string;
  variant?: "primary" | "secondary";
  href?: string;
  onComplete?: boolean;
};

export function getOnboardingSteps(): OnboardingStepConfig[] {
  return [
    {
      id: "language",
      titleKey: "onboarding:languageTitle",
      descriptionKey: "onboarding:languageDescription",
      actions: [{ labelKey: "onboarding:continue", variant: "primary", onComplete: true }],
    },
    {
      id: "ai-workflow",
      titleKey: "onboarding:aiWorkflowTitle",
      descriptionKey: "onboarding:aiWorkflowDescription",
      actions: [{ labelKey: "onboarding:continue", variant: "primary", onComplete: true }],
    },
    {
      id: "configure-workspace",
      titleKey: "onboarding:configureWorkspaceTitle",
      descriptionKey: "onboarding:configureWorkspaceDescription",
      actions: [{ labelKey: "onboarding:continue", variant: "primary", onComplete: true }],
    },
    {
      id: "star-us",
      titleKey: "onboarding:starUsTitle",
      descriptionKey: "onboarding:starUsDescription",
      actions: [
        {
          labelKey: "onboarding:starOnGitHub",
          variant: "primary",
          href: "https://github.com/CorrectRoadH/opentoggl",
          onComplete: true,
        },
        { labelKey: "onboarding:startTracking", variant: "secondary", onComplete: true },
      ],
    },
  ];
}

function loadSavedStep(): number {
  try {
    const saved = localStorage.getItem(ONBOARDING_STEP_STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (typeof parsed === "number" && parsed >= 0) {
        return parsed;
      }
    }
  } catch {
    // ignore parse errors
  }
  return 0;
}

function saveStep(stepIndex: number): void {
  try {
    localStorage.setItem(ONBOARDING_STEP_STORAGE_KEY, JSON.stringify(stepIndex));
  } catch {
    // ignore storage errors
  }
}

export function OnboardingDialog(): ReactElement | null {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const onboardingQuery = useOnboardingQuery();
  const preferencesQuery = usePreferencesQuery();
  const updatePreferencesMutation = useUpdatePreferencesMutation();
  const completeOnboardingMutation = useCompleteOnboardingMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(loadSavedStep);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
    normalizeSupportedLanguage(i18n.language),
  );

  const handleLanguageSelect = useCallback((lang: SupportedLanguage) => {
    setSelectedLanguage(lang);
  }, []);

  const steps = getOnboardingSteps();
  const currentStep = steps[currentStepIndex];

  useEffect(() => {
    if (onboardingQuery.isPending || onboardingQuery.isFetching) {
      return;
    }

    if (onboardingQuery.data?.completed === false && !isOpen) {
      setSelectedLanguage(
        normalizeSupportedLanguage(preferencesQuery.data?.language_code ?? i18n.language),
      );
      setCurrentStepIndex(loadSavedStep());
      setIsOpen(true);
    }
  }, [
    onboardingQuery.data,
    onboardingQuery.isPending,
    onboardingQuery.isFetching,
    preferencesQuery.data?.language_code,
    isOpen,
  ]);

  const handleNext = useCallback(() => {
    const nextIndex = Math.min(currentStepIndex + 1, steps.length - 1);
    setCurrentStepIndex(nextIndex);
    saveStep(nextIndex);
  }, [currentStepIndex, steps.length]);

  const handlePrev = useCallback(() => {
    const prevIndex = Math.max(currentStepIndex - 1, 0);
    setCurrentStepIndex(prevIndex);
    saveStep(prevIndex);
  }, [currentStepIndex]);

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleCompleteStep = useCallback(
    async (stepConfig: OnboardingStepConfig) => {
      const nextIndex = steps.findIndex((s) => s.id === stepConfig.id) + 1;

      if (nextIndex >= steps.length) {
        // Last step - complete onboarding
        try {
          await updatePreferencesMutation.mutateAsync({
            language_code: selectedLanguage,
          });
          await i18n.changeLanguage(selectedLanguage);

          await completeOnboardingMutation.mutateAsync({
            version: ONBOARDING_VERSION,
            language_code: selectedLanguage,
          });

          localStorage.removeItem(ONBOARDING_STEP_STORAGE_KEY);
          setIsOpen(false);
          void navigate({ to: resolveHomePath() });
        } catch {
          toast.error(t("onboarding:failedToComplete"));
        }
      } else {
        setCurrentStepIndex(nextIndex);
        saveStep(nextIndex);
      }
    },
    [steps, selectedLanguage, updatePreferencesMutation, completeOnboardingMutation, navigate, t],
  );

  if (!isOpen || !currentStep) {
    return null;
  }

  return (
    <ModalDialogWithNav
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {currentStep.actions.map((action, index) => (
            <AppButton
              key={index}
              disabled={action.onComplete ? completeOnboardingMutation.isPending : false}
              onClick={() => {
                if (action.href) {
                  window.open(action.href, "_blank", "noopener,noreferrer");
                }
                if (action.onComplete) {
                  void handleCompleteStep(currentStep);
                }
              }}
              type="button"
              variant={action.variant}
            >
              {t(action.labelKey)}
            </AppButton>
          ))}
        </div>
      }
      navigation={
        <div className="flex items-center justify-between">
          {!isFirstStep && (
            <AppButton onClick={handlePrev} type="button" variant="secondary">
              {t("onboarding:previous")}
            </AppButton>
          )}
          <div className="flex-1" />
          {!isLastStep && (
            <AppButton onClick={handleNext} type="button" variant="secondary">
              {t("onboarding:next")}
            </AppButton>
          )}
        </div>
      }
      onClose={handleClose}
      testId="onboarding-dialog"
      title={t(currentStep.titleKey)}
      width="max-w-[560px]"
    >
      <div className="space-y-4">
        {currentStep.id === "language" ? (
          <LanguageStep selectedLanguage={selectedLanguage} onSelect={handleLanguageSelect} t={t} />
        ) : currentStep.id === "star-us" ? (
          <StarUsStep t={t} />
        ) : (
          <>
            <StepIllustration stepId={currentStep.id} />
            <StepContent descriptionKey={currentStep.descriptionKey} t={t} />
          </>
        )}
      </div>
    </ModalDialogWithNav>
  );
}

function LanguageStep({
  selectedLanguage,
  onSelect,
  t,
}: {
  selectedLanguage: SupportedLanguage;
  onSelect: (lang: SupportedLanguage) => void;
  t: (key: string) => string;
}): ReactElement {
  return (
    <div className="space-y-4">
      <p className="text-[14px] leading-5 text-[var(--track-text-muted)]">
        {t("onboarding:languageDescription")}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {supportedLanguages.map((languageCode) => {
          const isSelected = selectedLanguage === languageCode;
          return (
            <button
              aria-pressed={isSelected}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                isSelected
                  ? "border-[var(--track-accent)] bg-[var(--track-accent)]/15 text-white"
                  : "border-[var(--track-border)] bg-[var(--track-surface)] text-[var(--track-text-muted)] hover:text-white"
              }`}
              key={languageCode}
              onClick={() => onSelect(languageCode)}
              type="button"
            >
              <span className="block text-[14px] font-semibold">
                {languageLabels[languageCode]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepContent({
  descriptionKey,
  t,
}: {
  descriptionKey: string;
  t: (key: string) => string;
}): ReactElement {
  const text = t(descriptionKey);
  const parts = text.split(/(`[^`]+`|\[([^\]]+)\]\(([^)]+)\))/g);

  return (
    <div className="rounded-xl border border-[var(--track-border)] bg-[var(--track-input-bg)] px-5 py-4">
      <p className="text-[14px] leading-5 text-[var(--track-text-muted)]">
        {parts.map((part, i) => {
          if (part == null) return null;
          const codeMatch = part.match(/^`([^`]+)`$/);
          if (codeMatch) {
            return (
              <code
                className="rounded bg-[var(--track-surface)] px-1.5 py-0.5 text-[13px] text-[var(--track-text)]"
                key={i}
              >
                {codeMatch[1]}
              </code>
            );
          }
          const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
          if (linkMatch) {
            return (
              <a
                className="text-[var(--track-accent)] underline hover:text-[var(--track-accent-text)]"
                href={linkMatch[2]}
                key={i}
                rel="noopener noreferrer"
                target="_blank"
              >
                {linkMatch[1]}
              </a>
            );
          }
          return part;
        })}
      </p>
    </div>
  );
}

/**
 * Illustration placeholder for each onboarding step.
 *
 * ILLUSTRATION NEEDED — replace each placeholder SVG with a real image/SVG asset:
 *
 * "ai-workflow":
 *   Show an AI chat bubble (e.g. Claude logo or generic robot icon) on the left
 *   connected by an arrow to an OpenToggl timer card on the right.
 *   The arrow should be labeled "CLI". Dark background, accent color highlights.
 *   Suggested size: 480×160px.
 *
 * "configure-workspace":
 *   Show a simple workspace settings card — workspace name field, currency dropdown,
 *   and a checkmark indicating it's configured. Clean, minimal line-art style.
 *   Suggested size: 480×160px.
 */
function StepIllustration({ stepId }: { stepId: string }): ReactElement {
  // Placeholder: a labeled dashed box indicating where the illustration goes.
  // Replace this with <img src={...} /> or an inline SVG per step.
  const label =
    stepId === "ai-workflow"
      ? "[ Illustration: AI agent → CLI → OpenToggl timer ]"
      : "[ Illustration: Workspace settings card ]";

  return (
    <div className="flex h-[140px] items-center justify-center rounded-xl border border-dashed border-[var(--track-border)] bg-[var(--track-surface)] text-center text-[12px] text-[var(--track-text-muted)]">
      {label}
    </div>
  );
}

/**
 * Final "Star us on GitHub" step.
 *
 * ILLUSTRATION NEEDED:
 *   A large GitHub Octocat or star icon centered in the hero area, surrounded by
 *   small sparkle/star shapes. The star should look "lit up" (filled yellow).
 *   Optionally show a rising star count number (e.g. "★ 1,234"). Dark bg.
 *   Suggested size: 480×180px.
 */
function StarUsStep({ t }: { t: (key: string) => string }): ReactElement {
  return (
    <div className="space-y-4">
      {/* Illustration placeholder — replace with real asset */}
      <div className="flex h-[160px] items-center justify-center rounded-xl border border-dashed border-[var(--track-border)] bg-[var(--track-surface)] text-center text-[12px] text-[var(--track-text-muted)]">
        {"[ Illustration: GitHub star hero — Octocat + glowing ★ ]"}
      </div>
      <div className="rounded-xl border border-[var(--track-border)] bg-[var(--track-input-bg)] px-5 py-4 text-center">
        <p className="text-[14px] leading-6 text-[var(--track-text-muted)]">
          {t("onboarding:starUsDescription")}
        </p>
      </div>
    </div>
  );
}
