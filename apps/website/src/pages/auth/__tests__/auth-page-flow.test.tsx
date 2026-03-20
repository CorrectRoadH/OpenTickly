// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppProviders } from "../../../app/AppProviders.tsx";
import { createAppRouter } from "../../../app/create-app-router.tsx";
import { installMockWebApi, jsonResponse } from "../../../test/mock-web-api.ts";

describe("auth page flow", () => {
  it("lets users discover registration from the login page", async () => {
    const router = createAppRouter({
      initialEntries: ["/login"],
    });

    render(<AppProviders router={router} />);

    expect(await screen.findByRole("heading", { name: "Log in to OpenToggl" })).toBeTruthy();

    const registerLink = screen.getByRole("link", { name: "Register" });
    expect(registerLink.getAttribute("href")).toBe("/register");

    fireEvent.click(registerLink);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Create your OpenToggl account" })).toBeTruthy();
    });
  });

  it("lets users navigate back to login from the registration page", async () => {
    const router = createAppRouter({
      initialEntries: ["/register"],
    });

    render(<AppProviders router={router} />);

    expect(
      await screen.findByRole("heading", { name: "Create your OpenToggl account" }),
    ).toBeTruthy();

    const loginLink = screen.getByRole("link", { name: "Log in" });
    expect(loginLink.getAttribute("href")).toBe("/login");

    fireEvent.click(loginLink);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Log in to OpenToggl" })).toBeTruthy();
    });
  });

  it("keeps deactivated users in the login flow when the runtime denies access", async () => {
    installMockWebApi([
      {
        method: "POST",
        path: "/web/v1/auth/login",
        resolver: () =>
          jsonResponse("User does not have access to this resource.", {
            status: 403,
          }),
      },
    ]);
    const router = createAppRouter({
      initialEntries: ["/login"],
    });

    render(<AppProviders router={router} />);

    fireEvent.change(await screen.findByLabelText("Email"), {
      target: { value: "alex@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("heading", { name: "Log in to OpenToggl" })).toBeTruthy();
    expect(await screen.findByText("User does not have access to this resource.")).toBeTruthy();
  });
});
