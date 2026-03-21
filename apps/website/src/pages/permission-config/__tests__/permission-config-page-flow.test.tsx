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
  it("loads permission policy, saves checkbox updates, and refills form from saved state", async () => {
    let permissions = createWorkspacePermissionsFixture().workspace;
    let resolvePermissionsRequest: (() => void) | null = null;
    const { calls } = installMockWebApi([
      {
        path: "/web/v1/session",
        resolver: () => jsonResponse(createSessionFixture()),
      },
      {
        path: "/web/v1/workspaces/202/permissions",
        resolver: () =>
          new Promise((resolve) => {
            resolvePermissionsRequest = () =>
              resolve(
                jsonResponse({
                  workspace: permissions,
                }),
              );
          }),
      },
      {
        method: "PATCH",
        path: "/web/v1/workspaces/202/permissions",
        resolver: (request) => {
          const body = (request.body as { workspace?: typeof permissions }).workspace;
          permissions = {
            ...permissions,
            ...body,
            only_admins_may_create_tags: false,
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

    await waitFor(() => {
      expect(screen.queryByText("Loading workspace permissions…")).toBeTruthy();
    });

    await waitFor(() => {
      expect(resolvePermissionsRequest).toBeTruthy();
    });
    if (typeof resolvePermissionsRequest !== "function") {
      throw new Error("missing deferred permissions resolver");
    }
    (resolvePermissionsRequest as () => void)();

    expect(await screen.findByRole("heading", { name: "Permission configuration" })).toBeTruthy();
    expect(screen.getByText("Workspace permission policy")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Permissions" }).getAttribute("href")).toBe(
      "/workspaces/202/permissions",
    );
    expect(screen.queryByText(/Transition state/i)).toBeNull();
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
      expect(
        (screen.getByLabelText("Only admins may create tags") as HTMLInputElement).checked,
      ).toBe(false);
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
