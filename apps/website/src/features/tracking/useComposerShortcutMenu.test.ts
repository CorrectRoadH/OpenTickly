/* @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useComposerShortcutMenu } from "./useComposerShortcutMenu.ts";

const PROJECTS = [
  { color: "#f00", id: 1, name: "Website" },
  { color: "#0f0", id: 2, name: "Webhook" },
];
const TAGS = [
  { id: 10, name: "focus" },
  { id: 11, name: "frontend" },
];

function makeProps(overrides: Partial<Parameters<typeof useComposerShortcutMenu>[0]> = {}) {
  return {
    enabled: true,
    onAfterSelect: vi.fn(),
    onCreateTag: vi.fn(),
    onSelectProject: vi.fn(),
    onToggleTag: vi.fn(),
    projects: PROJECTS,
    projectShortcutEnabled: true,
    selectedTagIds: [],
    tags: TAGS,
    tagsShortcutEnabled: true,
    value: "@",
    ...overrides,
  };
}

/** Build a minimal keydown-like event. */
function keyEvent(key: string) {
  return { key, preventDefault: vi.fn() } as never;
}

describe("useComposerShortcutMenu", () => {
  it("opens project mode for a leading @ and lists active projects", () => {
    const { result } = renderHook(() => useComposerShortcutMenu(makeProps({ value: "@web" })));
    expect(result.current.isOpen).toBe(true);
    expect(result.current.mode).toBe("project");
    expect(result.current.items.map((item) => item.label)).toEqual(["Website", "Webhook"]);
    expect(result.current.activeIndex).toBe(0);
  });

  it("stays closed when disabled", () => {
    const { result } = renderHook(() =>
      useComposerShortcutMenu(makeProps({ enabled: false, value: "@web" })),
    );
    expect(result.current.isOpen).toBe(false);
  });

  it("cycles the active row with arrow keys", () => {
    const { result } = renderHook(() => useComposerShortcutMenu(makeProps({ value: "@" })));
    act(() => {
      result.current.handleKeyDown(keyEvent("ArrowDown"));
    });
    expect(result.current.activeIndex).toBe(1);
    act(() => {
      result.current.handleKeyDown(keyEvent("ArrowDown"));
    });
    expect(result.current.activeIndex).toBe(0); // wraps
    act(() => {
      result.current.handleKeyDown(keyEvent("ArrowUp"));
    });
    expect(result.current.activeIndex).toBe(1); // wraps backwards
  });

  it("selects the active project on Enter and clears the trigger", () => {
    const onSelectProject = vi.fn();
    const onAfterSelect = vi.fn();
    const { result } = renderHook(() =>
      useComposerShortcutMenu(makeProps({ onAfterSelect, onSelectProject, value: "@web" })),
    );
    act(() => {
      result.current.handleKeyDown(keyEvent("ArrowDown")); // Webhook
    });
    act(() => {
      const consumed = result.current.handleKeyDown(keyEvent("Enter"));
      expect(consumed).toBe(true);
    });
    expect(onSelectProject).toHaveBeenCalledWith(2);
    expect(onAfterSelect).toHaveBeenCalledTimes(1);
  });

  it("toggles a tag on selection in tag mode", () => {
    const onToggleTag = vi.fn();
    const { result } = renderHook(() =>
      useComposerShortcutMenu(makeProps({ onToggleTag, value: "#focus" })),
    );
    expect(result.current.mode).toBe("tag");
    act(() => {
      result.current.selectItem(0);
    });
    expect(onToggleTag).toHaveBeenCalledWith(10);
  });

  it("creates a tag when selecting the create row", () => {
    const onCreateTag = vi.fn();
    const { result } = renderHook(() =>
      useComposerShortcutMenu(makeProps({ onCreateTag, value: "#deep-work" })),
    );
    const createIndex = result.current.items.findIndex((item) => item.kind === "create-tag");
    expect(createIndex).toBeGreaterThanOrEqual(0);
    act(() => {
      result.current.selectItem(createIndex);
    });
    expect(onCreateTag).toHaveBeenCalledWith("deep-work");
  });

  it("dismisses with Escape until the value changes", () => {
    const { rerender, result } = renderHook((props) => useComposerShortcutMenu(props), {
      initialProps: makeProps({ value: "@web" }),
    });
    act(() => {
      const consumed = result.current.handleKeyDown(keyEvent("Escape"));
      expect(consumed).toBe(true);
    });
    expect(result.current.isOpen).toBe(false);

    // Typing more re-arms the menu.
    rerender(makeProps({ value: "@webs" }));
    expect(result.current.isOpen).toBe(true);
  });

  it("does not consume keys while closed", () => {
    const { result } = renderHook(() =>
      useComposerShortcutMenu(makeProps({ value: "plain description" })),
    );
    const consumed = result.current.handleKeyDown(keyEvent("Enter"));
    expect(consumed).toBe(false);
  });
});
