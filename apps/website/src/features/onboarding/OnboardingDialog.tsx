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
import { ModalDialog } from "../../shared/ui/ModalDialog.tsx";

export const ONBOARDING_VERSION = 1;

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
          href: "https://github.com/opentoggl/opentoggl",
        },
        { labelKey: "onboarding:startTracking", variant: "secondary", onComplete: true },
      ],
    },
  ];
}

export function OnboardingDialog(): ReactElement | null {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const onboardingQuery = useOnboardingQuery();
  const preferencesQuery = usePreferencesQuery();
  const updatePreferencesMutation = useUpdatePreferencesMutation();
  const completeOnboardingMutation = useCompleteOnboardingMutation();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
    normalizeSupportedLanguage(i18n.language),
  );

  const steps = getOnboardingSteps();
  const currentStep = steps[currentStepIndex];

  useEffect(() => {
    if (onboardingQuery.isPending || onboardingQuery.isFetching) {
      return;
    }

    if (onboardingQuery.data?.completed === false) {
      setSelectedLanguage(
        normalizeSupportedLanguage(preferencesQuery.data?.language_code ?? i18n.language),
      );
      setCurrentStepIndex(0);
      setIsOpen(true);
    }
  }, [
    onboardingQuery.data,
    onboardingQuery.isPending,
    onboardingQuery.isFetching,
    preferencesQuery.data?.language_code,
  ]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleCompleteStep = useCallback(
    async (stepConfig: OnboardingStepConfig) => {
      const nextIndex = steps.findIndex((s) => s.id === stepConfig.id) + 1;

      if (nextIndex >= steps.length) {
        // Last step - complete onboarding
        const currentLanguage = normalizeSupportedLanguage(preferencesQuery.data?.language_code);

        try {
          if (selectedLanguage !== currentLanguage) {
            await updatePreferencesMutation.mutateAsync({
              language_code: selectedLanguage,
            });
          }
          if (selectedLanguage !== normalizeSupportedLanguage(i18n.language)) {
            await i18n.changeLanguage(selectedLanguage);
          }

          await completeOnboardingMutation.mutateAsync({
            version: ONBOARDING_VERSION,
            language_code: selectedLanguage,
          });

          setIsOpen(false);
          void navigate({ to: resolveHomePath() });
        } catch {
          toast.error(t("onboarding:failedToComplete"));
        }
      } else {
        setCurrentStepIndex(nextIndex);
      }
    },
    [
      steps,
      selectedLanguage,
      preferencesQuery.data?.language_code,
      updatePreferencesMutation,
      completeOnboardingMutation,
      navigate,
      t,
    ],
  );

  if (!isOpen || !currentStep) {
    return null;
  }

  return (
    <ModalDialog
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
      onClose={handleClose}
      testId="onboarding-dialog"
      title={t(currentStep.titleKey)}
      width="max-w-[560px]"
    >
      <div className="space-y-4">
        {currentStep.id === "language" ? (
          <LanguageStep selectedLanguage={selectedLanguage} onSelect={setSelectedLanguage} t={t} />
        ) : (
          <StepContent descriptionKey={currentStep.descriptionKey} t={t} />
        )}
      </div>
    </ModalDialog>
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
  return (
    <div className="rounded-xl border border-[var(--track-border)] bg-[var(--track-input-bg)] px-5 py-4">
      <p className="text-[14px] leading-5 text-[var(--track-text-muted)]">{t(descriptionKey)}</p>
    </div>
  );
}
