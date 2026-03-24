/* @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createOrganizationFixture, createSessionFixture, createWorkspaceFixture } from "../../test/fixtures/web-data.ts";
import { SessionProvider, useSession } from "./session-context.tsx";

describe("SessionProvider", () => {
  it("returns to the session home workspace after a workspace-scoped route clears its requested workspace", () => {
    const sessionBootstrap = createSessionFixture({
      current_organization_id: 28,
      current_workspace_id: 303,
      organizations: [
        createOrganizationFixture({
          id: 14,
          name: "North Ridge Org",
        }),
        createOrganizationFixture({
          id: 28,
          name: "Studio Org",
        }),
      ],
      workspaces: [
        createWorkspaceFixture({
          id: 202,
          name: "North Ridge Delivery",
          organization_id: 14,
        }),
        createWorkspaceFixture({
          id: 303,
          name: "Studio Workspace",
          organization_id: 28,
        }),
      ],
    });

    const view = render(
      <SessionProvider requestedWorkspaceId={202} sessionBootstrap={sessionBootstrap}>
        <SessionProbe />
      </SessionProvider>,
    );

    expect(screen.getByTestId("current-workspace-id").textContent).toBe("202");

    view.rerender(
      <SessionProvider sessionBootstrap={sessionBootstrap}>
        <SessionProbe />
      </SessionProvider>,
    );

    expect(screen.getByTestId("current-workspace-id").textContent).toBe("303");
    expect(screen.getByTestId("current-organization-id").textContent).toBe("28");
  });
});

function SessionProbe() {
  const session = useSession();

  return (
    <>
      <span data-testid="current-workspace-id">{session.currentWorkspace.id}</span>
      <span data-testid="current-organization-id">{session.currentOrganization?.id ?? ""}</span>
    </>
  );
}
