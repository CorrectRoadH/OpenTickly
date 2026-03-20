// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppProviders } from "../../../app/AppProviders.tsx";
import { createAppRouter } from "../../../app/create-app-router.tsx";
import { createSessionFixture } from "../../../test/fixtures/web-data.ts";
import { installMockWebApi, jsonResponse } from "../../../test/mock-web-api.ts";

describe("workspace members page flow", () => {
  it("renders contract-shaped member list and invite action in workspace shell", async () => {
    installMockWebApi([
      {
        path: "/web/v1/session",
        resolver: () => jsonResponse(createSessionFixture()),
      },
    ]);

    const router = createAppRouter({
      initialEntries: ["/workspaces/202/members"],
    });

    render(<AppProviders router={router} />);

    expect(await screen.findByRole("heading", { name: "Workspace Members" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Invite members" })).toBeTruthy();

    const membersList = screen.getByLabelText("Workspace members list");
    const withinList = within(membersList);

    const expectedMembers = [
      {
        id: "mem-1",
        workspace_id: "ws-123",
        email: "alex@example.com",
        name: "Alex Johnson",
        role: "owner",
      },
      {
        id: "mem-2",
        workspace_id: "ws-123",
        email: "bailey@example.com",
        name: "Bailey Lee",
        role: "admin",
      },
      {
        id: "mem-3",
        workspace_id: "ws-123",
        email: "casey@example.com",
        name: "Casey Smith",
        role: "member",
      },
    ];

    expectedMembers.forEach((member) => {
      expect(withinList.getByText(member.name)).toBeTruthy();
      expect(withinList.getByText(member.email)).toBeTruthy();
      expect(withinList.getByText(member.role)).toBeTruthy();
      expect(withinList.getAllByText(member.workspace_id).length).toBeGreaterThan(0);
      expect(withinList.getByText(member.id)).toBeTruthy();
    });
  });
});
