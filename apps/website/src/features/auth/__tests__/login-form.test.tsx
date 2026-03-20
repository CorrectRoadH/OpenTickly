// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthForm } from "../AuthForm.tsx";

describe("login form", () => {
  it("submits the login payload through the feature boundary", async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);

    render(<AuthForm mode="login" onSubmit={handleSubmit} />);

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
});
