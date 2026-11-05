import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { useRenameClientMutation } from "./web-shell-clients.ts";
import { useUpdateTagMutation } from "./web-shell-tags.ts";
import { useUpdateOrganizationUserMutation } from "./web-shell-organizations.ts";

const api = vi.hoisted(() => ({ write: vi.fn() }));
vi.mock("../api/public/track/index.ts", async (original) => ({
  ...(await original<typeof import("../api/public/track/index.ts")>()),
  putWorkspaceClients: api.write,
  putWorkspaceTag: api.write,
  putOrganizationUsers: api.write,
}));
let client: QueryClient;
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  api.write.mockReset().mockResolvedValue({ data: {} });
});
afterEach(() => client.clear());
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
function useWrites() {
  const clients = useRenameClientMutation(1);
  const tags = useUpdateTagMutation(1);
  const members = useUpdateOrganizationUserMutation(1);
  return {
    client: (id: number, name: string) => clients.mutateAsync({ clientId: id, name }),
    tag: (id: number, name: string) => tags.mutateAsync({ tagId: id, name }),
    member: (id: number, name: string) =>
      members.mutateAsync({
        organizationUserId: id,
        payload: { organization_admin: name === "admin" },
      }),
  };
}
for (const kind of ["client", "tag", "member"] as const) {
  it(`${kind}: serializes the same entity across hook instances while other entities proceed`, async () => {
    let finish!: () => void;
    api.write.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ data: {} });
        }),
    );
    const a = renderHook(useWrites, { wrapper });
    const b = renderHook(useWrites, { wrapper });
    let first!: Promise<unknown>, second!: Promise<unknown>, other!: Promise<unknown>;
    act(() => {
      first = a.result.current[kind](1, "admin");
    });
    await waitFor(() => expect(api.write).toHaveBeenCalledTimes(1));
    act(() => {
      second = b.result.current[kind](1, "member");
      other = b.result.current[kind](2, "other");
    });
    await act(async () => {
      await other;
    });
    expect(api.write).toHaveBeenCalledTimes(2);
    await act(async () => {
      finish();
      await Promise.all([first, second]);
    });
    expect(api.write).toHaveBeenCalledTimes(3);
    expect(api.write.mock.calls[2]?.[0].body).toEqual(
      kind === "member" ? { organization_admin: false } : { name: "member" },
    );
  });
}

it("a failed write releases the queue and reports failure without discarding the next edit", async () => {
  api.write.mockRejectedValueOnce(new Error("offline"));
  const { result } = renderHook(useWrites, { wrapper });
  let failed!: Promise<unknown>, next!: Promise<unknown>;
  act(() => {
    failed = result.current.client(1, "First").catch((error: unknown) => error);
    next = result.current.client(1, "Latest");
  });
  await act(async () => {
    expect(await failed).toEqual(new Error("offline"));
    await next;
  });
  expect(api.write).toHaveBeenCalledTimes(2);
  expect(api.write.mock.calls[1]?.[0].body).toEqual({ name: "Latest" });
});
