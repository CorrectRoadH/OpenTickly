import { AppButton } from "@opentickly/web-ui";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { type ReactElement, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import i18n, {
  languageLabels,
  normalizeSupportedLanguage,
  supportedLanguages,
  type SupportedLanguage,
} from "../../app/i18n.ts";
import { getTimezones } from "../../shared/api/public/track/index.ts";
import { unwrapWebApiResult, WebApiError } from "../../shared/api/web-client.ts";
import { resolveHomePath } from "../../shared/lib/workspace-routing.ts";
import { useSession } from "../../shared/session/session-context.tsx";
import {
  useCompleteOnboardingMutation,
  useOnboardingQuery,
  usePreferencesQuery,
  useUpdateProfileMutation,
  useUpdatePreferencesMutation,
} from "../../shared/query/web-shell.ts";
import { TimezonePicker } from "../../pages/account/TimezonePicker.tsx";
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
  /** Use workspace-relative import path instead of a static href */
  importHref?: boolean;
  onComplete?: boolean;
  /** After completing onboarding, navigate to the import page instead of home */
  navigateToImport?: boolean;
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
      actions: [
        {
          labelKey: "onboarding:aiWorkflowSetupGuide",
          variant: "primary",
          href: "https://opentoggl.com/docs/ai-integration",
        },
        { labelKey: "onboarding:continue", variant: "secondary", onComplete: true },
      ],
    },
    {
      id: "star-us",
      titleKey: "onboarding:starUsTitle",
      descriptionKey: "onboarding:starUsDescription",
      actions: [
        {
          labelKey: "onboarding:starOnGitHub",
          variant: "primary",
          href: "https://github.com/CorrectRoadH/OpenTickly",
        },
        { labelKey: "onboarding:continue", variant: "secondary", onComplete: true },
      ],
    },
    {
      id: "import-data",
      titleKey: "onboarding:importDataTitle",
      descriptionKey: "onboarding:importDataDescription",
      actions: [
        {
          labelKey: "onboarding:importDataButton",
          variant: "primary",
          importHref: true,
          onComplete: true,
          navigateToImport: true,
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
  const { currentWorkspace, user } = useSession();

  const onboardingQuery = useOnboardingQuery();
  const preferencesQuery = usePreferencesQuery();
  const updatePreferencesMutation = useUpdatePreferencesMutation();
  const updateProfileMutation = useUpdateProfileMutation();
  const completeOnboardingMutation = useCompleteOnboardingMutation();
  const timezonesQuery = useQuery({
    queryFn: () => unwrapWebApiResult(getTimezones()),
    queryKey: ["timezones"],
    staleTime: Infinity,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(loadSavedStep);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
    normalizeSupportedLanguage(i18n.language),
  );
  const detectedTimezone = user.timezone ?? "UTC";
  const [selectedTimezone, setSelectedTimezone] = useState<string>(detectedTimezone);

  const handleLanguageSelect = (lang: SupportedLanguage) => {
    setSelectedLanguage(lang);
  };

  const timezoneNames = (timezonesQuery.data ?? [detectedTimezone])
    .map((tz) => {
      if (typeof tz === "string") return tz;
      const record = tz as { name?: string } | null;
      return record?.name ?? "";
    })
    .filter((name): name is string => name.length > 0);

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
      setSelectedTimezone(detectedTimezone);
      setCurrentStepIndex(loadSavedStep());
      setIsOpen(true);
    }
  }, [
    onboardingQuery.data,
    onboardingQuery.isPending,
    onboardingQuery.isFetching,
    preferencesQuery.data?.language_code,
    detectedTimezone,
    isOpen,
  ]);

  const handlePrev = () => {
    const prevIndex = Math.max(currentStepIndex - 1, 0);
    setCurrentStepIndex(prevIndex);
    saveStep(prevIndex);
  };

  const isFirstStep = currentStepIndex === 0;

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleCompleteStep = async (
    stepConfig: OnboardingStepConfig,
    action: OnboardingStepAction,
  ) => {
    const nextIndex = steps.findIndex((s) => s.id === stepConfig.id) + 1;

    // Apply language immediately when leaving the language step so subsequent steps render in the chosen language
    if (stepConfig.id === "language") {
      await i18n.changeLanguage(selectedLanguage);
    }

    if (nextIndex >= steps.length) {
      // Last step - complete onboarding
      try {
        if (selectedTimezone && selectedTimezone !== detectedTimezone) {
          await updateProfileMutation.mutateAsync({ timezone: selectedTimezone });
        }

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

        if (action.navigateToImport) {
          void navigate({ to: `/workspaces/${currentWorkspace.id}/import` });
        } else {
          void navigate({ to: resolveHomePath() });
        }
      } catch (err) {
        toast.error(
          err instanceof WebApiError ? err.userMessage : t("onboarding:failedToComplete"),
        );
      }
    } else {
      setCurrentStepIndex(nextIndex);
      saveStep(nextIndex);
    }
  };

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
                  void handleCompleteStep(currentStep, action);
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
        isFirstStep ? undefined : (
          <AppButton onClick={handlePrev} type="button" variant="secondary">
            {t("onboarding:previous")}
          </AppButton>
        )
      }
      onClose={handleClose}
      testId="onboarding-dialog"
      title={t(currentStep.titleKey)}
      width="max-w-[560px]"
    >
      <div className="space-y-4">
        <StepIllustration stepId={currentStep.id} />
        {currentStep.id === "language" ? (
          <LanguageStep
            onSelect={handleLanguageSelect}
            onTimezoneChange={setSelectedTimezone}
            selectedLanguage={selectedLanguage}
            selectedTimezone={selectedTimezone}
            t={t}
            timezones={timezoneNames}
          />
        ) : (
          <StepContent descriptionKey={currentStep.descriptionKey} t={t} />
        )}
      </div>
    </ModalDialogWithNav>
  );
}

function LanguageStep({
  onSelect,
  onTimezoneChange,
  selectedLanguage,
  selectedTimezone,
  t,
  timezones,
}: {
  onSelect: (lang: SupportedLanguage) => void;
  onTimezoneChange: (timezone: string) => void;
  selectedLanguage: SupportedLanguage;
  selectedTimezone: string;
  t: (key: string) => string;
  timezones: readonly string[];
}): ReactElement {
  const [showPicker, setShowPicker] = useState(false);
  const offset = formatOffsetLabel(selectedTimezone);

  return (
    <div className="space-y-4">
      <p className="text-[14px] leading-5 text-[var(--track-text-muted)]">
        {t("onboarding:languageDescription")}
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
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

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--track-border)] bg-[var(--track-input-bg)] px-4 py-3">
        <span
          className="text-[13px] text-[var(--track-text-muted)]"
          data-testid="onboarding-detected-timezone"
        >
          <span className="mr-1 text-[var(--track-text-soft)]">
            {t("onboarding:detectedTimezone")}:
          </span>
          <span className="font-medium text-white">{selectedTimezone}</span>
          {offset ? <span className="ml-1 tabular-nums">({offset})</span> : null}
        </span>
        {showPicker ? (
          <TimezonePicker
            onChange={(value) => {
              onTimezoneChange(value);
              setShowPicker(false);
            }}
            searchPlaceholder={t("account:searchTimezonePlaceholder")}
            testId="timezone-select"
            timezones={timezones}
            value={selectedTimezone}
          />
        ) : (
          <button
            className="text-[13px] font-medium text-[var(--track-accent-text)] underline-offset-4 hover:underline"
            onClick={() => setShowPicker(true)}
            type="button"
          >
            {t("onboarding:changeTimezone")}
          </button>
        )}
      </div>
    </div>
  );
}

function formatOffsetLabel(timezone: string): string | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset",
    }).formatToParts(new Date());
    const offset = parts.find((part) => part.type === "timeZoneName")?.value ?? "";
    const stripped = offset.replace(/^GMT/, "").replace(/^UTC/, "");
    return stripped === "" ? "UTC+00:00" : `UTC${stripped}`;
  } catch {
    return null;
  }
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

function StepIllustration({ stepId }: { stepId: string }): ReactElement {
  return (
    <div className="overflow-hidden rounded-xl">
      <img alt="" className="h-[140px] w-full object-cover" src={`/onboarding/${stepId}.png`} />
    </div>
  );
}
