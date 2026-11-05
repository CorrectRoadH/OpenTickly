import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { GroupOrganizationGroupResponse } from "../../shared/api/generated/public-track/types.gen.ts";
import { GroupsSection } from "./GroupsSection.tsx";

const api = vi.hoisted(() => ({ list: vi.fn(), members: vi.fn(), update: vi.fn() }));
vi.mock("../../shared/api/public/track/index.ts", async (original) => ({
  ...(await original<typeof import("../../shared/api/public/track/index.ts")>()),
  getOrganizationGroups: api.list,
  getOrganizationUsers: api.members,
  putOrganizationGroup: api.update,
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const users = [
  { user_id: 11, name: "Alice", email: "alice@example.test" },
  { user_id: 12, name: "Bob", email: "bob@example.test" },
];
let group: GroupOrganizationGroupResponse;
let client: QueryClient;

async function openMembers() {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <GroupsSection organizationId={1} />
    </QueryClientProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Actions for Engineering" }));
  fireEvent.click(await screen.findByRole("button", { name: "manageMembers" }));
  await screen.findByText("Alice");
}
function memberAction(name: string, action: string) {
  const row = screen.getByText(name).closest("li");
  if (!row) throw new Error(`Missing member row: ${name}`);
  return within(row).getByRole("button", { name: action });
}

beforeEach(() => {
  vi.clearAllMocks();
  group = { group_id: 7, name: "Engineering", users: [] };
  api.list.mockImplementation(async () => ({ data: [structuredClone(group)] }));
  api.members.mockResolvedValue({ data: users });
  api.update.mockImplementation(async ({ body }: { body: { users: number[] } }) => {
    group = { ...group, users: users.filter((user) => body.users.includes(user.user_id)) };
    return { data: structuredClone(group) };
  });
});

afterEach(() => client?.clear());

describe("team membership in an open dialog", () => {
  it("adds two members without replacing the first, then removes both without restoring either", async () => {
    await openMembers();
    fireEvent.click(memberAction("Alice", "addMember"));
    await waitFor(() => expect(memberAction("Alice", "removeMember")).toBeEnabled());
    fireEvent.click(memberAction("Bob", "addMember"));
    await waitFor(() => expect(memberAction("Bob", "removeMember")).toBeEnabled());
    expect(group.users?.map((user) => user.user_id)).toEqual([11, 12]);
    fireEvent.click(memberAction("Alice", "removeMember"));
    await waitFor(() => expect(memberAction("Alice", "addMember")).toBeEnabled());
    fireEvent.click(memberAction("Bob", "removeMember"));
    await waitFor(() => expect(memberAction("Bob", "addMember")).toBeEnabled());
    expect(group.users).toEqual([]);
  });

  it("removes consecutive existing members without restoring the first", async () => {
    group.users = users;
    await openMembers();
    fireEvent.click(memberAction("Alice", "removeMember"));
    await waitFor(() => expect(memberAction("Alice", "addMember")).toBeEnabled());
    fireEvent.click(memberAction("Bob", "removeMember"));
    await waitFor(() => expect(memberAction("Bob", "addMember")).toBeEnabled());
    expect(group.users).toEqual([]);
  });

  it("blocks overlapping writes until the refreshed member list is ready", async () => {
    let finish: (() => void) | undefined;
    const update = api.update.getMockImplementation()!;
    api.update.mockImplementation(async (request) => {
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      return update(request);
    });
    await openMembers();
    fireEvent.click(memberAction("Alice", "addMember"));
    await waitFor(() => expect(memberAction("Bob", "addMember")).toBeDisabled());
    finish?.();
    await waitFor(() => expect(memberAction("Alice", "removeMember")).toBeEnabled());
    expect(memberAction("Bob", "addMember")).toBeEnabled();
  });

  it("preserves members on a failed write and allows retry", async () => {
    api.update.mockResolvedValueOnce({
      error: { message: "Unable to save" },
      response: new Response(null, { status: 500 }),
    });
    await openMembers();
    fireEvent.click(memberAction("Alice", "addMember"));
    await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(memberAction("Alice", "addMember")).toBeEnabled());
    expect(group.users).toEqual([]);
    fireEvent.click(memberAction("Alice", "addMember"));
    await waitFor(() => expect(memberAction("Alice", "removeMember")).toBeEnabled());
  });
});
