// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppProviders } from "../../../app/AppProviders.tsx";
import { createAppRouter } from "../../../app/create-app-router.tsx";
import {
  createSessionFixture,
  createWorkspacePermissionsFixture,
} from "../../../test/fixtures/web-data.ts";
import { installMockWebApi, jsonResponse } from "../../../test/mock-web-api.ts";

describe("permission config page flow", () => {
  it("renders workspace permission toggles and saves updates in the shell", async () => {
    let permissions = createWorkspacePermissionsFixture().workspace;
    const { calls } = installMockWebApi([
      {
        path: "/web/v1/session",
        resolver: () => jsonResponse(createSessionFixture()),
      },
      {
        path: "/web/v1/workspaces/202/permissions",
        resolver: () =>
          jsonResponse({
            workspace: permissions,
          }),
      },
      {
        method: "PATCH",
        path: "/web/v1/workspaces/202/permissions",
        resolver: (request) => {
          permissions = {
            ...permissions,
            ...(request.body as Partial<typeof permissions>),
          };

          return jsonResponse(
            {
              workspace: permissions,
            },
            { status: 200 },
          );
        },
      },
    ]);

    const router = createAppRouter({
      initialEntries: ["/workspaces/202/permissions"],
    });

    render(<AppProviders router={router} />);

    expect(await screen.findByRole("heading", { name: "Permission configuration" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Permissions" }).getAttribute("href")).toBe(
      "/workspaces/202/permissions",
    );
    expect(
      screen.getByText(
        /This page exposes the current permission toggles, but the documented permission configuration surface still needs its final workspace governance layout and review flow/,
      ),
    ).toBeTruthy();
    expect(
      (screen.getByLabelText("Only admins may create projects") as HTMLInputElement).checked,
    ).toBe(false);
    expect((screen.getByLabelText("Only admins may create tags") as HTMLInputElement).checked).toBe(
      true,
    );
    expect(
      (screen.getByLabelText("Only admins see team dashboard") as HTMLInputElement).checked,
    ).toBe(false);
    expect((screen.getByLabelText("Limit public project data") as HTMLInputElement).checked).toBe(
      false,
    );

    fireEvent.click(screen.getByLabelText("Only admins may create projects"));
    fireEvent.click(screen.getByLabelText("Limit public project data"));
    fireEvent.click(screen.getByRole("button", { name: "Save permissions" }));

    await waitFor(() => {
      expect(screen.getByText("Permissions saved")).toBeTruthy();
    });

    expect(
      calls.some(
        (call) =>
          call.method === "PATCH" &&
          call.pathname === "/web/v1/workspaces/202/permissions" &&
          (call.body as { workspace?: typeof permissions }).workspace
            ?.only_admins_may_create_projects === true &&
          (call.body as { workspace?: typeof permissions }).workspace
            ?.only_admins_may_create_tags === true &&
          (call.body as { workspace?: typeof permissions }).workspace
            ?.only_admins_see_team_dashboard === false &&
          (call.body as { workspace?: typeof permissions }).workspace?.limit_public_project_data ===
            true,
      ),
    ).toBe(true);
  });
});
