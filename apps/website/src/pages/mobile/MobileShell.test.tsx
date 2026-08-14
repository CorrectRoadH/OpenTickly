/* @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { MobileShell } from "./MobileShell.tsx";

const outletRender = vi.fn();

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => undefined },
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../app/i18n.ts", () => ({
  default: { changeLanguage: vi.fn(), language: "en" },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  Outlet: () => {
    outletRender();
    return <main>page content</main>;
  },
  useRouterState: () => "/m/timer",
}));

vi.mock("../../shared/session/session-context.tsx", () => ({
  useSession: () => ({ currentWorkspace: { id: 10 } }),
}));

vi.mock("../../shared/query/useUserPreferences.ts", () => ({
  useUserPreferences: () => ({ showTimeInTitle: false }),
}));

vi.mock("../../shared/query/web-shell.ts", () => ({
  useCurrentTimeEntryQuery: () => ({ data: null }),
  useStartTimeEntryMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useStopTimeEntryMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useTimeEntriesQuery: () => ({ data: [], isSuccess: true }),
}));

vi.mock("./OfflineBanner.tsx", () => ({ OfflineBanner: () => null }));
vi.mock("./PwaInstallBanner.tsx", () => ({ PwaInstallBanner: () => null }));

describe("MobileShell", () => {
  beforeEach(() => {
    outletRender.mockClear();
  });

  test("typing in the timer composer does not re-render the routed page", () => {
    render(<MobileShell />);
    expect(outletRender).toHaveBeenCalledOnce();

    fireEvent.change(screen.getByPlaceholderText("whatAreYouWorkingOn"), {
      target: { value: "isolated draft" },
    });

    expect(outletRender).toHaveBeenCalledOnce();
  });
});
