// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppProviders } from "../../../app/AppProviders.tsx";
import { createAppRouter } from "../../../app/create-app-router.tsx";
import { createSessionFixture } from "../../../test/fixtures/web-data.ts";
import { installMockWebApi, jsonResponse } from "../../../test/mock-web-api.ts";

describe("tags page flow", () => {
  it("renders tags list and create action in workspace shell", async () => {
    const tags = [
      {
        id: 701,
        name: "Urgent",
        workspace_id: 202,
        active: true,
      },
      {
        id: 702,
        name: "Ops",
        workspace_id: 202,
        active: false,
      },
    ];
    const { calls } = installMockWebApi([
      {
        path: "/web/v1/session",
        resolver: () => jsonResponse(createSessionFixture()),
      },
      {
        path: "/web/v1/tags",
        resolver: () => jsonResponse({ tags }),
      },
      {
        method: "POST",
        path: "/web/v1/tags",
        resolver: (request) => {
          const body = request.body as { name?: string; workspace_id?: number };
          tags.push({
            id: 703,
            name: body.name ?? "Untitled",
            workspace_id: body.workspace_id ?? 202,
            active: true,
          });
          return jsonResponse(tags[tags.length - 1], { status: 201 });
        },
      },
    ]);

    const router = createAppRouter({
      initialEntries: ["/workspaces/202/tags"],
    });

    render(<AppProviders router={router} />);

    expect(await screen.findByRole("heading", { name: "Tags" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Tags" }).getAttribute("href")).toBe(
      "/workspaces/202/tags",
    );
    expect(screen.getByRole("button", { name: "Create tag" })).toBeTruthy();

    const list = screen.getByLabelText("Tags list");
    expect(within(list).getByText("Urgent")).toBeTruthy();
    expect(within(list).getByText("Ops")).toBeTruthy();
    expect(within(list).getByText(/Contract-backed tag · Inactive/)).toBeTruthy();
    expect(within(list).getAllByText(/Workspace 202/)).not.toHaveLength(0);

    fireEvent.change(screen.getByLabelText("Tag name"), {
      target: { value: "Client-visible" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save tag" }));

    await waitFor(() => {
      expect(screen.getByText("Tag created")).toBeTruthy();
      expect(screen.getByText("Client-visible")).toBeTruthy();
    });

    expect(
      calls.some(
        (call) =>
          call.method === "POST" &&
          call.pathname === "/web/v1/tags" &&
          (call.body as { name?: string; workspace_id?: number }).name === "Client-visible" &&
          (call.body as { name?: string; workspace_id?: number }).workspace_id === 202,
      ),
    ).toBe(true);
  });
});
