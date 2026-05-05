/* @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TagPickerDropdown, TagPickerTrigger } from "./TagPickerDropdown.tsx";

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
  };
});

describe("TagPickerDropdown", () => {
  it("renders the compact selected-tag summary in the shared trigger", () => {
    render(
      <TagPickerTrigger
        onClick={vi.fn()}
        selectedTags={[
          { id: 1, name: "1 quadrant" },
          { id: 2, name: "2 quadrant" },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "Tags: 1 quadrant +1" })).toBeInTheDocument();
  });

  it("renders the shared selectable tag list with search and create action", () => {
    const onSearchChange = vi.fn();

    render(
      <TagPickerDropdown
        createLabel={(name) => `Create ${name}`}
        onCreateTag={vi.fn()}
        onSearchChange={onSearchChange}
        onTagToggle={vi.fn()}
        search="New"
        selectedTagIds={[2]}
        tagOptions={[
          { id: 1, name: "Tag A" },
          { id: 2, name: "Tag B" },
        ]}
      />,
    );

    expect(screen.getByText("tags")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("searchTags")).toHaveValue("New");
    expect(screen.getByRole("button", { name: "Create New" })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("searchTags"), { target: { value: "Tag" } });
    expect(onSearchChange).toHaveBeenCalledWith("Tag");
  });

  it("marks selected tags with a checkmark", () => {
    render(
      <TagPickerDropdown
        onSearchChange={vi.fn()}
        onTagToggle={vi.fn()}
        search=""
        selectedTagIds={[2]}
        tagOptions={[
          { id: 1, name: "Tag A" },
          { id: 2, name: "Tag B" },
        ]}
      />,
    );

    const selectedButton = screen.getByRole("button", { name: /Tag B/ });
    expect(selectedButton.textContent).toContain("\u2713");
  });
});
