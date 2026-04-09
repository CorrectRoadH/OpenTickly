/* @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TimerBarTagPicker } from "./TimerComposerBar.tsx";

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  };
});

const TAG_OPTIONS = [
  { id: 1, name: "Tag A" },
  { id: 2, name: "Tag B" },
  { id: 3, name: "Tag C" },
];

/** Open the tag picker dropdown by clicking the trigger button. */
function openPicker() {
  const triggers = screen.getAllByRole("button");
  // The trigger is the first button (tag icon button).
  fireEvent.click(triggers[0]!);
}

/** Find the checkbox indicator (first span child) for a tag list item. */
function getCheckIndicator(tagName: string): string {
  // List item buttons contain the tag name as text content.
  const listButtons = screen.getAllByRole("button").filter((btn) => {
    return btn.textContent?.includes(tagName) && btn.classList.contains("w-full");
  });
  const btn = listButtons[0]!;
  const indicator = btn.querySelector("span:first-child")!;
  return indicator.textContent ?? "";
}

describe("TimerBarTagPicker", () => {
  it("shows checkmark for running entry tags even when draftTagIds is empty", () => {
    render(
      <TimerBarTagPicker
        draftTagIds={[]}
        onTagToggle={vi.fn()}
        runningEntry={{ id: 42, tag_ids: [2] }}
        tagOptions={TAG_OPTIONS}
      />,
    );

    openPicker();

    // Bug: uses draftTagIds (empty) instead of displayTagIds, so checkbox is unchecked.
    expect(getCheckIndicator("Tag B")).toContain("\u2713");
    // Tag A should not be checked
    expect(getCheckIndicator("Tag A")).not.toContain("\u2713");
  });

  it("shows checkmark from draftTagIds when no running entry", () => {
    render(
      <TimerBarTagPicker
        draftTagIds={[3]}
        onTagToggle={vi.fn()}
        runningEntry={null}
        tagOptions={TAG_OPTIONS}
      />,
    );

    openPicker();

    expect(getCheckIndicator("Tag C")).toContain("\u2713");
    expect(getCheckIndicator("Tag A")).not.toContain("\u2713");
  });
});
