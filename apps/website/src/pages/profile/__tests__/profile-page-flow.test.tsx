// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppProviders } from "../../../app/AppProviders.tsx";
import { createAppRouter } from "../../../app/create-app-router.tsx";
import {
  createPreferencesFixture,
  createProfileFixture,
  createSessionFixture,
} from "../../../test/fixtures/web-data.ts";
import { installMockWebApi, jsonResponse } from "../../../test/mock-web-api.ts";

describe("profile page flow", () => {
  it("redirects unauthenticated profile entry to login at the route level", async () => {
    const router = createAppRouter({
      initialEntries: ["/profile"],
    });

    installMockWebApi([
      {
        path: "/web/v1/session",
        resolver: () => jsonResponse("Session missing.", { status: 401 }),
      },
    ]);

    render(<AppProviders router={router} />);

    expect(await screen.findByRole("heading", { name: "Log in to OpenToggl" })).toBeTruthy();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/login");
    });
  });

  it("loads the dedicated profile page and saves profile updates through the web contract", async () => {
    const api = installMockWebApi([
      {
        path: "/web/v1/session",
        resolver: () => jsonResponse(createSessionFixture()),
      },
      {
        path: "/web/v1/profile",
        resolver: () => jsonResponse(createProfileFixture()),
      },
      {
        path: "/web/v1/preferences",
        resolver: () => jsonResponse(createPreferencesFixture()),
      },
      {
        method: "PATCH",
        path: "/web/v1/profile",
        resolver: ({ body }) => jsonResponse({ ...createProfileFixture(), ...(body as object) }),
      },
      {
        method: "PATCH",
        path: "/web/v1/preferences",
        resolver: ({ body }) => jsonResponse(body),
      },
    ]);
    const router = createAppRouter({
      initialEntries: ["/profile"],
    });

    render(<AppProviders router={router} />);

    expect(await screen.findByRole("heading", { name: "Profile" })).toBeTruthy();
    expect(screen.getByText("Account")).toBeTruthy();
    expect(
      screen.getByText("Personal defaults that shape how time, dates, and notifications appear."),
    ).toBeTruthy();
    expect(screen.getByText("Security")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "API token" })).toBeTruthy();
    expect(screen.getByDisplayValue("Alex North")).toBeTruthy();
    expect(screen.getByDisplayValue("api-token-99")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe(
      "/workspaces/202/settings?section=general",
    );

    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Alexandra North" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByText("Profile saved")).toBeTruthy();
    await waitFor(() => {
      expect(api.calls).toContainEqual({
        body: {
          beginning_of_week: 1,
          country_id: 70,
          default_workspace_id: 202,
          email: "alex@example.com",
          fullname: "Alexandra North",
          timezone: "Europe/Tallinn",
        },
        method: "PATCH",
        pathname: "/web/v1/profile",
      });
    });
  });

  it("rotates the current user api token through the web contract", async () => {
    const api = installMockWebApi([
      {
        path: "/web/v1/session",
        resolver: () => jsonResponse(createSessionFixture()),
      },
      {
        path: "/web/v1/profile",
        resolver: () => jsonResponse(createProfileFixture()),
      },
      {
        path: "/web/v1/preferences",
        resolver: () => jsonResponse(createPreferencesFixture()),
      },
      {
        method: "POST",
        path: "/web/v1/profile/api-token/reset",
        resolver: () => jsonResponse({ api_token: "api-token-100" }),
      },
    ]);
    const router = createAppRouter({
      initialEntries: ["/profile"],
    });

    render(<AppProviders router={router} />);

    expect(await screen.findByDisplayValue("api-token-99")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Rotate token" }));

    expect(await screen.findByText("API token rotated")).toBeTruthy();
    expect(screen.getByDisplayValue("api-token-100")).toBeTruthy();
    await waitFor(() => {
      expect(api.calls).toContainEqual({
        body: undefined,
        method: "POST",
        pathname: "/web/v1/profile/api-token/reset",
      });
    });
  });
});
