import { describe, expect, it } from "vitest";

import { parseInviteStatusJoinedSearch } from "../invite-status-location.ts";

describe("invite status URL adapters", () => {
  it("keeps canonical positive integer workspace ids and trims workspace names", () => {
    expect(parseInviteStatusJoinedSearch(undefined)).toEqual({
      workspaceId: undefined,
      workspaceName: undefined,
    });
    expect(
      parseInviteStatusJoinedSearch({
        workspaceId: "202",
        workspaceName: "  North Ridge Delivery  ",
      }),
    ).toEqual({
      workspaceId: 202,
      workspaceName: "North Ridge Delivery",
    });
  });

  it("drops invalid workspace ids and empty workspace names", () => {
    expect(
      parseInviteStatusJoinedSearch({
        workspaceId: "1e2",
        workspaceName: "   ",
      }),
    ).toEqual({
      workspaceId: undefined,
      workspaceName: undefined,
    });
    expect(
      parseInviteStatusJoinedSearch({
        workspaceId: "001",
        workspaceName: ["North Ridge Delivery"],
      }),
    ).toEqual({
      workspaceId: undefined,
      workspaceName: undefined,
    });
  });
});
