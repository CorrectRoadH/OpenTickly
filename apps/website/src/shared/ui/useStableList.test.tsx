import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useStableList } from "@opentickly/web-ui";

type Project = {
  clientName?: string;
  color: string;
  id: number;
  name: string;
  pinned: boolean;
};

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    clientName: undefined,
    color: "#ff0000",
    id: 1,
    name: "Core",
    pinned: false,
    ...overrides,
  };
}

function projectEqual(a: Project, b: Project): boolean {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.color === b.color &&
    a.pinned === b.pinned &&
    a.clientName === b.clientName
  );
}

describe("useStableList", () => {
  it("reuses the previous array when contents are equivalent even with fresh item refs", () => {
    const first = [makeProject(), makeProject({ id: 2, name: "Ops" })];
    const { result, rerender } = renderHook(
      ({ items }: { items: Project[] }) => useStableList(items, (p) => p.id, projectEqual),
      { initialProps: { items: first } },
    );

    const firstResult = result.current;

    const next = first.map((p) => ({ ...p }));
    act(() => rerender({ items: next }));

    expect(result.current).toBe(firstResult);
    expect(result.current[0]).toBe(firstResult[0]);
    expect(result.current[1]).toBe(firstResult[1]);
  });

  it("reuses prior item references by key when only one item changed", () => {
    const first = [makeProject(), makeProject({ id: 2, name: "Ops" })];
    const { result, rerender } = renderHook(
      ({ items }: { items: Project[] }) => useStableList(items, (p) => p.id, projectEqual),
      { initialProps: { items: first } },
    );

    const firstResult = result.current;
    const next = [{ ...firstResult[0] }, { ...firstResult[1], name: "Operations" }];
    act(() => rerender({ items: next }));

    expect(result.current).not.toBe(firstResult);
    expect(result.current[0]).toBe(firstResult[0]);
    expect(result.current[1]).not.toBe(firstResult[1]);
    expect(result.current[1].name).toBe("Operations");
  });

  it("returns the new array when length changes", () => {
    const first = [makeProject()];
    const { result, rerender } = renderHook(
      ({ items }: { items: Project[] }) => useStableList(items, (p) => p.id, projectEqual),
      { initialProps: { items: first } },
    );

    const next = [first[0], makeProject({ id: 2, name: "Ops" })];
    act(() => rerender({ items: next }));

    expect(result.current).toHaveLength(2);
    expect(result.current[0]).toBe(first[0]);
    expect(result.current[1]).toBe(next[1]);
  });

  it("falls back to reference equality when isEqual is identity", () => {
    const item = { id: 1, name: "focus" };
    const first = [item];
    const { result, rerender } = renderHook(
      ({ items }: { items: { id: number; name: string }[] }) =>
        useStableList(
          items,
          (t) => t.id,
          (a, b) => a === b,
        ),
      { initialProps: { items: first } },
    );

    const firstResult = result.current;

    const next = [item];
    act(() => rerender({ items: next }));
    expect(result.current).toBe(firstResult);

    const changed = [{ ...item, name: "deep focus" }];
    act(() => rerender({ items: changed }));
    expect(result.current).not.toBe(firstResult);
    expect(result.current[0]).toBe(changed[0]);
  });
});
