import { fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { WebApiError } from "../../shared/api/web-client.ts";
import { InviteMemberDialog } from "./InviteMemberDialog.tsx";

const mutate = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("../../shared/session/session-context.tsx", () => ({
  useSession: () => ({ currentWorkspace: { id: 16 } }),
}));

vi.mock("../../shared/query/web-shell.ts", () => ({
  useInviteWorkspaceMemberMutation: () => ({ isPending: false, mutate }),
}));

describe("InviteMemberDialog", () => {
  beforeEach(() => {
    mutate.mockReset();
    vi.mocked(toast.error).mockReset();
    vi.mocked(toast.success).mockReset();
  });

  test("submits a valid invitation and reports success", () => {
    const onClose = vi.fn();
    render(<InviteMemberDialog onClose={onClose} />);

    fireEvent.change(screen.getByLabelText("emailAddress"), {
      target: { value: "member@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "sendInvite" }));

    expect(mutate).toHaveBeenCalledOnce();
    const [request, callbacks] = mutate.mock.calls[0]!;
    expect(request).toEqual({ email: "member@example.com", role: "member" });

    callbacks.onSuccess();
    expect(toast.success).toHaveBeenCalledWith("toast:invitationSent");
    expect(onClose).toHaveBeenCalledOnce();
  });

  test("turns a delivery timeout into an actionable error", () => {
    render(<InviteMemberDialog onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("emailAddress"), {
      target: { value: "member@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "sendInvite" }));

    const callbacks = mutate.mock.calls[0]![1];
    callbacks.onError(
      new WebApiError("request failed", 422, {
        error: "timeout",
        message: "smtp dial failed",
      }),
    );
    expect(toast.error).toHaveBeenCalledWith("toast:testEmailTimeout");
  });
});
