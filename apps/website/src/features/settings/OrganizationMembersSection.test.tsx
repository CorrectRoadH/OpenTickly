import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vite-plus/test";
import { OrganizationMembersSection } from "./OrganizationMembersSection.tsx";
const api = vi.hoisted(() => ({ list: vi.fn(), update: vi.fn() }));
vi.mock("../../shared/api/public/track/index.ts", async (original) => ({
  ...(await original<typeof import("../../shared/api/public/track/index.ts")>()),
  getOrganizationUsers: api.list,
  putOrganizationUsers: api.update,
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
it("honors the latest role selection while another member can be updated independently", async () => {
  const members = [
    { id: 1, user_id: 1, name: "Alice", admin: false },
    { id: 2, user_id: 2, name: "Bob", admin: false },
  ];
  api.list.mockImplementation(async () => ({ data: structuredClone(members) }));
  let finish!: () => void;
  const gate = new Promise<void>((resolve) => {
    finish = resolve;
  });
  api.update.mockImplementation(
    async ({
      path,
      body,
    }: {
      path: { organization_user_id: number };
      body: { organization_admin: boolean };
    }) => {
      if (path.organization_user_id === 1 && body.organization_admin) await gate;
      members.find((member) => member.id === path.organization_user_id)!.admin =
        body.organization_admin;
      return { data: {} };
    },
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { unmount } = render(
    <QueryClientProvider client={client}>
      <OrganizationMembersSection organizationId={1} />
    </QueryClientProvider>,
  );
  async function choose(name: string, role: string) {
    fireEvent.click(await screen.findByRole("button", { name: `Role for ${name}` }));
    fireEvent.click(await screen.findByRole("option", { name: role }));
  }
  try {
    await choose("Alice", "admin");
    await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
    await choose("Alice", "member");
    await choose("Bob", "admin");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Role for Bob" })).toHaveTextContent("admin"),
    );
    expect(api.update).toHaveBeenCalledTimes(2);
    await act(async () => finish());
    await waitFor(() => expect(api.update).toHaveBeenCalledTimes(3));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Role for Alice" })).toHaveTextContent("member"),
    );
    expect(members.map((member) => member.admin)).toEqual([false, true]);
  } finally {
    unmount();
    client.clear();
  }
});
