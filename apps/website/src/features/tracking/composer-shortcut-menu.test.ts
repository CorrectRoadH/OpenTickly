import { describe, expect, it } from "vitest";

import {
  buildShortcutItems,
  removeShortcutToken,
  resolveComposerShortcutMode,
  shortcutItemKey,
} from "./composer-shortcut-menu.ts";

const PREFS_ALL = { projectShortcutEnabled: true, tagsShortcutEnabled: true };

describe("resolveComposerShortcutMode", () => {
  it("returns project mode for a leading @ when enabled", () => {
    expect(resolveComposerShortcutMode("@web", 4, PREFS_ALL)).toEqual({
      mode: "project",
      query: "web",
      tokenEnd: 4,
      tokenStart: 0,
    });
  });

  it("returns tag mode for a leading # when enabled", () => {
    expect(resolveComposerShortcutMode("#focus", 6, PREFS_ALL)).toEqual({
      mode: "tag",
      query: "focus",
      tokenEnd: 6,
      tokenStart: 0,
    });
  });

  it("treats triggers as plain text when the matching preference is disabled", () => {
    expect(
      resolveComposerShortcutMode("@web", 4, {
        projectShortcutEnabled: false,
        tagsShortcutEnabled: true,
      }),
    ).toBeNull();
    expect(
      resolveComposerShortcutMode("#focus", 6, {
        projectShortcutEnabled: true,
        tagsShortcutEnabled: false,
      }),
    ).toBeNull();
  });

  it("finds a trigger typed after an existing description", () => {
    expect(resolveComposerShortcutMode("fix bug @Mob", 12, PREFS_ALL)).toEqual({
      mode: "project",
      query: "Mob",
      tokenEnd: 12,
      tokenStart: 8,
    });
  });

  it("allows the query to span whitespace", () => {
    expect(resolveComposerShortcutMode("fix @Mobile App", 15, PREFS_ALL)).toEqual({
      mode: "project",
      query: "Mobile App",
      tokenEnd: 15,
      tokenStart: 4,
    });
  });

  it("only resolves the token before the cursor", () => {
    expect(resolveComposerShortcutMode("fix @Mob bug", 8, PREFS_ALL)).toEqual({
      mode: "project",
      query: "Mob",
      tokenEnd: 8,
      tokenStart: 4,
    });
  });

  it("ignores triggers embedded in a word", () => {
    expect(resolveComposerShortcutMode("mail me@example.com", 19, PREFS_ALL)).toBeNull();
  });

  it("uses the nearest trigger before the cursor", () => {
    expect(resolveComposerShortcutMode("@web #foc", 9, PREFS_ALL)).toEqual({
      mode: "tag",
      query: "foc",
      tokenEnd: 9,
      tokenStart: 5,
    });
  });

  it("skips a disabled trigger and falls back to an earlier enabled one", () => {
    expect(
      resolveComposerShortcutMode("@web #foc", 9, {
        projectShortcutEnabled: true,
        tagsShortcutEnabled: false,
      }),
    ).toEqual({
      mode: "project",
      query: "web #foc",
      tokenEnd: 9,
      tokenStart: 0,
    });
  });

  it("returns an empty query for a bare trigger", () => {
    expect(resolveComposerShortcutMode("@", 1, PREFS_ALL)).toEqual({
      mode: "project",
      query: "",
      tokenEnd: 1,
      tokenStart: 0,
    });
  });
});

describe("removeShortcutToken", () => {
  it("removes a trailing token together with its separating space", () => {
    expect(removeShortcutToken("fix bug @Mob", 8, 12)).toBe("fix bug");
  });

  it("removes a mid-text token without doubling whitespace", () => {
    expect(removeShortcutToken("fix @Mob bug", 4, 8)).toBe("fix bug");
  });

  it("returns an empty string when the value is only the token", () => {
    expect(removeShortcutToken("@Mob", 0, 4)).toBe("");
  });

  it("keeps text before and after intact for a leading token", () => {
    expect(removeShortcutToken("@Mob fix bug", 0, 4)).toBe("fix bug");
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
