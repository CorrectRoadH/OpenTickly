// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppProviders } from "../../../app/AppProviders.tsx";
import { createAppRouter } from "../../../app/create-app-router.tsx";
import { createSessionFixture } from "../../../test/fixtures/web-data.ts";
import { installMockWebApi, jsonResponse } from "../../../test/mock-web-api.ts";

describe("workspace shell page flow", () => {
  it("boots from the session contract, redirects into the current workspace, and supports switcher navigation", async () => {
    installMockWebApi([
      {
        path: "/web/v1/session",
        resolver: () => jsonResponse(createSessionFixture()),
      },
      {
        path: /\/web\/v1\/workspaces\/\d+\/settings/,
        resolver: ({ pathname }) => {
          const workspaceId = Number(pathname.split("/")[4]);
          return jsonResponse({
            capabilities: null,
            organization: {
              id: 14,
              name: "North Ridge Org",
            },
            workspace: {
              id: workspaceId,
              organization_id: 14,
              name: workspaceId === 303 ? "North Ridge Studio" : "North Ridge Delivery",
            },
          });
        },
      },
    ]);
    const firstRouter = createAppRouter({
      initialEntries: ["/"],
    });

    const firstRender = render(<AppProviders router={firstRouter} />);

    expect(await screen.findByRole("heading", { name: "Workspace Overview" })).toBeTruthy();
    expect(within(screen.getByTestId("shell-hero")).getByText("Workspace access")).toBeTruthy();
    expect((screen.getByLabelText("Workspace") as HTMLSelectElement).value).toBe("202");
    expect(screen.getByText("Workspace")).toBeTruthy();
    expect(within(screen.getByTestId("shell-hero")).getByText("Profile")).toBeTruthy();
    expect(screen.getByText("Workspace scope")).toBeTruthy();
    expect(screen.getByText("Alex North")).toBeTruthy();
    expect(screen.getByText("alex@example.com")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Workspace"), {
      target: { value: "303" },
    });

    expect(await screen.findByRole("heading", { name: "Workspace Overview" })).toBeTruthy();
    expect((screen.getByLabelText("Workspace") as HTMLSelectElement).value).toBe("303");

    fireEvent.click(screen.getByRole("link", { name: "Settings" }));

    expect(await screen.findByRole("heading", { name: "Workspace settings" })).toBeTruthy();

    firstRender.unmount();

    const reloadedRouter = createAppRouter({
      initialEntries: ["/workspaces/303"],
    });

    render(<AppProviders router={reloadedRouter} />);

    expect(await screen.findByRole("heading", { name: "Workspace Overview" })).toBeTruthy();
    expect((screen.getByLabelText("Workspace") as HTMLSelectElement).value).toBe("303");
  });

  it("fails closed to login when the current session is denied by the runtime", async () => {
    installMockWebApi([
      {
        path: "/web/v1/session",
        resolver: () =>
          jsonResponse("User does not have access to this resource.", {
            status: 403,
          }),
      },
    ]);
    const router = createAppRouter({
      initialEntries: ["/workspaces/202"],
    });

    render(<AppProviders router={router} />);

    expect(await screen.findByRole("heading", { name: "Log in to OpenToggl" })).toBeTruthy();
  });

  it("exposes logout in the shell, clears session access, and returns users to login", async () => {
    let signedOut = false;

    const { calls } = installMockWebApi([
      {
        path: "/web/v1/session",
        resolver: () =>
          signedOut
            ? jsonResponse("Session missing.", { status: 401 })
            : jsonResponse(createSessionFixture()),
      },
      {
        method: "POST",
        path: "/web/v1/auth/logout",
        resolver: () => {
          signedOut = true;
          return new Response(null, { status: 204 });
        },
      },
    ]);
    const router = createAppRouter({
      initialEntries: ["/workspaces/202"],
    });

    render(<AppProviders router={router} />);

    expect(await screen.findByRole("heading", { name: "Workspace Overview" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    await waitFor(() =>
      expect(
        calls.some((call) => call.method === "POST" && call.pathname === "/web/v1/auth/logout"),
      ).toBe(true),
    );

    expect(await screen.findByRole("heading", { name: "Log in to OpenToggl" })).toBeTruthy();

    await router.navigate({
      to: "/workspaces/$workspaceId",
      params: { workspaceId: "202" },
    });

    expect(await screen.findByRole("heading", { name: "Log in to OpenToggl" })).toBeTruthy();
  });
});
