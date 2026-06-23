import { AppButton, AppLinkButton, SurfaceCard } from "@opentickly/web-ui";
import { AlertTriangle, Info, Megaphone } from "lucide-react";
import { useState, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";

import type {
  InstanceAnnouncement,
  InstanceAnnouncementTranslation,
} from "../../shared/api/generated/admin/types.gen.ts";
import { ModalDialog } from "../../shared/ui/ModalDialog.tsx";
import { useInstanceVersionQuery } from "../../shared/query/instance-admin.ts";

// Dismissing an announcement modal is persisted per id in localStorage so a
// blocking modal never re-interrupts the same admin across sessions. The card
// list below still shows every announcement, so nothing is lost on dismiss.
const dismissedModalStoragePrefix = "opentickly:announcement-modal:";

// Higher-severity announcements take the single modal slot first.
const announcementModalRank: Record<InstanceAnnouncement["severity"], number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

// LocalizedAnnouncement is the announcement's display text resolved for the
// admin's current UI language. Localization happens client-side because one
// instance can have admins reading in different languages.
type LocalizedAnnouncement = {
  title: string;
  bodyMarkdown: string;
  link: string | undefined;
};

// pickTranslation matches the UI language against the available translations,
// trying the exact tag ("zh-CN") then the base language ("zh"). Returns
// undefined when nothing matches so callers fall back to the default text.
function pickTranslation(
  translations: Record<string, InstanceAnnouncementTranslation> | undefined,
  language: string,
): InstanceAnnouncementTranslation | undefined {
  if (!translations) return undefined;
  return translations[language] ?? translations[language.split("-")[0]];
}

// localizeAnnouncement resolves each field independently: a translation that
// only overrides the title still inherits the default body and link.
function localizeAnnouncement(
  announcement: InstanceAnnouncement,
  language: string,
): LocalizedAnnouncement {
  const translation = pickTranslation(announcement.translations, language);
  return {
    title: translation?.title ?? announcement.title,
    bodyMarkdown: translation?.body_markdown ?? announcement.body_markdown,
    link: translation?.link ?? announcement.link,
  };
}

// AnnouncementsSection renders the list of active announcements surfaced by
// the upstream update worker. The data rides the same query as VersionCard.
export function AnnouncementsSection(): ReactElement | null {
  const { t } = useTranslation();
  const versionQuery = useInstanceVersionQuery();
  const announcements = versionQuery.data?.announcements;

  if (!announcements || announcements.length === 0) return null;

  return (
    <>
      <AnnouncementModal announcements={announcements} />
      <SurfaceCard>
        <div className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Megaphone
              aria-hidden="true"
              className="h-4 w-4 text-[var(--track-text-muted)]"
              size={16}
            />
            <h3 className="text-[14px] font-semibold text-[var(--track-text)]">
              {t("instanceAdmin:announcements")}
            </h3>
          </div>
          <ul className="flex flex-col gap-3">
            {announcements.map((a) => (
              <AnnouncementItem key={a.id} announcement={a} />
            ))}
          </ul>
        </div>
      </SurfaceCard>
    </>
  );
}

const announcementAccentBySeverity: Record<InstanceAnnouncement["severity"], string> = {
  info: "border-l-[var(--track-accent)] bg-[var(--track-accent)]/5",
  warning: "border-l-yellow-400 bg-yellow-500/5",
  critical: "border-l-red-400 bg-red-500/10",
};

const announcementIconBySeverity: Record<InstanceAnnouncement["severity"], string> = {
  info: "text-[var(--track-text-muted)]",
  warning: "text-yellow-400",
  critical: "text-red-400",
};

export function AnnouncementItem({
  announcement,
}: {
  announcement: InstanceAnnouncement;
}): ReactElement {
  const { t, i18n } = useTranslation();
  const localized = localizeAnnouncement(announcement, i18n.language);
  const accent = announcementAccentBySeverity[announcement.severity];
  const SeverityIcon = announcement.severity === "info" ? Info : AlertTriangle;

  return (
    <li
      className={`flex flex-col gap-2 rounded-md border border-[var(--track-border)] border-l-4 p-4 ${accent}`}
    >
      <div className="flex items-center gap-2">
        <SeverityIcon
          aria-hidden="true"
          className="h-4 w-4 text-[var(--track-text-muted)]"
          size={16}
        />
        <span className="text-[14px] font-medium text-[var(--track-text)]">{localized.title}</span>
        <span className="ml-auto text-[12px] text-[var(--track-text-muted)]">
          {new Date(announcement.published_at).toLocaleDateString(i18n.language)}
        </span>
      </div>
      {localized.bodyMarkdown ? <AnnouncementMarkdown markdown={localized.bodyMarkdown} /> : null}
      {localized.link ? (
        <div>
          <AppLinkButton
            href={localized.link}
            target="_blank"
            rel="noopener noreferrer"
            variant="ghost"
            size="sm"
          >
            {t("instanceAdmin:announcementLearnMore")}
          </AppLinkButton>
        </div>
      ) : null}
    </li>
  );
}

// AnnouncementMarkdown renders an announcement body as prose with links that
// open in a new tab. Shared by the card list and the proactive modal.
function AnnouncementMarkdown({ markdown }: { markdown: string }): ReactElement {
  return (
    <div className="prose prose-invert prose-sm max-w-none text-[13px] leading-relaxed text-[var(--track-text-soft)] prose-a:text-[var(--track-accent)] prose-strong:text-white">
      <ReactMarkdown
        components={{
          a: ({ node: _node, ...props }) => (
            <a {...props} rel="noopener noreferrer" target="_blank" />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

// AnnouncementModal proactively surfaces the most severe undismissed
// warning/critical announcement in a blocking dialog. Dismissing acknowledges
// that announcement forever (localStorage) and the next render advances to the
// following pending one. Info announcements never modal — card list only.
function AnnouncementModal({
  announcements,
}: {
  announcements: InstanceAnnouncement[];
}): ReactElement | null {
  const { t, i18n } = useTranslation();
  // Tracks ids dismissed during this mount so the modal advances to the next
  // pending announcement without waiting for the version query to refetch.
  const [dismissedThisMount, setDismissedThisMount] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const active = [...announcements]
    .filter(
      (a) =>
        shouldModalAnnouncement(a) &&
        !dismissedThisMount.has(a.id) &&
        !hasDismissedAnnouncementModal(a.id),
    )
    .sort((a, b) => announcementModalRank[a.severity] - announcementModalRank[b.severity])[0];

  if (!active) return null;

  const localized = localizeAnnouncement(active, i18n.language);
  const SeverityIcon = active.severity === "critical" ? AlertTriangle : Info;
  const description =
    localized.bodyMarkdown || t(`instanceAdmin:${active.severity}AnnouncementModalDescription`);

  function dismiss(): void {
    markAnnouncementModalDismissed(active.id);
    setDismissedThisMount((prev) => new Set(prev).add(active.id));
  }

  return (
    <ModalDialog
      onClose={dismiss}
      testId="announcement-modal"
      title={localized.title}
      width="max-w-[480px]"
      footer={
        <>
          {localized.link ? (
            <AppLinkButton
              href={localized.link}
              target="_blank"
              rel="noopener noreferrer"
              variant="ghost"
              size="sm"
            >
              {t("instanceAdmin:announcementLearnMore")}
            </AppLinkButton>
          ) : null}
          <AppButton onClick={dismiss} variant="primary" size="sm">
            {t("instanceAdmin:announcementDismiss")}
          </AppButton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <SeverityIcon
            aria-hidden="true"
            className={`h-4 w-4 ${announcementIconBySeverity[active.severity]}`}
            size={16}
          />
          <span className="ml-auto text-[12px] text-[var(--track-text-muted)]">
            {new Date(active.published_at).toLocaleDateString(i18n.language)}
          </span>
        </div>
        {localized.bodyMarkdown ? (
          <AnnouncementMarkdown markdown={localized.bodyMarkdown} />
        ) : (
          <p className="text-[13px] leading-relaxed text-[var(--track-text-soft)]">{description}</p>
        )}
      </div>
    </ModalDialog>
  );
}

function shouldModalAnnouncement(announcement: InstanceAnnouncement): boolean {
  return announcement.severity === "warning" || announcement.severity === "critical";
}

function hasDismissedAnnouncementModal(id: string): boolean {
  try {
    return window.localStorage.getItem(`${dismissedModalStoragePrefix}${id}`) === "1";
  } catch {
    return false;
  }
}

function markAnnouncementModalDismissed(id: string): void {
  try {
    window.localStorage.setItem(`${dismissedModalStoragePrefix}${id}`, "1");
  } catch {
    // Best-effort persistence only.
  }
}
