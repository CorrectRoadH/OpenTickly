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
  it("renders contract-shaped member list, invite action, and lifecycle actions in workspace shell", async () => {
    const members = createWorkspaceMembersFixture().members.map((member, index) => ({
      ...member,
      status: index === 0 ? "joined" : index === 1 ? "disabled" : "restored",
    }));
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
            status: "invited",
            hourly_rate: 0,
            labor_cost: 0,
          });
          return jsonResponse({}, { status: 201 });
        },
      },
      {
        method: "POST",
        path: "/web/v1/workspaces/202/members/1/disable",
        resolver: () => {
          const member = members.find((candidate) => candidate.id === 1);
          if (member) {
            member.status = "disabled";
          }
          return jsonResponse(member ?? {}, { status: 200 });
        },
      },
      {
        method: "POST",
        path: "/web/v1/workspaces/202/members/2/restore",
        resolver: () => {
          const member = members.find((candidate) => candidate.id === 2);
          if (member) {
            member.status = "restored";
          }
          return jsonResponse(member ?? {}, { status: 200 });
        },
      },
      {
        method: "DELETE",
        path: "/web/v1/workspaces/202/members/3",
        resolver: () => {
          const memberIndex = members.findIndex((candidate) => candidate.id === 3);
          const [member] = memberIndex >= 0 ? members.splice(memberIndex, 1) : [undefined];
          return jsonResponse(member ? { ...member, status: "removed" } : {}, { status: 200 });
        },
      },
    ]);

    const router = createAppRouter({
      initialEntries: ["/workspaces/202/members"],
    });

    render(<AppProviders router={router} />);

    expect(await screen.findByRole("heading", { name: "Workspace Members" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Invite members" })).toBeTruthy();

    await waitFor(() => {
      const withinList = within(screen.getByLabelText("Workspace members list"));
      members.forEach((member) => {
        expect(withinList.getByText(member.name)).toBeTruthy();
        expect(withinList.getByText(member.email)).toBeTruthy();
        expect(withinList.getByText(member.role)).toBeTruthy();
        expect(withinList.getByText(member.status)).toBeTruthy();
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
      expect(screen.getByText("invited")).toBeTruthy();
    });

    const alexCard = screen.getByText("Alex Johnson").closest("article");
    if (!alexCard) {
      throw new Error("Alex Johnson row not found");
    }
    fireEvent.click(within(alexCard).getByRole("button", { name: "Disable" }));
    await waitFor(() => {
      expect(screen.getByText("Member disabled")).toBeTruthy();
    });

    const baileyCard = screen.getByText("Bailey Lee").closest("article");
    if (!baileyCard) {
      throw new Error("Bailey Lee row not found");
    }
    fireEvent.click(within(baileyCard).getByRole("button", { name: "Restore" }));
    await waitFor(() => {
      expect(screen.getByText("Member restored")).toBeTruthy();
    });

    const caseyCard = screen.getByText("Casey Smith").closest("article");
    if (!caseyCard) {
      throw new Error("Casey Smith row not found");
    }
    fireEvent.click(within(caseyCard).getByRole("button", { name: "Remove" }));
    await waitFor(() => {
      expect(screen.getByText("Member removed")).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.queryByText("Casey Smith")).toBeNull();
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
    expect(
      calls.some(
        (call) =>
          call.method === "POST" && call.pathname === "/web/v1/workspaces/202/members/1/disable",
      ),
    ).toBe(true);
    expect(
      calls.some(
        (call) =>
          call.method === "POST" && call.pathname === "/web/v1/workspaces/202/members/2/restore",
      ),
    ).toBe(true);
    expect(
      calls.some(
        (call) => call.method === "DELETE" && call.pathname === "/web/v1/workspaces/202/members/3",
      ),
    ).toBe(true);
  });
});
