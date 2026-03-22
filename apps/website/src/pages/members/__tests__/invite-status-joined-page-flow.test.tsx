// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppProviders } from "../../../app/AppProviders.tsx";
import { createAppRouter } from "../../../app/create-app-router.tsx";
import { createSessionFixture } from "../../../test/fixtures/web-data.ts";
import { installMockWebApi, jsonResponse } from "../../../test/mock-web-api.ts";

describe("invite-status joined page flow", () => {
  it("closes the accepted invite flow with links back into login and the workspace shell", async () => {
    installMockWebApi([
      {
        path: "/web/v1/session",
        resolver: () => jsonResponse(createSessionFixture()),
      },
    ]);

    const router = createAppRouter({
      initialEntries: ["/invite-status/joined?workspaceId=202&workspaceName=North+Ridge+Delivery"],
    });

    render(<AppProviders router={router} />);

    expect(
      await screen.findByRole("heading", { name: "Workspace invitation accepted" }),
    ).toBeTruthy();
    expect(screen.getByText("North Ridge Delivery")).toBeTruthy();

    const workspaceLink = screen.getByRole("link", { name: "Open workspace" });
    expect(workspaceLink.getAttribute("href")).toBe("/workspaces/202");

    const loginLink = screen.getByRole("link", { name: "Log in" });
    expect(loginLink.getAttribute("href")).toBe("/login");

    fireEvent.click(workspaceLink);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Workspace Overview" })).toBeTruthy();
    });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/workspaces/202");
    });
  });

  it("stays public, drops invalid invite search state, and lets the user return to login", async () => {
    const router = createAppRouter({
      initialEntries: ["/invite-status/joined?workspaceId=001&workspaceName=++"],
    });

    installMockWebApi([
      {
        path: "/web/v1/session",
        resolver: () => jsonResponse("Session missing.", { status: 401 }),
      },
    ]);

    render(<AppProviders router={router} />);

    expect(
      await screen.findByRole("heading", { name: "Workspace invitation accepted" }),
    ).toBeTruthy();
    expect(screen.getByText("your workspace")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Open workspace" })).toBeNull();

    fireEvent.click(screen.getByRole("link", { name: "Log in" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Log in to OpenToggl" })).toBeTruthy();
    });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/login");
    });
  });
});
