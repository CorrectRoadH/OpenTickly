// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppProviders } from "../../../app/AppProviders.tsx";
import { createAppRouter } from "../../../app/create-app-router.tsx";
import { createClientsFixture, createSessionFixture } from "../../../test/fixtures/web-data.ts";
import { installMockWebApi, jsonResponse } from "../../../test/mock-web-api.ts";

describe("clients page flow", () => {
  it("renders clients list and create action in workspace shell", async () => {
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

    const list = screen.getByLabelText("Clients list");
    expect(within(list).getByText("North Ridge Client")).toBeTruthy();
    expect(within(list).getByText("Studio Partner")).toBeTruthy();
    expect(within(list).getByText(/Contract-backed client · Inactive/)).toBeTruthy();
    expect(within(list).getAllByText(/Workspace 202/)).not.toHaveLength(0);

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
