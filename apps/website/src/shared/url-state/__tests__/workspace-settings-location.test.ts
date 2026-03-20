import { describe, expect, it } from "vitest";

import {
  buildWorkspaceSettingsPath,
  parseWorkspaceSettingsSearch,
} from "../workspace-settings-location.ts";

describe("workspace settings URL adapters", () => {
  it("defaults to the general section when search params are missing or invalid", () => {
    expect(parseWorkspaceSettingsSearch(undefined)).toEqual({
      section: "general",
    });
    expect(parseWorkspaceSettingsSearch({ section: "nope" })).toEqual({
      section: "general",
    });
  });

  it("keeps allowed sections and builds a canonical workspace settings path", () => {
    expect(parseWorkspaceSettingsSearch({ section: "branding" })).toEqual({
      section: "branding",
    });
    expect(
      buildWorkspaceSettingsPath({
        workspaceId: 202,
        section: "branding",
      }),
    ).toBe("/workspaces/202/settings?section=branding");
  });
});
