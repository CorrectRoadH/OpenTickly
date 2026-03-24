import { describe, expect, it } from "vitest";

import { mapSessionBootstrap } from "./session-bootstrap.ts";
import {
  createOrganizationFixture,
  createProfileFixture,
  createSessionFixture,
  createWorkspaceFixture,
} from "../../test/fixtures/web-data.ts";

describe("mapSessionBootstrap", () => {
  it("prefers the requested workspace organization when switching organizations locally", () => {
    const session = createSessionFixture({
      current_organization_id: 2,
      current_workspace_id: 202,
      organizations: [
        createOrganizationFixture({
          id: 1,
          name: "First Org",
        }),
        createOrganizationFixture({
          id: 2,
          name: "Second Org",
        }),
      ],
      workspaces: [
        createWorkspaceFixture({
          id: 202,
          name: "First Workspace",
          organization_id: 1,
        }),
        createWorkspaceFixture({
          id: 303,
          name: "Second Workspace",
          organization_id: 2,
        }),
      ],
    });

    const mapped = mapSessionBootstrap(session, {
      requestedWorkspaceId: 202,
    });

    expect(mapped.currentWorkspace.id).toBe(202);
    expect(mapped.currentOrganization?.id).toBe(1);
    expect(mapped.currentOrganization?.name).toBe("First Org");
  });

  it("marks the first organization as default when the user has no saved default workspace", () => {
    const session = createSessionFixture({
      current_organization_id: 28,
      current_workspace_id: 202,
      organizations: [
        createOrganizationFixture({
          id: 14,
          name: "First Org",
        }),
        createOrganizationFixture({
          id: 28,
          name: "Second Org",
        }),
      ],
      user: createProfileFixture({
        default_workspace_id: 202,
      }),
      workspaces: [
        createWorkspaceFixture({
          id: 202,
          name: "First Workspace",
          organization_id: 14,
        }),
        createWorkspaceFixture({
          id: 303,
          name: "Second Workspace",
          organization_id: 28,
        }),
      ],
    });

    const mapped = mapSessionBootstrap(session);

    expect(
      mapped.availableOrganizations.find((organization) => organization.id === 14)?.isDefault,
    ).toBe(true);
    expect(
      mapped.availableOrganizations.find((organization) => organization.id === 28)?.isDefault,
    ).toBe(false);
    expect(mapped.currentOrganization?.id).toBe(14);
  });
});
