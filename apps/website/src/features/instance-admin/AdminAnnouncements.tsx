import { AppLinkButton, SurfaceCard } from "@opentickly/web-ui";
import { AlertTriangle, Info, Megaphone } from "lucide-react";
import { useEffect, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import i18n from "../../app/i18n.ts";
import type { InstanceAnnouncement } from "../../shared/api/generated/admin/types.gen.ts";
import { useInstanceVersionQuery } from "../../shared/query/instance-admin.ts";

const warningToastStoragePrefix = "opentickly:announcement-toast:";

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
  const { t } = useTranslation();
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
        <span className="text-[14px] font-medium text-[var(--track-text)]">
          {announcement.title}
        </span>
        <span className="ml-auto text-[12px] text-[var(--track-text-muted)]">
          {new Date(announcement.published_at).toLocaleDateString(i18n.language)}
        </span>
      </div>
      {announcement.body_markdown ? (
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
            {announcement.body_markdown}
          </ReactMarkdown>
        </div>
      ) : null}
      {announcement.link ? (
        <div>
          <AppLinkButton
            href={announcement.link}
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
  const { t } = useTranslation();

  useEffect(() => {
    for (const announcement of announcements) {
      if (!shouldToastAnnouncement(announcement)) continue;

      const storageKey = `${warningToastStoragePrefix}${announcement.id}`;
      if (hasSeenAnnouncementToast(storageKey)) continue;

      const description =
        firstMarkdownParagraph(announcement.body_markdown) ??
        t(`instanceAdmin:${announcement.severity}AnnouncementToastDescription`);
      const options = {
        description,
        id: `announcement-${announcement.id}`,
      };

      if (announcement.severity === "critical") {
        toast.error(announcement.title, options);
      } else {
        toast.warning(announcement.title, options);
      }
      markAnnouncementToastSeen(storageKey);
    }
  }, [announcements, t]);
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
