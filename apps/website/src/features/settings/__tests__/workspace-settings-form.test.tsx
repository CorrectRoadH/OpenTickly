// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createWorkspaceSettingsFormValues } from "../../../shared/forms/settings-form.ts";
import { WorkspaceSettingsForm } from "../WorkspaceSettingsForm.tsx";

describe("workspace settings form", () => {
  it("maps the editable workspace settings fields back into the contract envelope", async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <WorkspaceSettingsForm
        brandingHref="/workspaces/202/settings?section=branding"
        initialValues={createWorkspaceSettingsFormValues({
          id: 202,
          organization_id: 14,
          name: "North Ridge Delivery",
          admin: true,
          default_currency: "USD",
          default_hourly_rate: 175,
          rounding: 1,
          rounding_minutes: 15,
          reports_collapse: true,
          premium: true,
          only_admins_may_create_projects: false,
          only_admins_may_create_tags: true,
          only_admins_see_team_dashboard: false,
          projects_billable_by_default: true,
          projects_private_by_default: false,
          projects_enforce_billable: true,
          limit_public_project_data: false,
          logo_url: "https://cdn.example.com/logo.png",
          role: "admin",
        })}
        onSubmit={handleSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Default currency"), {
      target: { value: "EUR" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save workspace settings" }));

    expect(screen.getByRole("link", { name: "Manage logo and avatar" }).getAttribute("href")).toBe(
      "/workspaces/202/settings?section=branding",
    );
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        workspace: {
          default_currency: "EUR",
          default_hourly_rate: 175,
          limit_public_project_data: false,
          name: "North Ridge Delivery",
          only_admins_may_create_projects: false,
          only_admins_may_create_tags: true,
          only_admins_see_team_dashboard: false,
          projects_billable_by_default: true,
          projects_enforce_billable: true,
          projects_private_by_default: false,
          reports_collapse: true,
          rounding: 1,
          rounding_minutes: 15,
        },
      });
    });
  });
});
