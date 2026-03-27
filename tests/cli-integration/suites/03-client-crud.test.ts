/**
 * Story: As a user, I can manage clients through the CLI.
 *
 * Acceptance:
 * - Create, list, rename, and delete clients
 * - Names update correctly after rename
 * - List is empty after all deletions
 */
import { describe, it, expect, beforeAll } from "vitest";
import { toggl, togglJson } from "../helpers/toggl.ts";
import { provisionUser } from "../helpers/provisioning.ts";
import type { TestUser } from "../helpers/types.ts";

interface Client {
  id: number;
  name: string;
}

describe("Story: client CRUD lifecycle", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await provisionUser("client-crud");
  });

  it("creates clients", async () => {
    const r1 = await toggl(["client", "create", "Acme Corp"], { user });
    expect(r1.exitCode).toBe(0);

    const r2 = await toggl(["client", "create", "Globex"], { user });
    expect(r2.exitCode).toBe(0);
  });

  it("lists both clients", async () => {
    const clients = await togglJson<Client[]>(["client", "list"], { user });
    const names = clients.map((c) => c.name);
    expect(names).toContain("Acme Corp");
    expect(names).toContain("Globex");
  });

  it("renames a client", async () => {
    const result = await toggl(
      ["client", "rename", "Acme Corp", "Acme Inc"],
      { user },
    );
    expect(result.exitCode).toBe(0);

    const clients = await togglJson<Client[]>(["client", "list"], { user });
    const names = clients.map((c) => c.name);
    expect(names).toContain("Acme Inc");
    expect(names).not.toContain("Acme Corp");
  });

  it("deletes all clients", async () => {
    const d1 = await toggl(["client", "delete", "Acme Inc"], { user });
    expect(d1.exitCode).toBe(0);

    const d2 = await toggl(["client", "delete", "Globex"], { user });
    expect(d2.exitCode).toBe(0);
  });

  it("lists clients as empty", async () => {
    const clients = await togglJson<Client[]>(["client", "list"], { user });
    expect(clients).toHaveLength(0);
  });
});
