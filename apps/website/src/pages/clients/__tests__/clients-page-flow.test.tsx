// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppProviders } from "../../../app/AppProviders.tsx";
import { createAppRouter } from "../../../app/create-app-router.tsx";
import {
  createClientsFixture,
  createClientSummaryFixture,
  createSessionFixture,
} from "../../../test/fixtures/web-data.ts";
import { installMockWebApi, jsonResponse } from "../../../test/mock-web-api.ts";

expect.extend(matchers);

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
    expect(screen.getByLabelText("Client status filter")).toBeTruthy();
    expect(screen.queryByText(/Transition state/i)).toBeNull();
    expect(screen.queryByText(/Exit when/i)).toBeNull();

    const list = screen.getByLabelText("Clients list");
    expect(within(list).getByText("North Ridge Client")).toBeTruthy();
    expect(within(list).getByText("Studio Partner")).toBeTruthy();
    expect(within(list).getByText(/Client · Inactive/)).toBeTruthy();
    expect(within(list).getByText("Workspace 202")).toBeTruthy();
    expect(screen.getByText("Showing 2 clients in workspace 202.")).toBeTruthy();
    expect(screen.getByText("Active: 1 · Inactive: 1")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save client" })).toBeDisabled();
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
    expect(screen.getByRole("button", { name: "Save client" })).not.toBeDisabled();
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

  it("supports filtered empty state and renders detail page recovery copy", async () => {
    installMockWebApi([
      {
        path: "/web/v1/session",
        resolver: () => jsonResponse(createSessionFixture()),
      },
      {
        path: "/web/v1/clients",
        resolver: () =>
          jsonResponse({
            clients: [
              createClientSummaryFixture({
                id: 502,
                name: "Studio Partner",
                active: false,
              }),
            ],
          }),
      },
      {
        method: "POST",
        path: "/web/v1/clients",
        resolver: (request) => {
          const body = request.body as { name?: string; workspace_id?: number };
          return jsonResponse(
            createClientSummaryFixture({
              id: 503,
              name: body.name ?? "Untitled Client",
              workspace_id: body.workspace_id ?? 202,
            }),
            { status: 201 },
          );
        },
      },
    ]);

    const listRouter = createAppRouter({
      initialEntries: ["/workspaces/202/clients"],
    });

    render(<AppProviders router={listRouter} />);

    expect(await screen.findByRole("heading", { name: "Clients" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Client status filter"), {
      target: { value: "active" },
    });

    await waitFor(() => {
      expect(screen.getByText("No active clients match this view.")).toBeTruthy();
      expect(screen.getByText("Switch filters or create a client to continue.")).toBeTruthy();
      expect(screen.queryByLabelText("Clients list")).toBeNull();
    });

    const detailRouter = createAppRouter({
      initialEntries: ["/workspaces/202/clients/501"],
    });

    render(<AppProviders router={detailRouter} />);

    expect(await screen.findByRole("heading", { name: "Client details" })).toBeTruthy();
    expect(screen.getByText("Workspace 202")).toBeTruthy();
    expect(screen.getByText("Client 501")).toBeTruthy();
    expect(
      screen.getByText(
        "This entry point keeps the formal client route stable while the workspace directory remains the canonical place to review and update client records.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", {
        name: "Back to clients",
      }),
    ).toHaveAttribute("href", "/workspaces/202/clients");
  });
});
