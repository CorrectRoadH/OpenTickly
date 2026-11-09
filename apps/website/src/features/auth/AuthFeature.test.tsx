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

const mockSsoProvidersQuery = vi.fn();

vi.mock("../../shared/query/web-shell.ts", () => ({
  useLoginMutation: () => mockLoginMutation(),
  useRegisterMutation: () => mockRegisterMutation(),
  useSsoProvidersQuery: () => mockSsoProvidersQuery(),
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
    mockSsoProvidersQuery.mockReturnValue({ data: undefined });
  });

  it("offers the instance OpenID Connect provider when it is enabled", () => {
    mockSsoProvidersQuery.mockReturnValue({
      data: { oidc: { enabled: true, provider_name: "Google", login_path: "/auth/oidc/login" } },
    });

    render(<AuthFeature mode="login" />);

    expect(screen.getByTestId("oidc-login-button")).toHaveTextContent("ssoContinueWith");
  });

  it("hides the OpenID Connect button when the provider is disabled", () => {
    mockSsoProvidersQuery.mockReturnValue({
      data: { oidc: { enabled: false, provider_name: "", login_path: "/auth/oidc/login" } },
    });

    render(<AuthFeature mode="login" />);

    expect(screen.queryByTestId("oidc-login-button")).not.toBeInTheDocument();
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
