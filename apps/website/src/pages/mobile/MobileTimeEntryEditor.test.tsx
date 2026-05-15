/* @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GithubComTogglTogglApiInternalModelsTimeEntry } from "../../shared/api/generated/public-track/types.gen.ts";
import { MobileTimeEntryEditor } from "./MobileTimeEntryEditor.tsx";

const mockUseSession = vi.fn();
const mockUseUpdateTimeEntryMutation = vi.fn();
const mockUseDeleteTimeEntryMutation = vi.fn();
const mockUseProjectsQuery = vi.fn();
const mockUseTasksQuery = vi.fn();
const mockUseTagsQuery = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: { type: "3rdParty", init: () => undefined },
}));

vi.mock("../../app/i18n.ts", () => ({
  default: {
    language: "en",
    changeLanguage: vi.fn(),
  },
}));

vi.mock("@opentickly/web-ui", () => ({
  AppButton: ({
    children,
    danger: _danger,
    size: _size,
    variant: _variant,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    danger?: boolean;
    size?: string;
    variant?: string;
  }) => <button {...props}>{children}</button>,
  AppInput: ({
    inputClassName: _inputClassName,
    leadingIcon: _leadingIcon,
    trailingSlot,
    ...props
  }: InputHTMLAttributes<HTMLInputElement> & {
    inputClassName?: string;
    leadingIcon?: ReactNode;
    trailingSlot?: ReactNode;
  }) => (
    <label>
      <input {...props} />
      {trailingSlot}
    </label>
  ),
  AppSwitch: ({
    checked,
    onChange,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    checked?: boolean;
    onChange?: (checked: boolean) => void;
  }) => (
    <button
      {...props}
      aria-checked={checked}
      onClick={() => onChange?.(!checked)}
      role="switch"
      type="button"
    />
  ),
}));

vi.mock("../../shared/session/session-context.tsx", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("../../shared/query/web-shell.ts", () => ({
  useUpdateTimeEntryMutation: () => mockUseUpdateTimeEntryMutation(),
  useDeleteTimeEntryMutation: () => mockUseDeleteTimeEntryMutation(),
  useProjectsQuery: (...args: unknown[]) => mockUseProjectsQuery(...args),
  useTasksQuery: (...args: unknown[]) => mockUseTasksQuery(...args),
  useTagsQuery: (...args: unknown[]) => mockUseTagsQuery(...args),
}));

vi.mock("../../shared/query/useUserPreferences.ts", () => ({
  useUserPreferences: () => ({ durationFormat: "improved" }),
}));

function makeEntry(
  overrides?: Partial<GithubComTogglTogglApiInternalModelsTimeEntry>,
): GithubComTogglTogglApiInternalModelsTimeEntry {
  return {
    id: 4242,
    workspace_id: 1,
    wid: 1,
    description: "existing description",
    start: "2026-03-30T10:00:00Z",
    stop: "2026-03-30T11:00:00Z",
    duration: 3600,
    billable: false,
    tag_ids: [],
    project_id: null,
    task_id: null,
    ...overrides,
  };
}

describe("MobileTimeEntryEditor — modal closes instantly, mutation runs in background", () => {
  const entry = makeEntry();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({
      currentWorkspace: { id: 1 },
      user: { timezone: "UTC" },
    });
    mockUseProjectsQuery.mockReturnValue({ data: [] });
    mockUseTasksQuery.mockReturnValue({ data: { data: [] } });
    mockUseTagsQuery.mockReturnValue({ data: [] });
  });

  it("calls onClose synchronously when Save is tapped, without awaiting the server", () => {
    const onClose = vi.fn();
    // mutation hangs forever — simulates slow network
    const updateMutateAsync = vi.fn(() => new Promise(() => {}));
    mockUseUpdateTimeEntryMutation.mockReturnValue({
      mutateAsync: updateMutateAsync,
      isPending: false,
    });
    mockUseDeleteTimeEntryMutation.mockReturnValue({
      mutateAsync: vi.fn(() => new Promise(() => {})),
      isPending: false,
    });

    render(<MobileTimeEntryEditor entry={entry} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "saveChanges" }));

    // The modal must close immediately — the optimistic cache update
    // already reflected the edit in the list/timer, so holding the
    // modal open waiting for the server response is the remaining lag.
    expect(onClose).toHaveBeenCalledTimes(1);
    // And the mutation must still be fired (in the background).
    expect(updateMutateAsync).toHaveBeenCalledTimes(1);
  });

  it("calls onClose synchronously when Delete is tapped, without awaiting the server", () => {
    const onClose = vi.fn();
    const deleteMutateAsync = vi.fn(() => new Promise(() => {}));
    mockUseUpdateTimeEntryMutation.mockReturnValue({
      mutateAsync: vi.fn(() => new Promise(() => {})),
      isPending: false,
    });
    mockUseDeleteTimeEntryMutation.mockReturnValue({
      mutateAsync: deleteMutateAsync,
      isPending: false,
    });

    render(<MobileTimeEntryEditor entry={entry} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "deleteThisTimeEntry" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(deleteMutateAsync).toHaveBeenCalledTimes(1);
  });
});
