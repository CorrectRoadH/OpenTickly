/* @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi, beforeEach } from "vite-plus/test";

import { WebApiError } from "../../shared/api/web-client.ts";
import { AuthFeature } from "./AuthFeature.tsx";

const mockNavigate = vi.fn();
const mockLoginMutation = vi.fn();
const mockRegisterMutation = vi.fn();
const mockToastError = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: { type: "3rdParty", init: () => undefined },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: ComponentProps<"a">) => <a {...props}>{children}</a>,
  useNavigate: () => mockNavigate,
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock("../../shared/query/web-shell.ts", () => ({
  useLoginMutation: () => mockLoginMutation(),
  useRegisterMutation: () => mockRegisterMutation(),
}));

describe("AuthFeature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoginMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi
        .fn()
        .mockRejectedValue(new WebApiError("Request failed", 404, "User does not exist.")),
    });
    mockRegisterMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
  });

  it("shows login errors in a toast instead of an inline alert", async () => {
    render(<AuthFeature mode="login" />);

    fireEvent.change(screen.getByLabelText("emailOrUsername"), {
      target: { value: "missing@example.com" },
    });
    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "secret1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "logIn" }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("User does not exist.");
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each(["", "   "])(
    "shows a validation toast for a blank login identifier %j",
    async (email) => {
      const mutateAsync = vi.fn();
      mockLoginMutation.mockReturnValue({ isPending: false, mutateAsync });
      render(<AuthFeature mode="login" />);

      fireEvent.change(screen.getByLabelText("emailOrUsername"), { target: { value: email } });
      fireEvent.change(screen.getByLabelText("password"), { target: { value: "test-fixture" } });
      fireEvent.click(screen.getByRole("button", { name: "logIn" }));

      await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("loginValidation"));
      expect(mutateAsync).not.toHaveBeenCalled();
    },
  );

  it("shows a validation toast for an incomplete registration", async () => {
    const mutateAsync = vi.fn();
    mockRegisterMutation.mockReturnValue({ isPending: false, mutateAsync });
    render(<AuthFeature mode="register" />);

    fireEvent.click(screen.getByRole("button", { name: "register" }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("registerValidation"));
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("links to the SSO login screen on login", () => {
    render(<AuthFeature mode="login" />);

    const link = screen.getByText("ssoButton");
    expect(link.getAttribute("to")).toBe("/login/sso");
  });

  it("does not show the SSO link on register", () => {
    render(<AuthFeature mode="register" />);

    expect(screen.queryByText("ssoButton")).toBeNull();
  });
});
