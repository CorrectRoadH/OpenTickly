/* @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ProjectsBulkBar } from "./ProjectsBulkBar.tsx";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("@opentickly/web-ui", () => ({
  AppButton: ({ children, ...props }: { children: ReactNode; disabled?: boolean }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  IconButton: ({ children, ...props }: { children: ReactNode; disabled?: boolean }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

describe("ProjectsBulkBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  test("keeps the selection and reports a failed archive", async () => {
    const onArchive = vi.fn().mockRejectedValue(new Error("archive failed"));
    const onSelectionChange = vi.fn();
    const onStatus = vi.fn();

    render(
      <ProjectsBulkBar
        onArchive={onArchive}
        onDelete={vi.fn()}
        onEditSingle={vi.fn()}
        onSelectionChange={onSelectionChange}
        onStatus={onStatus}
        selectedIds={new Set([1, 2])}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "archive" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("bulkArchiveFailed"));
    expect(onArchive).toHaveBeenCalledTimes(2);
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(onStatus).not.toHaveBeenCalled();
  });

  test("clears the selection only after every delete succeeds", async () => {
    const onSelectionChange = vi.fn();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const onStatus = vi.fn();

    render(
      <ProjectsBulkBar
        onArchive={vi.fn()}
        onDelete={onDelete}
        onEditSingle={vi.fn()}
        onSelectionChange={onSelectionChange}
        onStatus={onStatus}
        selectedIds={new Set([3, 4])}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "delete" }));

    await waitFor(() => expect(onSelectionChange).toHaveBeenCalledWith(new Set()));
    expect(onDelete).toHaveBeenCalledTimes(2);
    expect(onStatus).toHaveBeenCalledWith("projectsDeleted");
  });

  test("keeps only failed projects selected after a partial archive", async () => {
    const onArchive = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("archive failed"));
    const onSelectionChange = vi.fn();

    render(
      <ProjectsBulkBar
        onArchive={onArchive}
        onDelete={vi.fn()}
        onEditSingle={vi.fn()}
        onSelectionChange={onSelectionChange}
        onStatus={vi.fn()}
        selectedIds={new Set([5, 6])}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "archive" }));

    await waitFor(() => expect(onSelectionChange).toHaveBeenCalledWith(new Set([6])));
    expect(toast.error).toHaveBeenCalledWith("bulkArchiveFailed");
  });
});
