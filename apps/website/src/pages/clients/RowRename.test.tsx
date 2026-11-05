import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vite-plus/test";
import { ClientRowActions } from "./ClientRowActions.tsx";
import { TagRowActions } from "../tags/TagRowActions.tsx";
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
for (const kind of ["client", "tag"] as const) {
  it(`${kind}: preserves an open rename draft when an earlier write refreshes the name`, async () => {
    const onRename = vi.fn();
    const view = (name: string) =>
      kind === "client" ? (
        <ClientRowActions
          clientId={1}
          clientName={name}
          onRename={onRename}
          onDelete={vi.fn()}
          onArchive={vi.fn()}
        />
      ) : (
        <TagRowActions tagId={1} tagName={name} onRename={onRename} onDelete={vi.fn()} />
      );
    const { rerender } = render(view("Original"));
    fireEvent.click(screen.getByRole("button", { name: "actionsFor" }));
    fireEvent.click(await screen.findByTestId(`${kind}-rename-1`));
    const input = screen.getByTestId(`${kind}-rename-input-1`);
    fireEvent.change(input, { target: { value: "Latest draft" } });
    rerender(view("Earlier save"));
    expect(input).toHaveValue("Latest draft");
    fireEvent.submit(input.closest("form")!);
    expect(onRename).toHaveBeenCalledExactlyOnceWith(1, "Latest draft");
  });
}
