import { describe, expect, it, vi } from "vitest";

import {
  applyComposerShortcutSelection,
  type ShortcutSelectionDeps,
} from "./composer-shortcut-selection.ts";

function makeDeps(overrides: Partial<ShortcutSelectionDeps> = {}): ShortcutSelectionDeps {
  return {
    createTag: vi.fn().mockResolvedValue(99),
    draftTagIds: [],
    projectOptions: [{ color: "#0f0", id: 2, name: "Mobile App" }],
    runningEntry: null,
    setDraftDescription: vi.fn(),
    setDraftProjectId: vi.fn(),
    setDraftTagIds: vi.fn(),
    setDraftTaskId: vi.fn(),
    setRunningDescription: vi.fn(),
    updateTimeEntry: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const RUNNING = { id: 7, tag_ids: [10], workspace_id: 42 };

describe("applyComposerShortcutSelection (running entry)", () => {
  it("persists the project and the stripped description in a single update", () => {
    const deps = makeDeps({ runningEntry: RUNNING });
    applyComposerShortcutSelection(
      deps,
      { color: "#0f0", id: 2, kind: "project", label: "Mobile App" },
      "deploy",
    );
    expect(deps.setRunningDescription).toHaveBeenCalledWith("deploy");
    expect(deps.updateTimeEntry).toHaveBeenCalledTimes(1);
    expect(deps.updateTimeEntry).toHaveBeenCalledWith({
      request: {
        description: "deploy",
        projectColor: "#0f0",
        projectId: 2,
        projectName: "Mobile App",
        taskId: null,
      },
      timeEntryId: 7,
      workspaceId: 42,
    });
  });

  it("toggles a tag on the running entry together with the description", () => {
    const deps = makeDeps({ runningEntry: RUNNING });
    applyComposerShortcutSelection(
      deps,
      { id: 11, kind: "tag", label: "frontend", selected: false },
      "deploy",
    );
    expect(deps.updateTimeEntry).toHaveBeenCalledWith({
      request: { description: "deploy", tagIds: [10, 11] },
      timeEntryId: 7,
      workspaceId: 42,
    });
  });

  it("removes an already-selected tag from the running entry", () => {
    const deps = makeDeps({ runningEntry: RUNNING });
    applyComposerShortcutSelection(
      deps,
      { id: 10, kind: "tag", label: "focus", selected: true },
      "deploy",
    );
    expect(deps.updateTimeEntry).toHaveBeenCalledWith({
      request: { description: "deploy", tagIds: [] },
      timeEntryId: 7,
      workspaceId: 42,
    });
  });

  it("creates a tag and then assigns it to the running entry", async () => {
    const deps = makeDeps({ runningEntry: RUNNING });
    applyComposerShortcutSelection(deps, { kind: "create-tag", label: "deep", name: "deep" }, "");
    expect(deps.createTag).toHaveBeenCalledWith("deep");
    await vi.waitFor(() => {
      expect(deps.updateTimeEntry).toHaveBeenCalledWith({
        request: { description: "", tagIds: [10, 99] },
        timeEntryId: 7,
        workspaceId: 42,
      });
    });
  });

  it("does nothing when the running entry has no workspace id", () => {
    const deps = makeDeps({ runningEntry: { id: 7, tag_ids: [] } });
    applyComposerShortcutSelection(
      deps,
      { color: "#0f0", id: 2, kind: "project", label: "Mobile App" },
      "deploy",
    );
    expect(deps.updateTimeEntry).not.toHaveBeenCalled();
    expect(deps.setRunningDescription).not.toHaveBeenCalled();
  });
});

describe("applyComposerShortcutSelection (idle composer)", () => {
  it("updates the draft project and clears the draft task", () => {
    const deps = makeDeps();
    applyComposerShortcutSelection(
      deps,
      { color: "#0f0", id: 2, kind: "project", label: "Mobile App" },
      "fix bug",
    );
    expect(deps.setDraftDescription).toHaveBeenCalledWith("fix bug");
    expect(deps.setDraftProjectId).toHaveBeenCalledWith(2);
    expect(deps.setDraftTaskId).toHaveBeenCalledWith(null);
    expect(deps.updateTimeEntry).not.toHaveBeenCalled();
  });

  it("toggles draft tags", () => {
    const deps = makeDeps({ draftTagIds: [10] });
    applyComposerShortcutSelection(
      deps,
      { id: 10, kind: "tag", label: "focus", selected: true },
      "",
    );
    expect(deps.setDraftTagIds).toHaveBeenCalledWith([]);
  });

  it("creates a tag and adds it to the draft", async () => {
    const deps = makeDeps();
    applyComposerShortcutSelection(deps, { kind: "create-tag", label: "deep", name: "deep" }, "");
    await vi.waitFor(() => {
      expect(deps.setDraftTagIds).toHaveBeenCalledWith([99]);
    });
  });
});
