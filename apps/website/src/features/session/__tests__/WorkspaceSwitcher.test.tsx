/* @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceSwitcher } from "../WorkspaceSwitcher.tsx";

const mockUseCreateOrganizationMutation = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, className, to }: { children: ReactNode; className?: string; to: string }) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
}));

vi.mock("../../../shared/query/web-shell.ts", () => ({
  useCreateOrganizationMutation: () => mockUseCreateOrganizationMutation(),
}));

describe("WorkspaceSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows available organizations and switches to the selected one", () => {
    const onChange = vi.fn();

    mockUseCreateOrganizationMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });

    render(
      <WorkspaceSwitcher
        currentOrganization={createOrganization({
          defaultWorkspaceId: 101,
          id: 1,
          isCurrent: true,
          name: "Alpha Org",
        })}
        onChange={onChange}
        organizations={[
          createOrganization({
            defaultWorkspaceId: 101,
            id: 1,
            isCurrent: true,
            name: "Alpha Org",
          }),
          createOrganization({
            defaultWorkspaceId: 202,
            id: 2,
            isDefault: false,
            isCurrent: false,
            name: "Beta Org",
          }),
        ]}
      />,
    );

    fireEvent.click(screen.getByLabelText("organization"));

    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByRole("button", { name: /Alpha Org/ })).toBeTruthy();
    fireEvent.click(within(listbox).getByRole("button", { name: /Beta Org/ }));

    expect(onChange).toHaveBeenCalledWith(202);
  });

  it("keeps the previous organizations visible after creating a new one and selects the new organization", async () => {
    const onChange = vi.fn();
    const mutateAsync = vi.fn().mockResolvedValue({
      workspace_id: 202,
    });

    mockUseCreateOrganizationMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(
      <WorkspaceSwitcher
        currentOrganization={createOrganization({
          defaultWorkspaceId: 101,
          id: 1,
          isCurrent: true,
          name: "Alpha Org",
        })}
        onChange={onChange}
        organizations={[
          createOrganization({
            defaultWorkspaceId: 101,
            id: 1,
            isCurrent: true,
            name: "Alpha Org",
          }),
        ]}
      />,
    );

    fireEvent.click(screen.getByLabelText("organization"));
    fireEvent.click(screen.getByRole("button", { name: "createOrganization" }));

    const dialog = screen.getByTestId("create-organization-dialog");
    fireEvent.change(within(dialog).getByLabelText("organizationName"), {
      target: { value: "Beta Org" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "createOrganization" }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        name: "Beta Org",
        workspace_name: "Beta Org",
      });
    });

    expect(onChange).toHaveBeenCalledWith(202);
    expect(screen.getByLabelText("organization").textContent ?? "").toContain("Beta Org");

    fireEvent.click(screen.getByLabelText("organization"));
    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByRole("button", { name: /Alpha Org/ })).toBeTruthy();
    expect(within(listbox).getByRole("button", { name: /Beta Org/ })).toBeTruthy();
  });

  it("shows a single default badge, exposes set default as an inline action, and keeps the current organization marked with a trailing check", () => {
    const onChange = vi.fn();
    const onSetDefault = vi.fn();

    mockUseCreateOrganizationMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });

    render(
      <WorkspaceSwitcher
        currentOrganization={createOrganization({
          defaultWorkspaceId: 202,
          id: 2,
          isCurrent: true,
          isDefault: false,
          name: "Beta Org",
        })}
        onChange={onChange}
        onSetDefault={onSetDefault}
        organizations={[
          createOrganization({
            defaultWorkspaceId: 101,
            id: 1,
            isCurrent: false,
            isDefault: true,
            name: "Alpha Org",
          }),
          createOrganization({
            defaultWorkspaceId: 202,
            id: 2,
            isCurrent: true,
            isDefault: false,
            name: "Beta Org",
          }),
        ]}
      />,
    );

    fireEvent.click(screen.getByLabelText("organization"));

    expect(screen.getAllByText("default")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Alpha Org/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "setDefault" })).toBeTruthy();
    expect(screen.getByLabelText("currentOrganization")).toBeTruthy();
    expect(screen.queryByText("currentOrganization")).toBeNull();

    const betaOrganizationButton = screen.getByRole("button", { name: /Beta Org/ });
    fireEvent.click(screen.getByRole("button", { name: "setDefault" }));

    expect(onSetDefault).toHaveBeenCalledWith(202);
    expect(screen.getAllByText("default")).toHaveLength(1);
    expect(betaOrganizationButton.closest('[role="option"]')?.textContent).toContain("default");
    expect(
      screen.getByRole("button", { name: /Alpha Org/ }).closest('[role="option"]')?.textContent,
    ).not.toContain("default");
  });
});

function createOrganization(overrides: Partial<OrganizationFixture> = {}): OrganizationFixture {
  return {
    defaultWorkspaceId: 101,
    id: 1,
    isAdmin: true,
    isDefault: false,
    isCurrent: false,
    isMultiWorkspaceEnabled: true,
    maxWorkspaces: 12,
    name: "Alpha Org",
    userCount: 3,
    ...overrides,
  };
}

type OrganizationFixture = {
  defaultWorkspaceId: number | null;
  id: number;
  isAdmin: boolean;
  isDefault: boolean;
  isCurrent: boolean;
  isMultiWorkspaceEnabled: boolean;
  maxWorkspaces: number | null;
  name: string;
  userCount: number | null;
};
