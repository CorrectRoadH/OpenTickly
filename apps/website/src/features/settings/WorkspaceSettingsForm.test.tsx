import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import type { WorkspaceSettingsFormValues } from "../../shared/forms/settings-form.ts";
import { WorkspaceSettingsForm } from "./WorkspaceSettingsForm.tsx";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const initialValues: WorkspaceSettingsFormValues = {
  name: "Original",
  defaultCurrency: "USD",
  defaultHourlyRate: 0,
  rounding: 0,
  roundingMinutes: 0,
  reportsCollapse: false,
  onlyAdminsMayCreateProjects: false,
  onlyAdminsMayCreateTags: false,
  onlyAdminsSeeTeamDashboard: false,
  projectsBillableByDefault: false,
  projectsPrivateByDefault: false,
  projectsEnforceBillable: false,
  limitPublicProjectData: false,
  hideStartEndTimes: false,
  reportLockedAt: "",
  showTimesheetView: true,
  requiredTimeEntryFields: [],
  logoUrl: "",
};
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("retains and saves edits made while the previous save and server refresh complete", async () => {
  let finish!: () => void;
  const onSubmit = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue(undefined);
  const props = { initialValues, onSubmit, workspaceId: 1 };
  const { rerender } = render(<WorkspaceSettingsForm {...props} />);
  const name = screen.getByDisplayValue("Original");
  fireEvent.change(name, { target: { value: "First" } });
  await act(() => vi.advanceTimersByTimeAsync(900));
  expect(onSubmit).toHaveBeenCalledTimes(1);
  fireEvent.change(name, { target: { value: "Latest" } });
  await act(() => vi.advanceTimersByTimeAsync(900));
  rerender(
    <WorkspaceSettingsForm {...props} initialValues={{ ...initialValues, name: "First" }} />,
  );
  expect(name).toHaveValue("Latest");
  await act(async () => finish());
  await act(() => vi.advanceTimersByTimeAsync(900));
  expect(name).toHaveValue("Latest");
  expect(onSubmit).toHaveBeenLastCalledWith(
    expect.objectContaining({ workspace: expect.objectContaining({ name: "Latest" }) }),
  );
  expect(onSubmit).toHaveBeenCalledTimes(2);
});

it("keeps failed edits and saves a subsequent edit without an automatic retry loop", async () => {
  const onSubmit = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
  const onSubmitError = vi.fn();
  render(
    <WorkspaceSettingsForm
      initialValues={initialValues}
      onSubmit={onSubmit}
      onSubmitError={onSubmitError}
      workspaceId={1}
    />,
  );
  const name = screen.getByDisplayValue("Original");
  fireEvent.change(name, { target: { value: "First" } });
  await act(() => vi.advanceTimersByTimeAsync(900));
  expect(onSubmitError).toHaveBeenCalledTimes(1);
  expect(name).toHaveValue("First");
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(onSubmit).toHaveBeenCalledTimes(1);
  fireEvent.change(name, { target: { value: "Retry" } });
  await act(() => vi.advanceTimersByTimeAsync(900));
  expect(onSubmit).toHaveBeenCalledTimes(2);
});

it("saves a revert to the original value after an in-flight change", async () => {
  let finish!: () => void;
  const onSubmit = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue(undefined);
  render(
    <WorkspaceSettingsForm initialValues={initialValues} onSubmit={onSubmit} workspaceId={1} />,
  );
  const name = screen.getByDisplayValue("Original");
  fireEvent.change(name, { target: { value: "First" } });
  await act(() => vi.advanceTimersByTimeAsync(900));
  fireEvent.change(name, { target: { value: "Original" } });
  await act(async () => finish());
  expect(onSubmit).toHaveBeenCalledTimes(2);
  expect(onSubmit).toHaveBeenLastCalledWith(
    expect.objectContaining({ workspace: expect.objectContaining({ name: "Original" }) }),
  );
});

it("does not start queued saves or show notifications after unmount", async () => {
  let finish!: () => void;
  const onSubmit = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const onSubmitSuccess = vi.fn();
  const { unmount } = render(
    <WorkspaceSettingsForm
      initialValues={initialValues}
      onSubmit={onSubmit}
      onSubmitSuccess={onSubmitSuccess}
      workspaceId={1}
    />,
  );
  const name = screen.getByDisplayValue("Original");
  fireEvent.change(name, { target: { value: "First" } });
  await act(() => vi.advanceTimersByTimeAsync(900));
  fireEvent.change(name, { target: { value: "Latest" } });
  unmount();
  await act(async () => finish());
  await act(() => vi.advanceTimersByTimeAsync(900));
  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(onSubmitSuccess).not.toHaveBeenCalled();
});
