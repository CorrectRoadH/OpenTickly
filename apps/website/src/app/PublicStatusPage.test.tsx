import { render, screen } from "@testing-library/react";
import { CircleAlert } from "lucide-react";
import { describe, expect, it } from "vitest";

import { PublicStatusPage } from "./PublicStatusPage.tsx";

describe("PublicStatusPage", () => {
  it("presents a themed status with description and recovery action", () => {
    render(
      <PublicStatusPage
        badge="Workspace invite"
        description="Sign out and try again."
        icon={CircleAlert}
        title="Wrong account"
        tone="error"
      >
        <button type="button">Sign out</button>
      </PublicStatusPage>,
    );

    expect(screen.getByRole("heading", { name: "Wrong account" })).toBeVisible();
    expect(screen.getByText("Sign out and try again.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
    expect(screen.getByTestId("public-status-icon")).toHaveAttribute("data-tone", "error");
  });
});
