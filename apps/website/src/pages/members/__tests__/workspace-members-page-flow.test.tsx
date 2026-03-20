// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppProviders } from "../../../app/AppProviders.tsx";
import { createAppRouter } from "../../../app/create-app-router.tsx";
import { createSessionFixture } from "../../../test/fixtures/web-data.ts";
import { installMockWebApi, jsonResponse } from "../../../test/mock-web-api.ts";

describe("workspace members page flow", () => {
  it("renders member list and invite action in workspace shell", async () => {
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
    const list = screen.getByLabelText("Workspace members list");
    expect(within(list).getByText("Alex North")).toBeTruthy();
    expect(within(list).getByText("Jamie Lee")).toBeTruthy();
  });
});
