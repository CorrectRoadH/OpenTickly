// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppProviders } from "../../../app/AppProviders.tsx";
import { createAppRouter } from "../../../app/create-app-router.tsx";
import { createSessionFixture } from "../../../test/fixtures/web-data.ts";
import { installMockWebApi, jsonResponse } from "../../../test/mock-web-api.ts";

describe("projects page flow", () => {
  it("renders projects list and create action in workspace shell", async () => {
    installMockWebApi([
      {
        path: "/web/v1/session",
        resolver: () => jsonResponse(createSessionFixture()),
      },
    ]);

    const router = createAppRouter({
      initialEntries: ["/workspaces/202/projects"],
    });

    render(<AppProviders router={router} />);

    expect(await screen.findByRole("heading", { name: "Projects" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create project" })).toBeTruthy();

    const list = screen.getByLabelText("Projects list");
    expect(within(list).getByText("Website Revamp")).toBeTruthy();
    expect(within(list).getByText("Community Launch")).toBeTruthy();
    expect(within(list).getByText(/Public project · Archived/)).toBeTruthy();
  });
});
