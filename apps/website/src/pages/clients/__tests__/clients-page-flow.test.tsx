// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppProviders } from "../../../app/AppProviders.tsx";
import { createAppRouter } from "../../../app/create-app-router.tsx";
import { createClientsFixture, createSessionFixture } from "../../../test/fixtures/web-data.ts";
import { installMockWebApi, jsonResponse } from "../../../test/mock-web-api.ts";

describe("clients page flow", () => {
  it("renders client directory list with create action and detail entry links", async () => {
    const clients = createClientsFixture().clients.slice();
    const { calls } = installMockWebApi([
      {
        path: "/web/v1/session",
        resolver: () => jsonResponse(createSessionFixture()),
      },
      {
        path: "/web/v1/clients",
        resolver: () => jsonResponse({ clients }),
      },
      {
        method: "POST",
        path: "/web/v1/clients",
        resolver: (request) => {
          const body = request.body as { name?: string; workspace_id?: number };
          clients.push({
            id: 503,
            name: body.name ?? "Untitled Client",
            workspace_id: body.workspace_id ?? 202,
            active: true,
          });
          return jsonResponse(clients[clients.length - 1], { status: 201 });
        },
      },
    ]);

    const router = createAppRouter({
      initialEntries: ["/workspaces/202/clients"],
    });

    render(<AppProviders router={router} />);

    expect(await screen.findByRole("heading", { name: "Clients" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create client" })).toBeTruthy();
    expect(screen.getByText("Client directory")).toBeTruthy();
    expect(screen.queryByText(/Transition state/i)).toBeNull();
    expect(screen.queryByText(/Exit when/i)).toBeNull();

    const list = screen.getByLabelText("Clients list");
    expect(within(list).getByText("North Ridge Client")).toBeTruthy();
    expect(within(list).getByText("Studio Partner")).toBeTruthy();
    expect(within(list).getByText(/Client · Inactive/)).toBeTruthy();
    expect(within(list).getByText("Workspace 202")).toBeTruthy();
    expect(screen.getByText("Showing 2 clients in workspace 202.")).toBeTruthy();
    expect(screen.getByText("Active: 1")).toBeTruthy();
    expect(
      within(list)
        .getByRole("link", {
          name: "Client details for North Ridge Client",
        })
        .getAttribute("href"),
    ).toBe("/workspaces/202/clients/501");
    expect(
      within(list)
        .getByRole("link", {
          name: "Client details for Studio Partner",
        })
        .getAttribute("href"),
    ).toBe("/workspaces/202/clients/502");

    fireEvent.change(screen.getByLabelText("Client name"), {
      target: { value: "Launch Partner" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save client" }));

    await waitFor(() => {
      expect(screen.getByText("Client created")).toBeTruthy();
      expect(screen.getByText("Launch Partner")).toBeTruthy();
    });

    expect(
      calls.some(
        (call) =>
          call.method === "POST" &&
          call.pathname === "/web/v1/clients" &&
          (call.body as { name?: string; workspace_id?: number }).name === "Launch Partner" &&
          (call.body as { name?: string; workspace_id?: number }).workspace_id === 202,
      ),
    ).toBe(true);
  });
});
