/* @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { WebApiError } from "../../shared/api/web-client.ts";
import { AuthFeature } from "./AuthFeature.tsx";

const mockNavigate = vi.fn();
const mockLoginMutation = vi.fn();
const mockRegisterMutation = vi.fn();
const mockToastError = vi.fn();
const mockSsoInfo = vi.fn();

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
  useSsoInfoQuery: () => mockSsoInfo(),
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
    mockSsoInfo.mockReturnValue({ data: { enabled: false, providerName: "SSO" } });
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

  it("renders the SSO button on login when SSO is enabled", () => {
    mockSsoInfo.mockReturnValue({ data: { enabled: true, providerName: "Okta" } });
    render(<AuthFeature mode="login" />);

    expect(screen.getByRole("button", { name: "continueWithSso" })).toBeTruthy();
  });

  it("hides the SSO button when SSO is disabled", () => {
    mockSsoInfo.mockReturnValue({ data: { enabled: false, providerName: "SSO" } });
    render(<AuthFeature mode="login" />);

    expect(screen.queryByRole("button", { name: "continueWithSso" })).toBeNull();
  });
});
