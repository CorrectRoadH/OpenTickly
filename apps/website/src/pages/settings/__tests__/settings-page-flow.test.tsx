// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppProviders } from "../../../app/AppProviders.tsx";
import { createAppRouter } from "../../../app/create-app-router.tsx";
import {
  createOrganizationFixture,
  createSessionFixture,
  createWorkspaceFixture,
} from "../../../test/fixtures/web-data.ts";
import { jsonResponse, installMockWebApi } from "../../../test/mock-web-api.ts";

describe("settings page flow", () => {
  it("loads workspace settings, keeps branding URL state, and routes to organization settings", async () => {
    installMockWebApi([
      {
        path: "/web/v1/session",
        resolver: () => jsonResponse(createSessionFixture()),
      },
      {
        path: "/web/v1/workspaces/202/settings",
        resolver: () =>
          jsonResponse({
            capabilities: null,
            organization: createOrganizationFixture(),
            subscription: {
              plan_name: "Starter",
              state: "active",
            },
            workspace: createWorkspaceFixture(),
          }),
      },
      {
        path: "/web/v1/organizations/14/settings",
        resolver: () =>
          jsonResponse({
            organization: createOrganizationFixture(),
            subscription: {
              plan_name: "Starter",
              state: "active",
            },
          }),
      },
    ]);
    const router = createAppRouter({
      initialEntries: ["/workspaces/202/settings?section=branding"],
    });

    render(<AppProviders router={router} />);

    expect(await screen.findByRole("heading", { name: "Workspace settings" })).toBeTruthy();
    expect(
      screen.getByText(
        "Manage workspace defaults, branding, and member-facing behavior for the current workspace.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Branding assets")).toBeTruthy();

    fireEvent.click(screen.getByRole("link", { name: "Organization settings" }));

    expect(await screen.findByRole("heading", { name: "Organization settings" })).toBeTruthy();
    expect(
      screen.getByText("Manage organization-wide governance and settings that apply across workspaces."),
    ).toBeTruthy();
    expect(screen.getByDisplayValue("North Ridge Org")).toBeTruthy();
  });
});
