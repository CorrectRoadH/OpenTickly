import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "./AppShell.tsx";

const mockUseRouterState = vi.fn();
const mockUseSession = vi.fn();
const mockUseSessionActions = vi.fn();
const mockUseCurrentTimeEntryQuery = vi.fn();
const mockUseLogoutMutation = vi.fn();
const mockUseProfileQuery = vi.fn();
const mockUseUpdateProfileMutation = vi.fn();
const mockUseUpdateWebSessionMutation = vi.fn();
const mockShellNavigationItems = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, className, to }: { children: ReactNode; className?: string; to: string }) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useRouterState: (options?: {
    select?: (state: { location: { pathname: string; searchStr: string } }) => unknown;
  }) =>
    options?.select
      ? options.select({
          location: mockUseRouterState(),
        })
      : mockUseRouterState(),
}));

vi.mock("../shared/session/session-context.tsx", () => ({
  useSession: () => mockUseSession(),
  useSessionActions: () => mockUseSessionActions(),
}));

vi.mock("../shared/query/web-shell.ts", () => ({
  useCurrentTimeEntryQuery: () => mockUseCurrentTimeEntryQuery(),
  useLogoutMutation: () => mockUseLogoutMutation(),
  useProfileQuery: () => mockUseProfileQuery(),
  useUpdateProfileMutation: () => mockUseUpdateProfileMutation(),
  useUpdateWebSessionMutation: () => mockUseUpdateWebSessionMutation(),
}));

vi.mock("../shared/query/useUserPreferences.ts", () => ({
  useUserPreferences: () => ({
    durationFormat: "improved",
    timeofdayFormat: "HH:mm",
    beginningOfWeek: 1,
    collapseTimeEntries: true,
  }),
}));

vi.mock("../shared/lib/shell-navigation.ts", () => ({
  shellNavigationItems: (...args: unknown[]) => mockShellNavigationItems(...args),
}));

vi.mock("../features/session/WorkspaceSwitcher.tsx", () => ({
  WorkspaceSwitcher: () => <div data-testid="workspace-switcher" />,
}));

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseRouterState.mockReturnValue({
      pathname: "/overview",
      searchStr: "",
    });
    mockUseSession.mockReturnValue({
      availableOrganizations: [],
      currentOrganization: null,
      currentWorkspace: {
        id: 202,
        name: "North Ridge Delivery",
      },
      user: {
        email: "alex@example.com",
        fullName: "Alex North",
        imageUrl: null,
      },
    });
    mockUseSessionActions.mockReturnValue({
      setCurrentWorkspaceId: vi.fn(),
    });
    mockUseCurrentTimeEntryQuery.mockReturnValue({
      data: undefined,
    });
    mockUseLogoutMutation.mockReturnValue({
      mutateAsync: vi.fn(),
    });
    mockUseProfileQuery.mockReturnValue({
      data: {
        email: "alex@example.com",
        fullname: "Alex North",
      },
    });
    mockUseUpdateProfileMutation.mockReturnValue({
      mutateAsync: vi.fn(),
    });
    mockUseUpdateWebSessionMutation.mockReturnValue({
      mutateAsync: vi.fn(),
    });
    mockShellNavigationItems.mockReturnValue([
      {
        items: [
          {
            label: "Overview",
            to: "/overview",
          },
        ],
        title: "Track",
      },
      {
        items: [
          {
            label: "Settings",
            to: "/202/settings/general",
          },
        ],
        title: "Admin",
      },
    ]);
  });

  it("renders the profile rail trigger", () => {
    const markup = renderToStaticMarkup(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    expect(markup).toContain('aria-label="Profile menu"');
    expect(markup).toContain("Profile");
  });

  it("renders the user avatar image when the session includes one", () => {
    mockUseSession.mockReturnValue({
      availableOrganizations: [],
      currentOrganization: null,
      currentWorkspace: {
        id: 202,
        name: "North Ridge Delivery",
      },
      user: {
        email: "alex@example.com",
        fullName: "Alex North",
        imageUrl: "https://cdn.example.com/avatar.png",
      },
    });

    const markup = renderToStaticMarkup(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    expect(markup).toContain('src="https://cdn.example.com/avatar.png"');
    expect(markup).toContain('alt="Alex North"');
  });

  it("falls back to the user initial when no avatar image is available", () => {
    const markup = renderToStaticMarkup(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    expect(markup).toContain(">A</span>");
    expect(markup).not.toContain('src="https://cdn.example.com/avatar.png"');
  });

  it("keeps the workspace switcher outside the sidebar scroll container", () => {
    const markup = renderToStaticMarkup(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );

    expect(markup).toContain('class="shrink-0 overflow-x-clip px-[6px] pb-[5px] pt-2"');
    expect(markup).not.toContain('class="overflow-x-clip overflow-y-auto px-[6px] pt-2"');
  });
});
