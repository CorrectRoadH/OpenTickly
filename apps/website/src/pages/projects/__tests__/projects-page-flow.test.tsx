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
  it("renders project archive and pin controls with status-filtered list behavior", async () => {
    const projects = createProjectsFixture().projects.slice();
    const { calls } = installMockWebApi([
      {
        path: "/web/v1/session",
        resolver: () => jsonResponse(createSessionFixture()),
      },
      {
        path: "/web/v1/projects",
        resolver: (request) => {
          const searchParams = new URLSearchParams(request.search);
          const status = searchParams.get("status") ?? "all";
          const filteredProjects = projects.filter((project) => {
            if (status === "active") {
              return project.active;
            }

            if (status === "archived") {
              return !project.active;
            }

            return true;
          });

          return jsonResponse({ projects: filteredProjects });
        },
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
            pinned: false,
          });
          return jsonResponse(projects[projects.length - 1], { status: 201 });
        },
      },
      {
        method: "POST",
        path: "/web/v1/projects/1001/pin",
        resolver: () => {
          const project = projects.find((candidate) => candidate.id === 1001);
          if (!project) {
            throw new Error("missing project 1001");
          }
          project.pinned = true;
          return jsonResponse(project);
        },
      },
      {
        method: "DELETE",
        path: "/web/v1/projects/1002/pin",
        resolver: () => {
          const project = projects.find((candidate) => candidate.id === 1002);
          if (!project) {
            throw new Error("missing project 1002");
          }
          project.pinned = false;
          return jsonResponse(project);
        },
      },
      {
        method: "POST",
        path: "/web/v1/projects/1001/archive",
        resolver: () => {
          const project = projects.find((candidate) => candidate.id === 1001);
          if (!project) {
            throw new Error("missing project 1001");
          }
          project.active = false;
          return jsonResponse(project);
        },
      },
      {
        method: "DELETE",
        path: "/web/v1/projects/1002/archive",
        resolver: () => {
          const project = projects.find((candidate) => candidate.id === 1002);
          if (!project) {
            throw new Error("missing project 1002");
          }
          project.active = true;
          return jsonResponse(project);
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
    expect(screen.getByText("Project directory")).toBeTruthy();
    expect(screen.queryByText(/Transition state/i)).toBeNull();
    expect(screen.queryByText(/Exit when/i)).toBeNull();

    const list = screen.getByLabelText("Projects list");
    expect(within(list).getByText("Website Revamp")).toBeTruthy();
    expect(within(list).getByText("Community Launch")).toBeTruthy();
    expect(within(list).getByText(/Project · Archived/)).toBeTruthy();
    expect(within(list).getByText("Workspace 202 · 2 members")).toBeTruthy();
    expect(within(list).getByText("Workspace 202 · 0 members")).toBeTruthy();
    expect(screen.getByText("Showing 2 projects in workspace 202.")).toBeTruthy();
    expect(screen.getByText("Active: 1 · Pinned: 1")).toBeTruthy();
    expect(screen.getByLabelText("Project status filter")).toBeTruthy();

    const websiteRevampProject = within(list).getByLabelText("Project Website Revamp");
    expect(within(websiteRevampProject).getByText("Member 99")).toBeTruthy();
    expect(within(websiteRevampProject).getByText("Admin")).toBeTruthy();
    expect(within(websiteRevampProject).getByText("Member 17")).toBeTruthy();
    expect(within(websiteRevampProject).getByText("Member")).toBeTruthy();
    expect(
      within(websiteRevampProject).getByRole("button", { name: "Pin project Website Revamp" }),
    ).toBeTruthy();
    expect(
      within(websiteRevampProject).getByRole("button", { name: "Archive project Website Revamp" }),
    ).toBeTruthy();
    expect(
      within(websiteRevampProject)
        .getByRole("link", {
          name: "Project details for Website Revamp",
        })
        .getAttribute("href"),
    ).toBe("/workspaces/202/projects/1001");
    expect(
      within(websiteRevampProject)
        .getByRole("link", {
          name: "Project tasks for Website Revamp",
        })
        .getAttribute("href"),
    ).toBe("/workspaces/202/tasks?projectId=1001");

    const communityLaunchProject = within(list).getByLabelText("Project Community Launch");
    expect(within(communityLaunchProject).getByText("No members assigned")).toBeTruthy();
    expect(within(communityLaunchProject).getByText("Pinned")).toBeTruthy();
    expect(
      within(communityLaunchProject).getByRole("button", {
        name: "Restore project Community Launch",
      }),
    ).toBeTruthy();
    expect(
      within(communityLaunchProject).getByRole("button", {
        name: "Unpin project Community Launch",
      }),
    ).toBeTruthy();
    expect(
      within(communityLaunchProject)
        .getByRole("link", {
          name: "Project details for Community Launch",
        })
        .getAttribute("href"),
    ).toBe("/workspaces/202/projects/1002");
    expect(
      within(communityLaunchProject)
        .getByRole("link", {
          name: "Project tasks for Community Launch",
        })
        .getAttribute("href"),
    ).toBe("/workspaces/202/tasks?projectId=1002");

    fireEvent.click(
      within(websiteRevampProject).getByRole("button", { name: "Pin project Website Revamp" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Pinned project Website Revamp")).toBeTruthy();
      expect(
        within(screen.getByLabelText("Project Website Revamp")).getByText("Pinned"),
      ).toBeTruthy();
    });

    fireEvent.click(
      within(screen.getByLabelText("Project Website Revamp")).getByRole("button", {
        name: "Archive project Website Revamp",
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("Archived project Website Revamp")).toBeTruthy();
      expect(
        within(screen.getByLabelText("Project Website Revamp")).getByText(/Project · Archived/),
      ).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Project status filter"), {
      target: { value: "archived" },
    });

    await waitFor(() => {
      const archivedList = screen.getByLabelText("Projects list");
      expect(within(archivedList).getByText("Website Revamp")).toBeTruthy();
      expect(within(archivedList).getByText("Community Launch")).toBeTruthy();
      expect(within(archivedList).queryByText("Launch Website")).toBeNull();
    });

    fireEvent.change(screen.getByLabelText("Project status filter"), {
      target: { value: "all" },
    });

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
    expect(
      calls.some((call) => call.method === "POST" && call.pathname === "/web/v1/projects/1001/pin"),
    ).toBe(true);
    expect(
      calls.some(
        (call) => call.method === "POST" && call.pathname === "/web/v1/projects/1001/archive",
      ),
    ).toBe(true);
  });

  it("shows a formal empty state when the selected status has no matching projects", async () => {
    installMockWebApi([
      {
        path: "/web/v1/session",
        resolver: () => jsonResponse(createSessionFixture()),
      },
      {
        path: "/web/v1/projects",
        resolver: (request) => {
          const searchParams = new URLSearchParams(request.search);
          const status = searchParams.get("status") ?? "all";

          return jsonResponse({
            projects:
              status === "archived"
                ? []
                : [
                    {
                      id: 1001,
                      name: "Website Revamp",
                      workspace_id: 202,
                      active: true,
                      pinned: false,
                    },
                  ],
          });
        },
      },
      {
        path: "/web/v1/projects/1001/members",
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

    fireEvent.change(screen.getByLabelText("Project status filter"), {
      target: { value: "archived" },
    });

    await waitFor(() => {
      expect(screen.getByText("No archived projects in this workspace yet.")).toBeTruthy();
      expect(
        screen.getByText(
          "Adjust the filter or create a project to keep project tasks, members, and reporting links discoverable from the project page.",
        ),
      ).toBeTruthy();
      expect(screen.getByText("Showing 0 projects in workspace 202.")).toBeTruthy();
      expect(screen.getByText("Active: 0 · Pinned: 0")).toBeTruthy();
    });
  });
});
