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
  const value = overrides.value ?? "@";
  return {
    cursor: value.length,
    onSelect: vi.fn(),
    projects: PROJECTS,
    projectShortcutEnabled: true,
    selectedTagIds: [],
    tags: TAGS,
    tagsShortcutEnabled: true,
    value,
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

  it("opens for a trigger typed after an existing description", () => {
    const { result } = renderHook(() =>
      useComposerShortcutMenu(makeProps({ value: "fix bug @web" })),
    );
    expect(result.current.isOpen).toBe(true);
    expect(result.current.mode).toBe("project");
  });

  it("stays closed when the cursor is before the trigger", () => {
    const { result } = renderHook(() =>
      useComposerShortcutMenu(makeProps({ cursor: 4, value: "fix @web" })),
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

  it("selects the active project on Enter and strips the trigger token", () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useComposerShortcutMenu(makeProps({ onSelect, value: "fix bug @web" })),
    );
    act(() => {
      result.current.handleKeyDown(keyEvent("ArrowDown")); // Webhook
    });
    act(() => {
      const consumed = result.current.handleKeyDown(keyEvent("Enter"));
      expect(consumed).toBe(true);
    });
    expect(onSelect).toHaveBeenCalledWith(
      { color: "#0f0", id: 2, kind: "project", label: "Webhook" },
      "fix bug",
    );
  });

  it("toggles a tag on selection in tag mode", () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useComposerShortcutMenu(makeProps({ onSelect, value: "#focus" })),
    );
    expect(result.current.mode).toBe("tag");
    act(() => {
      result.current.selectItem(0);
    });
    expect(onSelect).toHaveBeenCalledWith(
      { id: 10, kind: "tag", label: "focus", selected: false },
      "",
    );
  });

  it("creates a tag when selecting the create row", () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useComposerShortcutMenu(makeProps({ onSelect, value: "#deep-work" })),
    );
    const createIndex = result.current.items.findIndex((item) => item.kind === "create-tag");
    expect(createIndex).toBeGreaterThanOrEqual(0);
    act(() => {
      result.current.selectItem(createIndex);
    });
    expect(onSelect).toHaveBeenCalledWith(
      { kind: "create-tag", label: "deep-work", name: "deep-work" },
      "",
    );
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
