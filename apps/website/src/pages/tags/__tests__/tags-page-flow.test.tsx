// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppProviders } from "../../../app/AppProviders.tsx";
import { createAppRouter } from "../../../app/create-app-router.tsx";
import { createSessionFixture, createTagsFixture } from "../../../test/fixtures/web-data.ts";
import { installMockWebApi, jsonResponse } from "../../../test/mock-web-api.ts";

describe("tags page flow", () => {
  it("renders tag directory list with create action and detail entry links", async () => {
    const tags = createTagsFixture().tags.slice();
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
    expect(screen.getByText("Tag directory")).toBeTruthy();
    expect(screen.queryByText(/Transition state/i)).toBeNull();
    expect(screen.queryByText(/Exit when/i)).toBeNull();

    const list = screen.getByLabelText("Tags list");
    expect(within(list).getByText("Urgent")).toBeTruthy();
    expect(within(list).getByText("Ops")).toBeTruthy();
    expect(within(list).getByText(/Tag · Inactive/)).toBeTruthy();
    expect(within(list).getAllByText(/Workspace 202/)).not.toHaveLength(0);
    expect(screen.getByText("Showing 2 tags in workspace 202.")).toBeTruthy();
    expect(screen.getByText("Active: 1")).toBeTruthy();
    expect(
      within(list)
        .getByRole("link", {
          name: "Tag details for Urgent",
        })
        .getAttribute("href"),
    ).toBe("/workspaces/202/tags/701");
    expect(
      within(list)
        .getByRole("link", {
          name: "Tag details for Ops",
        })
        .getAttribute("href"),
    ).toBe("/workspaces/202/tags/702");

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
