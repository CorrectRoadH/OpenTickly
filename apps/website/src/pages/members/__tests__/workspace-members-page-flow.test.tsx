// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppProviders } from "../../../app/AppProviders.tsx";
import { createAppRouter } from "../../../app/create-app-router.tsx";
import {
  createSessionFixture,
  createWorkspaceMembersFixture,
} from "../../../test/fixtures/web-data.ts";
import { installMockWebApi, jsonResponse } from "../../../test/mock-web-api.ts";

describe("workspace members page flow", () => {
  it("renders contract-shaped member list and invite action in workspace shell", async () => {
    const members = createWorkspaceMembersFixture().members.slice();
    const { calls } = installMockWebApi([
      {
        path: "/web/v1/session",
        resolver: () => jsonResponse(createSessionFixture()),
      },
      {
        path: "/web/v1/workspaces/202/members",
        resolver: () =>
          jsonResponse({
            members,
          }),
      },
      {
        method: "POST",
        path: "/web/v1/workspaces/202/members/invitations",
        resolver: (request) => {
          const email = (request.body as { email?: string }).email ?? "";
          const role = (request.body as { role?: string }).role ?? "member";
          members.push({
            id: 4,
            workspace_id: 202,
            email,
            name: "new.member",
            role,
          });
          return jsonResponse({}, { status: 201 });
        },
      },
    ]);

    const router = createAppRouter({
      initialEntries: ["/workspaces/202/members"],
    });

    render(<AppProviders router={router} />);

    expect(await screen.findByRole("heading", { name: "Workspace Members" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Invite members" })).toBeTruthy();

    const expectedMembers = createWorkspaceMembersFixture().members;

    await waitFor(() => {
      const withinList = within(screen.getByLabelText("Workspace members list"));
      expectedMembers.forEach((member) => {
        expect(withinList.getByText(member.name)).toBeTruthy();
        expect(withinList.getByText(member.email)).toBeTruthy();
        expect(withinList.getByText(member.role)).toBeTruthy();
        expect(withinList.getAllByText(String(member.workspace_id)).length).toBeGreaterThan(0);
        expect(withinList.getByText(String(member.id))).toBeTruthy();
      });
    });

    fireEvent.change(screen.getByLabelText("Invite by email"), {
      target: { value: "new.member@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Role"), {
      target: { value: "admin" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send invite" }));

    await waitFor(() => {
      expect(screen.getByText("Invitation sent")).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByText("new.member@example.com")).toBeTruthy();
    });

    expect(
      calls.some(
        (call) =>
          call.method === "POST" &&
          call.pathname === "/web/v1/workspaces/202/members/invitations" &&
          (call.body as { email?: string; role?: string }).email === "new.member@example.com" &&
          (call.body as { email?: string; role?: string }).role === "admin",
      ),
    ).toBe(true);
  });
});
