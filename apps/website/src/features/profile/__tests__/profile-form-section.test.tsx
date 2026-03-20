// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createProfileFormValues } from "../../../shared/forms/profile-form.ts";
import { ProfileFormSection } from "../ProfileFormSection.tsx";

describe("profile form section", () => {
  it("maps edited values into the profile update contract", async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <ProfileFormSection
        initialValues={createProfileFormValues({
          email: "alex@example.com",
          fullname: "Alex North",
          timezone: "Europe/Tallinn",
          beginning_of_week: 1,
          country_id: 70,
          default_workspace_id: 202,
        })}
        onSubmit={handleSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Alexandra North" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        beginning_of_week: 1,
        country_id: 70,
        default_workspace_id: 202,
        email: "alex@example.com",
        fullname: "Alexandra North",
        timezone: "Europe/Tallinn",
      });
    });
  });
});
