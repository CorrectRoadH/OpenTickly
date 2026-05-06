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

    fireEvent.change(screen.getByLabelText("email"), {
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
});
