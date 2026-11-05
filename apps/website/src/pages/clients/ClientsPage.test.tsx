import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { toast } from "sonner";
import { ClientsPage } from "./ClientsPage.tsx";
const api = vi.hoisted(() => ({ remove: vi.fn() }));
vi.mock("../../shared/api/public/track/index.ts", async (original) => ({
  ...(await original<typeof import("../../shared/api/public/track/index.ts")>()),
  getWorkspaceClients: async () => ({
    data: [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ],
  }),
  getProjects: async () => ({ data: [] }),
  deleteWorkspaceClient: api.remove,
}));
vi.mock("../../shared/session/session-context.tsx", () => ({
  useSession: () => ({ currentWorkspace: { id: 1 } }),
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
const client = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});
afterEach(() => {
  client.clear();
  vi.restoreAllMocks();
});
it("waits for bulk results and retries only the failed client", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  let finish!: () => void;
  api.remove
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ data: {} });
        }),
    )
    .mockRejectedValueOnce(new Error("failed"))
    .mockResolvedValue({ data: {} });
  render(
    <QueryClientProvider client={client}>
      <ClientsPage />
    </QueryClientProvider>,
  );
  await screen.findByText("Alice");
  fireEvent.click(screen.getAllByRole("checkbox")[0]!);
  fireEvent.click(screen.getByRole("button", { name: "delete" }));
  await waitFor(() => expect(api.remove).toHaveBeenCalledTimes(2));
  expect(screen.queryByText("clientDeleted")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "delete" })).toBeDisabled();
  await act(async () => finish());
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: "delete" }));
  await waitFor(() => expect(api.remove).toHaveBeenCalledTimes(3));
  expect(api.remove.mock.calls[2]?.[0].path.client_id).toBe(2);
  await screen.findByText("clientDeleted");
});
