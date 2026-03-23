import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TagsPage } from "./TagsPage.tsx";

const mockUseSession = vi.fn();
const mockUseTagsQuery = vi.fn();
const mockUseCreateTagMutation = vi.fn();

vi.mock("../../shared/session/session-context.tsx", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("../../shared/query/web-shell.ts", () => ({
  useTagsQuery: () => mockUseTagsQuery(),
  useCreateTagMutation: () => mockUseCreateTagMutation(),
}));

describe("TagsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSession.mockReturnValue({
      currentWorkspace: {
        id: 202,
      },
    });
    mockUseTagsQuery.mockReturnValue({
      data: [],
      isError: false,
      isPending: false,
    });
    mockUseCreateTagMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue([]),
    });
  });

  it("creates a tag from the dialog", () => {
    const mutateAsync = vi.fn().mockResolvedValue([]);
    mockUseCreateTagMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(<TagsPage />);

    fireEvent.click(screen.getByTestId("tags-create-button"));

    expect(screen.getByRole("dialog", { name: "Create new tag" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Tag name"), {
      target: { value: "Research" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create tag" }));

    expect(mutateAsync).toHaveBeenCalledWith("Research");
  });
});
