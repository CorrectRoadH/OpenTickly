import { describe, expect, it } from "vitest";

import {
  buildShortcutItems,
  resolveComposerShortcutMode,
  shortcutItemKey,
} from "./composer-shortcut-menu.ts";

const PREFS_ALL = { projectShortcutEnabled: true, tagsShortcutEnabled: true };

describe("resolveComposerShortcutMode", () => {
  it("returns project mode for a leading @ when enabled", () => {
    expect(resolveComposerShortcutMode("@web", PREFS_ALL)).toEqual({
      mode: "project",
      query: "web",
    });
  });

  it("returns tag mode for a leading # when enabled", () => {
    expect(resolveComposerShortcutMode("#focus", PREFS_ALL)).toEqual({
      mode: "tag",
      query: "focus",
    });
  });

  it("treats triggers as plain text when the matching preference is disabled", () => {
    expect(
      resolveComposerShortcutMode("@web", {
        projectShortcutEnabled: false,
        tagsShortcutEnabled: true,
      }),
    ).toBeNull();
    expect(
      resolveComposerShortcutMode("#focus", {
        projectShortcutEnabled: true,
        tagsShortcutEnabled: false,
      }),
    ).toBeNull();
  });

  it("ignores triggers that are not at the start of the value", () => {
    expect(resolveComposerShortcutMode("ship @web", PREFS_ALL)).toBeNull();
  });

  it("returns an empty query for a bare trigger", () => {
    expect(resolveComposerShortcutMode("@", PREFS_ALL)).toEqual({ mode: "project", query: "" });
  });
});

describe("buildShortcutItems", () => {
  const projects = [
    { color: "#f00", id: 1, name: "Website" },
    { color: "#0f0", id: 2, name: "Webhook" },
    { active: false, color: "#00f", id: 3, name: "Archived" },
  ];
  const tags = [
    { id: 10, name: "focus" },
    { id: 11, name: "frontend" },
  ];

  it("filters active projects by query", () => {
    const items = buildShortcutItems({
      mode: "project",
      projects,
      query: "web",
      selectedTagIds: [],
      tags,
    });
    expect(items.map((item) => item.label)).toEqual(["Website", "Webhook"]);
  });

  it("excludes archived projects", () => {
    const items = buildShortcutItems({
      mode: "project",
      projects,
      query: "",
      selectedTagIds: [],
      tags,
    });
    expect(items.some((item) => item.label === "Archived")).toBe(false);
  });

  it("marks already-selected tags", () => {
    const items = buildShortcutItems({
      mode: "tag",
      projects,
      query: "f",
      selectedTagIds: [10],
      tags,
    });
    expect(items.filter((item) => item.kind === "tag")).toEqual([
      { id: 10, kind: "tag", label: "focus", selected: true },
      { id: 11, kind: "tag", label: "frontend", selected: false },
    ]);
  });

  it("offers a create-tag item when no exact match exists", () => {
    const items = buildShortcutItems({
      mode: "tag",
      projects,
      query: "deep-work",
      selectedTagIds: [],
      tags,
    });
    expect(items).toEqual([{ kind: "create-tag", label: "deep-work", name: "deep-work" }]);
  });

  it("does not offer create-tag when an exact match exists", () => {
    const items = buildShortcutItems({
      mode: "tag",
      projects,
      query: "focus",
      selectedTagIds: [],
      tags,
    });
    expect(items.some((item) => item.kind === "create-tag")).toBe(false);
  });
});

describe("shortcutItemKey", () => {
  it("produces stable keys per item kind", () => {
    expect(shortcutItemKey({ color: "#f00", id: 1, kind: "project", label: "Website" })).toBe(
      "project:1",
    );
    expect(shortcutItemKey({ id: 10, kind: "tag", label: "focus", selected: false })).toBe(
      "tag:10",
    );
    expect(shortcutItemKey({ kind: "create-tag", label: "deep", name: "deep" })).toBe(
      "create-tag:deep",
    );
  });
});
