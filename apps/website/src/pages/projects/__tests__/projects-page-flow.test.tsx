// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppProviders } from "../../../app/AppProviders.tsx";
import { createAppRouter } from "../../../app/create-app-router.tsx";
import {
  createProjectMembersFixture,
  createProjectsFixture,
  createSessionFixture,
} from "../../../test/fixtures/web-data.ts";
import { installMockWebApi, jsonResponse } from "../../../test/mock-web-api.ts";

describe("projects page flow", () => {
  it("renders projects with visible contract-backed member rows in the workspace shell", async () => {
    const projects = createProjectsFixture().projects.slice();
    const { calls } = installMockWebApi([
      {
        path: "/web/v1/session",
        resolver: () => jsonResponse(createSessionFixture()),
      },
      {
        path: "/web/v1/projects",
        resolver: () => jsonResponse({ projects }),
      },
      {
        method: "POST",
        path: "/web/v1/projects",
        resolver: (request) => {
          const body = request.body as { name?: string; workspace_id?: number };
          projects.push({
            id: 1003,
            name: body.name ?? "Untitled",
            workspace_id: body.workspace_id ?? 202,
            active: true,
          });
          return jsonResponse(projects[projects.length - 1], { status: 201 });
        },
      },
      {
        path: "/web/v1/projects/1001/members",
        resolver: () =>
          jsonResponse(
            createProjectMembersFixture({
              members: [
                {
                  project_id: 1001,
                  member_id: 99,
                  role: "admin",
                },
                {
                  project_id: 1001,
                  member_id: 17,
                  role: "member",
                },
              ],
            }),
          ),
      },
      {
        path: "/web/v1/projects/1002/members",
        resolver: () =>
          jsonResponse(
            createProjectMembersFixture({
              members: [],
            }),
          ),
      },
      {
        path: "/web/v1/projects/1003/members",
        resolver: () =>
          jsonResponse(
            createProjectMembersFixture({
              members: [],
            }),
          ),
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
    expect(within(list).getByText(/Contract-backed project · Inactive/)).toBeTruthy();
    expect(within(list).getByText("Workspace 202 · 2 members")).toBeTruthy();
    expect(within(list).getByText("Workspace 202 · 0 members")).toBeTruthy();

    const websiteRevampProject = within(list).getByLabelText("Project Website Revamp");
    expect(within(websiteRevampProject).getByText("Member 99")).toBeTruthy();
    expect(within(websiteRevampProject).getByText("Admin")).toBeTruthy();
    expect(within(websiteRevampProject).getByText("Member 17")).toBeTruthy();
    expect(within(websiteRevampProject).getByText("Member")).toBeTruthy();

    const communityLaunchProject = within(list).getByLabelText("Project Community Launch");
    expect(within(communityLaunchProject).getByText("No members assigned")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Launch Website" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save project" }));

    await waitFor(() => {
      expect(screen.getByText("Project created")).toBeTruthy();
      expect(screen.getByText("Launch Website")).toBeTruthy();
    });

    expect(
      calls.some(
        (call) =>
          call.method === "POST" &&
          call.pathname === "/web/v1/projects" &&
          (call.body as { name?: string; workspace_id?: number }).name === "Launch Website" &&
          (call.body as { name?: string; workspace_id?: number }).workspace_id === 202,
      ),
    ).toBe(true);
  });
});
