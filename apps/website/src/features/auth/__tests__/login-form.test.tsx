// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";

import { AppDisplayProvider } from "../../../app/AppDisplayProvider.tsx";
import { AuthForm } from "../AuthForm.tsx";

describe("login form", () => {
  it("submits the login payload through the feature boundary", async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    const rootRoute = createRootRoute({
      component: Outlet,
    });
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      component: () => <AuthForm mode="login" onSubmit={handleSubmit} />,
      path: "/",
    });
    const router = createRouter({
      history: createMemoryHistory({
        initialEntries: ["/"],
      }),
      routeTree: rootRoute.addChildren([indexRoute]),
    });

    render(
      <AppDisplayProvider>
        <RouterProvider router={router} />
      </AppDisplayProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Log in to OpenToggl" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "alex@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        email: "alex@example.com",
        password: "secret-pass",
      });
    });
  });

  it("renders an inline failure message from the auth boundary", async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    const rootRoute = createRootRoute({
      component: Outlet,
    });
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      component: () => (
        <AuthForm
          errorMessage="User does not have access to this resource."
          mode="login"
          onSubmit={handleSubmit}
        />
      ),
      path: "/",
    });
    const router = createRouter({
      history: createMemoryHistory({
        initialEntries: ["/"],
      }),
      routeTree: rootRoute.addChildren([indexRoute]),
    });

    render(
      <AppDisplayProvider>
        <RouterProvider router={router} />
      </AppDisplayProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Log in to OpenToggl" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain(
      "User does not have access to this resource.",
    );
  });
});
