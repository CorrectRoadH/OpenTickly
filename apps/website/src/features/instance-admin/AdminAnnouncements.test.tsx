/* @vitest-environment jsdom */
import { fireEvent, render, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { InstanceVersionInfo } from "../../shared/api/admin-client.ts";
import { AnnouncementsSection } from "./AdminAnnouncements.tsx";

const mockUseInstanceVersionQuery = vi.fn();

let currentLanguage = "en";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: currentLanguage },
  }),
  initReactI18next: { type: "3rdParty", init: () => undefined },
}));

vi.mock("@opentickly/web-ui", () => ({
  AppButton: ({ children, ...props }: React.ComponentProps<"button">) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  AppLinkButton: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
  SurfaceCard: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  Dialog: ({ children, testId }: { children: React.ReactNode; testId?: string }) => (
    <div data-testid={testId} role="dialog">
      {children}
    </div>
  ),
  DialogHeader: ({ title }: { title: string }) => <h2>{title}</h2>,
  DialogBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
    window.localStorage.clear();
    currentLanguage = "en";
  });

  it("opens a modal for the warning announcement and keeps info out of the modal", () => {
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

    const { getByTestId, queryByText } = render(<AnnouncementsSection />);

    const modal = getByTestId("announcement-modal");
    expect(modal).toHaveTextContent("Maintenance window");
    expect(modal).toHaveTextContent("**Back up** before upgrading.");
    // Info announcement is card-only, never surfaced in the modal.
    expect(modal).not.toHaveTextContent("Welcome");
    expect(queryByText("instanceAdmin:announcementDismiss")).toBeTruthy();
  });

  it("surfaces the most severe announcement first", () => {
    mockUseInstanceVersionQuery.mockReturnValue({
      data: versionWithAnnouncements([
        {
          id: "maintenance",
          title: "Maintenance window",
          severity: "warning",
          published_at: "2026-05-02T00:00:00Z",
          body_markdown: "Heads up.",
        },
        {
          id: "security",
          title: "Security patch required",
          severity: "critical",
          published_at: "2026-05-03T00:00:00Z",
          body_markdown: "",
        },
      ]),
    });

    const { getByTestId } = render(<AnnouncementsSection />);

    expect(getByTestId("announcement-modal")).toHaveTextContent("Security patch required");
  });

  it("falls back to the default description when the critical body is empty", () => {
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

    const { getByTestId } = render(<AnnouncementsSection />);

    expect(getByTestId("announcement-modal")).toHaveTextContent(
      "instanceAdmin:criticalAnnouncementModalDescription",
    );
  });

  it("dismisses forever: persists to localStorage and stays closed on remount", async () => {
    mockUseInstanceVersionQuery.mockReturnValue({
      data: versionWithAnnouncements([
        {
          id: "maintenance",
          title: "Maintenance window",
          severity: "warning",
          published_at: "2026-05-02T00:00:00Z",
          body_markdown: "Heads up.",
        },
      ]),
    });

    const first = render(<AnnouncementsSection />);
    fireEvent.click(first.getByText("instanceAdmin:announcementDismiss"));

    await waitFor(() => {
      expect(first.queryByTestId("announcement-modal")).toBeNull();
    });
    expect(window.localStorage.getItem("opentickly:announcement-modal:maintenance")).toBe("1");
    first.unmount();

    const second = render(<AnnouncementsSection />);
    expect(second.queryByTestId("announcement-modal")).toBeNull();
  });

  it("renders the localized title and body for the active UI language", () => {
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

    const { getByTestId } = render(<AnnouncementsSection />);

    const modal = getByTestId("announcement-modal");
    expect(modal).toHaveTextContent("维护窗口");
    expect(modal).toHaveTextContent("升级前请先**备份**。");
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
