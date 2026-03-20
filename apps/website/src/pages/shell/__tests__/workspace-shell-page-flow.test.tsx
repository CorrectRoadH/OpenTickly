// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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
    expect((screen.getByLabelText("Workspace") as HTMLSelectElement).value).toBe("202");

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
});
