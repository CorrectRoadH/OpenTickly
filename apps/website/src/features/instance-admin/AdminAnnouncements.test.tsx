/* @vitest-environment jsdom */
import { render, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { InstanceVersionInfo } from "../../shared/api/admin-client.ts";
import { AnnouncementsSection } from "./AdminAnnouncements.tsx";

const mockToastError = vi.fn();
const mockToastWarning = vi.fn();
const mockUseInstanceVersionQuery = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    warning: (...args: unknown[]) => mockToastWarning(...args),
  },
}));

let currentLanguage = "en";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: currentLanguage },
  }),
  initReactI18next: { type: "3rdParty", init: () => undefined },
}));

vi.mock("@opentickly/web-ui", () => ({
  AppLinkButton: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
  SurfaceCard: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

vi.mock("../../shared/query/instance-admin.ts", () => ({
  useInstanceVersionQuery: () => mockUseInstanceVersionQuery(),
}));

describe("AnnouncementsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    currentLanguage = "en";
  });

  it("shows a proactive toast once for warning announcements", async () => {
    mockUseInstanceVersionQuery.mockReturnValue({
      data: versionWithAnnouncements([
        {
          id: "welcome",
          title: "Welcome",
          severity: "info",
          published_at: "2026-05-01T00:00:00Z",
          body_markdown: "General information.",
        },
        {
          id: "maintenance",
          title: "Maintenance window",
          severity: "warning",
          published_at: "2026-05-02T00:00:00Z",
          body_markdown: "**Back up** before upgrading.",
        },
      ]),
    });

    const view = render(<AnnouncementsSection />);

    await waitFor(() => {
      expect(mockToastWarning).toHaveBeenCalledWith("Maintenance window", {
        description: "Back up before upgrading.",
        id: "announcement-maintenance",
      });
    });
    expect(mockToastError).not.toHaveBeenCalled();

    view.rerender(<AnnouncementsSection />);

    expect(mockToastWarning).toHaveBeenCalledTimes(1);
  });

  it("uses error toasts for critical announcements", async () => {
    mockUseInstanceVersionQuery.mockReturnValue({
      data: versionWithAnnouncements([
        {
          id: "security",
          title: "Security patch required",
          severity: "critical",
          published_at: "2026-05-03T00:00:00Z",
          body_markdown: "",
        },
      ]),
    });

    render(<AnnouncementsSection />);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Security patch required", {
        description: "instanceAdmin:criticalAnnouncementToastDescription",
        id: "announcement-security",
      });
    });
    expect(mockToastWarning).not.toHaveBeenCalled();
  });

  it("toasts the localized title and body for the active UI language", async () => {
    currentLanguage = "zh-CN";
    mockUseInstanceVersionQuery.mockReturnValue({
      data: versionWithAnnouncements([
        {
          id: "maintenance",
          title: "Maintenance window",
          severity: "warning",
          published_at: "2026-05-02T00:00:00Z",
          body_markdown: "**Back up** before upgrading.",
          translations: {
            zh: { title: "维护窗口", body_markdown: "升级前请先**备份**。" },
          },
        },
      ]),
    });

    render(<AnnouncementsSection />);

    await waitFor(() => {
      expect(mockToastWarning).toHaveBeenCalledWith("维护窗口", {
        description: "升级前请先备份。",
        id: "announcement-maintenance",
      });
    });
  });

  it("keeps hyphenated and snake_case words in the toast description", async () => {
    mockUseInstanceVersionQuery.mockReturnValue({
      data: versionWithAnnouncements([
        {
          id: "ops",
          title: "Heads up",
          severity: "warning",
          published_at: "2026-05-02T00:00:00Z",
          body_markdown: "**Back up** the data_dir before re-running self-hosting upgrades.",
        },
      ]),
    });

    render(<AnnouncementsSection />);

    await waitFor(() => {
      expect(mockToastWarning).toHaveBeenCalledWith("Heads up", {
        description: "Back up the data_dir before re-running self-hosting upgrades.",
        id: "announcement-ops",
      });
    });
  });

  it("falls back to the default text when no translation matches the language", async () => {
    currentLanguage = "fr";
    mockUseInstanceVersionQuery.mockReturnValue({
      data: versionWithAnnouncements([
        {
          id: "maintenance",
          title: "Maintenance window",
          severity: "warning",
          published_at: "2026-05-02T00:00:00Z",
          body_markdown: "**Back up** before upgrading.",
          translations: {
            zh: { title: "维护窗口", body_markdown: "升级前请先**备份**。" },
          },
        },
      ]),
    });

    render(<AnnouncementsSection />);

    await waitFor(() => {
      expect(mockToastWarning).toHaveBeenCalledWith("Maintenance window", {
        description: "Back up before upgrading.",
        id: "announcement-maintenance",
      });
    });
  });
});

function versionWithAnnouncements(
  announcements: InstanceVersionInfo["announcements"],
): InstanceVersionInfo {
  return {
    current_version: "0.1.0",
    latest_version: "0.1.0",
    update_available: false,
    changelog_url: "https://example.test/changelog",
    announcements,
  };
}
