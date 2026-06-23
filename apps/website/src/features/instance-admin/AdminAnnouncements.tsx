import { AppLinkButton, SurfaceCard } from "@opentickly/web-ui";
import { AlertTriangle, Info, Megaphone } from "lucide-react";
import { useEffect, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import type {
  InstanceAnnouncement,
  InstanceAnnouncementTranslation,
} from "../../shared/api/generated/admin/types.gen.ts";
import { useInstanceVersionQuery } from "../../shared/query/instance-admin.ts";

const warningToastStoragePrefix = "opentickly:announcement-toast:";

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

  useAnnouncementToasts(announcements ?? []);

  if (!announcements || announcements.length === 0) return null;

  return (
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
  );
}

const announcementAccentBySeverity: Record<InstanceAnnouncement["severity"], string> = {
  info: "border-l-[var(--track-accent)] bg-[var(--track-accent)]/5",
  warning: "border-l-yellow-400 bg-yellow-500/5",
  critical: "border-l-red-400 bg-red-500/10",
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
      {localized.bodyMarkdown ? (
        <div className="text-[13px] leading-relaxed text-[var(--track-text-soft)]">
          <ReactMarkdown
            components={{
              a: ({ node: _node, ...props }) => (
                <a
                  {...props}
                  className="text-[var(--track-accent)] underline underline-offset-2"
                  rel="noopener noreferrer"
                  target="_blank"
                />
              ),
              li: ({ node: _node, ...props }) => <li {...props} className="ml-4 list-disc" />,
              p: ({ node: _node, ...props }) => <p {...props} className="mt-0 mb-3 last:mb-0" />,
              strong: ({ node: _node, ...props }) => (
                <strong {...props} className="font-semibold text-white" />
              ),
              ul: ({ node: _node, ...props }) => (
                <ul {...props} className="mt-0 mb-3 space-y-1 last:mb-0" />
              ),
            }}
          >
            {localized.bodyMarkdown}
          </ReactMarkdown>
        </div>
      ) : null}
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

function useAnnouncementToasts(announcements: InstanceAnnouncement[]): void {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  useEffect(() => {
    for (const announcement of announcements) {
      if (!shouldToastAnnouncement(announcement)) continue;

      const storageKey = `${warningToastStoragePrefix}${announcement.id}`;
      if (hasSeenAnnouncementToast(storageKey)) continue;

      const localized = localizeAnnouncement(announcement, language);
      const description =
        firstMarkdownParagraph(localized.bodyMarkdown) ??
        t(`instanceAdmin:${announcement.severity}AnnouncementToastDescription`);
      const options = {
        description,
        id: `announcement-${announcement.id}`,
      };

      if (announcement.severity === "critical") {
        toast.error(localized.title, options);
      } else {
        toast.warning(localized.title, options);
      }
      markAnnouncementToastSeen(storageKey);
    }
  }, [announcements, t, language]);
}

function shouldToastAnnouncement(announcement: InstanceAnnouncement): boolean {
  return announcement.severity === "warning" || announcement.severity === "critical";
}

function hasSeenAnnouncementToast(storageKey: string): boolean {
  try {
    return window.sessionStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

function markAnnouncementToastSeen(storageKey: string): void {
  try {
    window.sessionStorage.setItem(storageKey, "1");
  } catch {
    // Best-effort dedupe only.
  }
}

function firstMarkdownParagraph(markdown: string | undefined): string | undefined {
  const paragraph = markdown
    ?.split(/\n\s*\n/u)
    .map((part) => part.trim())
    .find((part) => part.length > 0);
  if (!paragraph) return undefined;

  return paragraph
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
    .replace(/[*_`>#-]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}
