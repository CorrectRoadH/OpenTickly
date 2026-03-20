// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppProviders } from "../../../app/AppProviders.tsx";
import { createAppRouter } from "../../../app/create-app-router.tsx";
import { createGroupsFixture, createSessionFixture } from "../../../test/fixtures/web-data.ts";
import { installMockWebApi, jsonResponse } from "../../../test/mock-web-api.ts";

describe("groups page flow", () => {
  it("renders groups list, preserves the groups path across workspace switches, and creates groups", async () => {
    const groupsByWorkspace: Record<
      number,
      Array<{ active: boolean; id: number; name: string; workspace_id: number }>
    > = {
      202: createGroupsFixture().groups.slice(),
      303: createGroupsFixture({
        groups: [
          {
            id: 903,
            name: "Studio leads",
            workspace_id: 303,
            active: true,
          },
          {
            id: 904,
            name: "Seasonal support",
            workspace_id: 303,
            active: false,
          },
        ],
      }).groups.slice(),
    };

    const { calls } = installMockWebApi([
      {
        path: "/web/v1/session",
        resolver: () => jsonResponse(createSessionFixture()),
      },
      {
        path: "/web/v1/groups",
        resolver: (request) => {
          const workspaceId = Number(
            new URLSearchParams(request.search).get("workspace_id") ?? "202",
          );

          return jsonResponse({
            groups: groupsByWorkspace[workspaceId] ?? [],
          });
        },
      },
      {
        method: "POST",
        path: "/web/v1/groups",
        resolver: (request) => {
          const body = request.body as { name?: string; workspace_id?: number };
          const workspaceId = body.workspace_id ?? 202;
          const groups = groupsByWorkspace[workspaceId] ?? [];
          const createdGroup = {
            id: workspaceId === 303 ? 905 : 905,
            name: body.name ?? "Untitled group",
            workspace_id: workspaceId,
            active: true,
          };

          groups.push(createdGroup);
          groupsByWorkspace[workspaceId] = groups;

          return jsonResponse(createdGroup, { status: 201 });
        },
      },
    ]);

    const router = createAppRouter({
      initialEntries: ["/workspaces/202/groups"],
    });

    render(<AppProviders router={router} />);

    expect(await screen.findByRole("heading", { name: "Groups" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Groups" }).getAttribute("href")).toBe(
      "/workspaces/202/groups",
    );

    const initialList = screen.getByLabelText("Groups list");
    expect(within(initialList).getByText("Marketing pod")).toBeTruthy();
    expect(within(initialList).getByText("Contractors")).toBeTruthy();
    expect(within(initialList).getByText(/Contract-backed group · Inactive/)).toBeTruthy();
    expect(within(initialList).getAllByText(/Workspace 202/)).not.toHaveLength(0);

    fireEvent.change(screen.getByLabelText("Workspace"), {
      target: { value: "303" },
    });

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Groups" }).getAttribute("href")).toBe(
        "/workspaces/303/groups",
      );
      expect(screen.getByText("Studio leads")).toBeTruthy();
    });

    const switchedList = screen.getByLabelText("Groups list");
    expect(within(switchedList).getByText("Studio leads")).toBeTruthy();
    expect(within(switchedList).getByText("Seasonal support")).toBeTruthy();
    expect(within(switchedList).getAllByText(/Workspace 303/)).not.toHaveLength(0);

    fireEvent.change(screen.getByLabelText("Group name"), {
      target: { value: "Field ops" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save group" }));

    await waitFor(() => {
      expect(screen.getByText("Group created")).toBeTruthy();
      expect(screen.getByText("Field ops")).toBeTruthy();
    });

    expect(
      calls.some(
        (call) =>
          call.method === "POST" &&
          call.pathname === "/web/v1/groups" &&
          (call.body as { name?: string; workspace_id?: number }).name === "Field ops" &&
          (call.body as { name?: string; workspace_id?: number }).workspace_id === 303,
      ),
    ).toBe(true);
  });
});
