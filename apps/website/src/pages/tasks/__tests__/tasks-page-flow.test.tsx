// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppProviders } from "../../../app/AppProviders.tsx";
import { createAppRouter } from "../../../app/create-app-router.tsx";
import { createSessionFixture, createTasksFixture } from "../../../test/fixtures/web-data.ts";
import { installMockWebApi, jsonResponse } from "../../../test/mock-web-api.ts";

describe("tasks page flow", () => {
  it("renders project-scoped task entry, preserves the tasks path across workspace switches, and creates tasks", async () => {
    const tasksByWorkspace: Record<
      number,
      Array<{ active: boolean; id: number; name: string; workspace_id: number }>
    > = {
      202: createTasksFixture().tasks.slice(),
      303: createTasksFixture({
        tasks: [
          {
            id: 801,
            name: "Studio QA",
            workspace_id: 303,
            active: true,
          },
          {
            id: 802,
            name: "Billing handoff",
            workspace_id: 303,
            active: false,
          },
        ],
      }).tasks.slice(),
    };

    const { calls } = installMockWebApi([
      {
        path: "/web/v1/session",
        resolver: () => jsonResponse(createSessionFixture()),
      },
      {
        path: "/web/v1/tasks",
        resolver: (request) => {
          const workspaceId = Number(
            new URLSearchParams(request.search).get("workspace_id") ?? "202",
          );
          return jsonResponse({
            tasks: tasksByWorkspace[workspaceId] ?? [],
          });
        },
      },
      {
        method: "POST",
        path: "/web/v1/tasks",
        resolver: (request) => {
          const body = request.body as { name?: string; workspace_id?: number };
          const workspaceId = body.workspace_id ?? 202;
          const tasks = tasksByWorkspace[workspaceId] ?? [];
          const createdTask = {
            id: workspaceId === 303 ? 803 : 703,
            name: body.name ?? "Untitled task",
            workspace_id: workspaceId,
            active: true,
          };

          tasks.push(createdTask);
          tasksByWorkspace[workspaceId] = tasks;

          return jsonResponse(createdTask, { status: 201 });
        },
      },
    ]);

    const router = createAppRouter({
      initialEntries: ["/workspaces/202/tasks?projectId=1001"],
    });

    render(<AppProviders router={router} />);

    expect(await screen.findByRole("heading", { name: "Tasks" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Tasks" }).getAttribute("href")).toBe(
      "/workspaces/202/tasks",
    );
    expect(screen.getByText("Task directory")).toBeTruthy();
    expect(screen.getByText("Project task management entry")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Project details" }).getAttribute("href")).toBe(
      "/workspaces/202/projects/1001",
    );
    expect(screen.getByRole("link", { name: "All workspace tasks" }).getAttribute("href")).toBe(
      "/workspaces/202/tasks",
    );
    expect(screen.queryByText(/Transition state/i)).toBeNull();

    const initialList = screen.getByLabelText("Tasks list");
    expect(within(initialList).getByText("Prep launch brief")).toBeTruthy();
    expect(within(initialList).getByText("Retro follow-up")).toBeTruthy();
    expect(within(initialList).getByText(/Task · Inactive/)).toBeTruthy();
    expect(within(initialList).getAllByText(/Workspace 202/)).not.toHaveLength(0);
    fireEvent.change(screen.getByLabelText("Workspace"), {
      target: { value: "303" },
    });

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Tasks" }).getAttribute("href")).toBe(
        "/workspaces/303/tasks",
      );
      expect(screen.getByRole("link", { name: "Project details" }).getAttribute("href")).toBe(
        "/workspaces/303/projects/1001",
      );
      expect(screen.getByRole("link", { name: "All workspace tasks" }).getAttribute("href")).toBe(
        "/workspaces/303/tasks",
      );
      expect(screen.getByText("Studio QA")).toBeTruthy();
    });

    const switchedList = screen.getByLabelText("Tasks list");
    expect(within(switchedList).getByText("Studio QA")).toBeTruthy();
    expect(within(switchedList).getByText("Billing handoff")).toBeTruthy();
    expect(within(switchedList).getAllByText(/Workspace 303/)).not.toHaveLength(0);
    expect(screen.queryByText(/Transition state/i)).toBeNull();

    fireEvent.change(screen.getByLabelText("Task name"), {
      target: { value: "Close launch checklist" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save task" }));

    await waitFor(() => {
      expect(screen.getByText("Task created")).toBeTruthy();
      expect(screen.getByText("Close launch checklist")).toBeTruthy();
    });

    expect(
      calls.some(
        (call) =>
          call.method === "POST" &&
          call.pathname === "/web/v1/tasks" &&
          (call.body as { name?: string; workspace_id?: number }).name ===
            "Close launch checklist" &&
          (call.body as { name?: string; workspace_id?: number }).workspace_id === 303,
      ),
    ).toBe(true);
  });
});
