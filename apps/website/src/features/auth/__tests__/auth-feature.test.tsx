// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppDisplayProvider } from "../../../app/AppDisplayProvider.tsx";
import { createAppQueryClient } from "../../../shared/query/query-client.ts";
import { createSessionFixture } from "../../../test/fixtures/web-data.ts";
import { installMockWebApi, jsonResponse } from "../../../test/mock-web-api.ts";
import { AuthFeature } from "../AuthFeature.tsx";

describe("auth feature", () => {
  it("submits login through the auth feature and redirects to the workspace home", async () => {
    const { calls } = installMockWebApi([
      {
        method: "POST",
        path: "/web/v1/auth/login",
        resolver: () => jsonResponse(createSessionFixture()),
      },
    ]);

    renderAuthFeature("login");

    fireEvent.change(await screen.findByLabelText("Email"), {
      target: { value: "alex@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("heading", { name: "Workspace Overview" })).toBeTruthy();
    expect(calls).toContainEqual({
      body: {
        email: "alex@example.com",
        password: "secret-pass",
      },
      method: "POST",
      pathname: "/web/v1/auth/login",
    });
  });

  it("submits register through the auth feature and redirects to the workspace home", async () => {
    const { calls } = installMockWebApi([
      {
        method: "POST",
        path: "/web/v1/auth/register",
        resolver: () => jsonResponse(createSessionFixture()),
      },
    ]);

    renderAuthFeature("register");

    fireEvent.change(await screen.findByLabelText("Full name"), {
      target: { value: "Alex North" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "alex@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    expect(await screen.findByRole("heading", { name: "Workspace Overview" })).toBeTruthy();
    expect(calls).toContainEqual({
      body: {
        email: "alex@example.com",
        fullname: "Alex North",
        password: "secret-pass",
      },
      method: "POST",
      pathname: "/web/v1/auth/register",
    });
  });

  it("maps transport error payloads to a page-safe alert message", async () => {
    installMockWebApi([
      {
        method: "POST",
        path: "/web/v1/auth/login",
        resolver: () =>
          jsonResponse(
            {
              message: "User does not have access to this resource.",
            },
            { status: 403 },
          ),
      },
    ]);

    renderAuthFeature("login");

    fireEvent.change(await screen.findByLabelText("Email"), {
      target: { value: "alex@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(
      await screen.findByText("User does not have access to this resource."),
    ).toBeTruthy();
  });

  it("falls back to a generic alert when the auth request fails unexpectedly", async () => {
    installMockWebApi([
      {
        method: "POST",
        path: "/web/v1/auth/login",
        resolver: () => {
          throw new Error("socket closed");
        },
      },
    ]);

    renderAuthFeature("login");

    fireEvent.change(await screen.findByLabelText("Email"), {
      target: { value: "alex@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe(
        "We couldn't complete that request. Try again.",
      );
    });
  });
});

function renderAuthFeature(mode: "login" | "register") {
  const queryClient = createAppQueryClient();
  const rootRoute = createRootRoute({
    component: Outlet,
  });
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    component: () => <AuthFeature mode={mode} />,
  });
  const registerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/register",
    component: () => <AuthFeature mode={mode} />,
  });
  const workspaceRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/workspaces/$workspaceId",
    component: () => <h1>Workspace Overview</h1>,
  });
  const router = createRouter({
    history: createMemoryHistory({
      initialEntries: [mode === "login" ? "/login" : "/register"],
    }),
    routeTree: rootRoute.addChildren([loginRoute, registerRoute, workspaceRoute]),
  });

  return render(
    <AppDisplayProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AppDisplayProvider>,
  );
}
