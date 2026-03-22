// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import {
  buildWorkspaceTasksPath,
  formatTasksSearch,
  parseTasksSearch,
} from "../tasks-location.ts";

describe("tasks URL adapters", () => {
  it("keeps canonical positive integer projectId and drops invalid values", () => {
    window.history.replaceState({}, "", "/workspaces/202/tasks");
    expect(parseTasksSearch(undefined)).toEqual({ projectId: undefined });
    expect(parseTasksSearch({ projectId: "1001" })).toEqual({ projectId: 1001 });
    expect(parseTasksSearch({ projectId: 1001 })).toEqual({ projectId: 1001 });
    expect(parseTasksSearch({ projectId: "1e2" })).toEqual({ projectId: undefined });
    expect(parseTasksSearch({ projectId: "001" })).toEqual({ projectId: undefined });
    expect(parseTasksSearch({ projectId: "-7" })).toEqual({ projectId: undefined });
    expect(parseTasksSearch({ projectId: "0" })).toEqual({ projectId: undefined });
  });

  it("builds canonical tasks paths for scoped and unscoped views", () => {
    expect(
      buildWorkspaceTasksPath({
        workspaceId: 202,
      }),
    ).toBe("/workspaces/202/tasks");
    expect(
      buildWorkspaceTasksPath({
        workspaceId: 202,
        projectId: 1001,
      }),
    ).toBe("/workspaces/202/tasks?projectId=1001");
    expect(
      buildWorkspaceTasksPath({
        workspaceId: 202,
        projectId: 0,
      }),
    ).toBe("/workspaces/202/tasks");
  });

  it("formats canonical task search strings from parsed task search state", () => {
    expect(formatTasksSearch({ projectId: undefined })).toBe("");
    expect(formatTasksSearch({ projectId: 1001 })).toBe("projectId=1001");
    expect(formatTasksSearch({ projectId: 0 })).toBe("");
  });
});
