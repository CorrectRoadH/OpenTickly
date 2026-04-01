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
import { useSession } from "../../shared/session/session-context.tsx";
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
          href: "https://github.com/CorrectRoadH/opentoggl",
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
  const { currentWorkspace } = useSession();

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

  const handlePrev = useCallback(() => {
    const prevIndex = Math.max(currentStepIndex - 1, 0);
    setCurrentStepIndex(prevIndex);
    saveStep(prevIndex);
  }, [currentStepIndex]);

  const isFirstStep = currentStepIndex === 0;

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleCompleteStep = useCallback(
    async (stepConfig: OnboardingStepConfig, action: OnboardingStepAction) => {
      const nextIndex = steps.findIndex((s) => s.id === stepConfig.id) + 1;

      // Apply language immediately when leaving the language step so subsequent steps render in the chosen language
      if (stepConfig.id === "language") {
        await i18n.changeLanguage(selectedLanguage);
      }

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

          if (action.navigateToImport) {
            void navigate({ to: `/workspaces/${currentWorkspace.id}/import` });
          } else {
            void navigate({ to: resolveHomePath() });
          }
        } catch {
          toast.error(t("onboarding:failedToComplete"));
        }
      } else {
        setCurrentStepIndex(nextIndex);
        saveStep(nextIndex);
      }
    },
    [
      steps,
      selectedLanguage,
      updatePreferencesMutation,
      completeOnboardingMutation,
      navigate,
      t,
      currentWorkspace.id,
    ],
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
          <LanguageStep selectedLanguage={selectedLanguage} onSelect={handleLanguageSelect} t={t} />
        ) : (
          <StepContent descriptionKey={currentStep.descriptionKey} t={t} />
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
 * ILLUSTRATION NEEDED — replace each placeholder with a real SVG/image asset.
 * Suggested canvas: 480×160px. Overall style: flat vector, dark background (#0f1117),
 * accent color #7C5CFC (purple), secondary highlight #E8D5FF (light lavender).
 * No gradients on objects — solid fills with subtle drop shadows.
 * Rounded corners on all cards/chips (8–12px radius). Stroke weight 1.5px on outlines.
 *
 * ── "language" ──────────────────────────────────────────────────────────────
 *   Center: a slightly tilted globe (wireframe lat/lon lines, accent purple stroke
 *   on a dark surface fill). Around it, 4 floating speech-bubble chips at
 *   different angles: "EN", "中文", "日本語", "Español" — each chip is a white
 *   label on a #1e2030 pill with a 1px accent border. Small dashed arcs connect
 *   the bubbles to the globe implying "all languages supported". Warm, welcoming tone.
 *
 * ── "ai-workflow" ────────────────────────────────────────────────────────────
 *   Left third: a compact terminal window (#1a1d2e bg, green #4ade80 blinking
 *   cursor, one line of white monospace text "$ toggl start"). Center: a dashed
 *   horizontal arrow labeled "CLI" in a small pill above it. Right third: an
 *   OpenToggl timer card (#1e2030 rounded rect, white "00:32:15" digits, small
 *   purple play-button icon below). Arrow flows left→right showing AI controlling
 *   the timer automatically.
 *
 * ── "star-us" ────────────────────────────────────────────────────────────────
 *   Center: a large 5-pointed star (filled #FBBF24 gold, 1px #F59E0B stroke,
 *   soft radial glow behind it). Inside or below the star: GitHub Octocat
 *   silhouette in white at ~40px. Around the star: 6 small 4-pointed sparkle
 *   shapes in #E8D5FF at varying sizes and rotations. Bottom-right corner: a
 *   small pill chip "+★ 1.2k" in accent purple to imply community growth.
 *
 * ── "import-data" ────────────────────────────────────────────────────────────
 *   Left third: a red Toggl "T" logomark on a #1e2030 card, below it 3 stacked
 *   thin rows (gray bars of varying widths) representing existing time entries.
 *   Center: a rightward arrow with a motion trail (3 decreasing-opacity copies).
 *   Right third: OpenToggl logomark on a #1e2030 card, same 3 entry rows now
 *   rendered in accent purple showing they've been migrated. A small green
 *   checkmark badge overlaps the top-right corner of the right card.
 */
function StepIllustration({ stepId }: { stepId: string }): ReactElement {
  const labels: Record<string, string> = {
    language:
      "[ TODO: flat vector SVG — tilted globe with lat/lon wireframe lines (purple stroke), 4 speech-bubble chips around it: EN / 中文 / 日本語 / Español, dashed arcs connecting them to the globe. Dark #0f1117 bg. ]",
    "ai-workflow":
      "[ TODO: flat vector SVG — left: terminal window (#1a1d2e, green cursor, text '$ toggl start'); center: dashed arrow labeled 'CLI'; right: timer card (#1e2030, white '00:32:15', purple play button). Dark #0f1117 bg. ]",
    "star-us":
      "[ TODO: flat vector SVG — center: large gold #FBBF24 5-pointed star with radial glow, GitHub Octocat silhouette in white inside it; 6 small #E8D5FF sparkles around it; bottom-right: purple pill '+★ 1.2k'. Dark #0f1117 bg. ]",
    "import-data":
      "[ TODO: flat vector SVG — left: Toggl red T logo on #1e2030 card + 3 gray entry rows; center: rightward arrow with motion trail; right: OpenToggl logo on #1e2030 card + same 3 rows in purple + green checkmark badge. Dark #0f1117 bg. ]",
  };

  return (
    <div className="flex h-[140px] items-center justify-center rounded-xl border border-dashed border-[var(--track-border)] bg-[var(--track-surface)] text-center text-[12px] text-[var(--track-text-muted)]">
      {labels[stepId] ?? "[ Illustration ]"}
    </div>
  );
}
