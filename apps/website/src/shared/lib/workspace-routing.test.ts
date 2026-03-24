import { describe, expect, it } from "vitest";

import { swapWorkspaceInPath } from "./workspace-routing.ts";

describe("swapWorkspaceInPath", () => {
  it("swaps the workspace inside the canonical projects list path", () => {
    expect(swapWorkspaceInPath("/projects/202/list", 417, "")).toBe("/projects/417/list");
  });

  it("swaps the workspace inside the canonical project team path", () => {
    expect(swapWorkspaceInPath("/202/projects/14/team", 417, "")).toBe("/417/projects/14/team");
  });
});
