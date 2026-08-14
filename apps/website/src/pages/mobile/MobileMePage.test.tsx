/* @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { MobileMePage } from "./MobileMePage.tsx";

const logout = vi.fn();
const setCurrentWorkspaceId = vi.fn();
const updateWebSession = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("../../shared/ui/UserAvatar.tsx", () => ({
  UserAvatar: () => <div data-testid="user-avatar" />,
}));

vi.mock("../../shared/session/session-context.tsx", () => ({
  useSession: () => ({
    availableOrganizations: [
      { defaultWorkspaceId: 10, id: 1, isCurrent: true, name: "Current organization" },
      { defaultWorkspaceId: 20, id: 2, isCurrent: false, name: "Other organization" },
    ],
    currentWorkspace: { id: 10 },
    user: { email: "user@example.com", fullName: "Mobile user" },
  }),
  useSessionActions: () => ({ setCurrentWorkspaceId }),
}));

vi.mock("../../shared/query/web-shell.ts", () => ({
  useLogoutMutation: () => ({ isPending: false, mutateAsync: logout }),
  useUpdateWebSessionMutation: () => ({ mutateAsync: updateWebSession }),
}));

describe("MobileMePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    logout.mockRejectedValue(new Error("logout failed"));
    updateWebSession.mockRejectedValue(new Error("switch failed"));
  });

  test("rolls back and reports a failed organization switch", async () => {
    render(<MobileMePage />);

    fireEvent.click(screen.getByRole("button", { name: /Other organization/ }));

    await waitFor(() => {
      expect(setCurrentWorkspaceId).toHaveBeenNthCalledWith(1, 20);
      expect(setCurrentWorkspaceId).toHaveBeenNthCalledWith(2, 10);
    });
    expect(toast.error).toHaveBeenCalledWith("workspaceSwitchFailed");
  });

  test("reports a failed logout", async () => {
    render(<MobileMePage />);

    fireEvent.click(screen.getByRole("button", { name: "logOut" }));

    await waitFor(() => {
      expect(logout).toHaveBeenCalledOnce();
      expect(toast.error).toHaveBeenCalledWith("logoutFailed");
    });
  });
});
