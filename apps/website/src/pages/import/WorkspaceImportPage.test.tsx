/* @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { WorkspaceImportPage } from "./WorkspaceImportPage.tsx";

const createArchiveImport = vi.fn();
const createTimeEntriesImport = vi.fn();
const updateWebSession = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@opentickly/web-ui", () => ({
  AppButton: ({ children, ...props }: { children: ReactNode; disabled?: boolean }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  PageLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  SelectDropdown: () => <select aria-label="select" />,
}));

vi.mock("../../shared/session/session-context.tsx", () => ({
  useSession: () => ({
    availableOrganizations: [{ id: 1, name: "Existing organization" }],
    availableWorkspaces: [{ id: 10, name: "Existing workspace", organizationId: 1 }],
    currentOrganization: { id: 1, name: "Existing organization" },
    currentWorkspace: { id: 10, name: "Existing workspace" },
  }),
}));

vi.mock("../../shared/query/import-jobs.ts", () => ({
  useCreateArchiveImportJobMutation: () => ({
    isPending: false,
    mutateAsync: createArchiveImport,
  }),
  useCreateTimeEntriesImportJobMutation: () => ({
    isPending: false,
    mutateAsync: createTimeEntriesImport,
  }),
}));

vi.mock("../../shared/query/web-shell.ts", () => ({
  useUpdateWebSessionMutation: () => ({ mutateAsync: updateWebSession }),
}));

describe("WorkspaceImportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createArchiveImport.mockResolvedValue({
      organization_id: 2,
      status: "completed",
      workspace_id: 20,
    });
    updateWebSession.mockRejectedValue(new Error("session update failed"));
  });

  test("reports a session switch failure after a successful archive import", async () => {
    const { container } = render(<WorkspaceImportPage />);

    fireEvent.change(screen.getByPlaceholderText("importedOrg"), {
      target: { value: "Imported organization" },
    });
    const archiveInput = container.querySelector<HTMLInputElement>('input[accept^=".zip"]');
    expect(archiveInput).not.toBeNull();
    fireEvent.change(archiveInput!, {
      target: { files: [new File(["archive"], "toggl.zip", { type: "application/zip" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "uploadImport" }));

    await waitFor(() => {
      expect(updateWebSession).toHaveBeenCalledWith({ workspace_id: 20 });
    });
    expect(toast.success).toHaveBeenCalledWith("toast:organizationCreated");
    expect(toast.error).toHaveBeenCalledWith("workspaceSwitchFailed", { duration: 6000 });
  });
});
