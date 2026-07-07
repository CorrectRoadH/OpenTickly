import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Dropdown, DropdownMenu } from "./DropdownMenu.tsx";
import { MenuItem } from "./DropdownMenuItems.tsx";

describe("DropdownMenu", () => {
  it("opens the menu when the trigger is clicked", async () => {
    render(
      <DropdownMenu trigger={<button type="button">Actions</button>}>
        <MenuItem>Edit</MenuItem>
      </DropdownMenu>,
    );

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));

    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
  });

  it("dismisses when clicking outside the menu", async () => {
    render(
      <div>
        <DropdownMenu trigger={<button type="button">Actions</button>}>
          <MenuItem>Edit</MenuItem>
        </DropdownMenu>
        <div data-testid="outside">outside</div>
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    expect(await screen.findByRole("menu")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("dismisses when pressing Escape", async () => {
    render(
      <DropdownMenu trigger={<button type="button">Actions</button>}>
        <MenuItem>Edit</MenuItem>
      </DropdownMenu>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    expect(await screen.findByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("fires MenuItem onClick and closes the menu", async () => {
    const onEdit = vi.fn();
    render(
      <DropdownMenu trigger={<button type="button">Actions</button>}>
        <MenuItem onClick={onEdit}>Edit</MenuItem>
      </DropdownMenu>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    await screen.findByRole("menu");

    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));

    expect(onEdit).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("does not close the menu when the MenuItem click handler prevents default", async () => {
    render(
      <DropdownMenu trigger={<button type="button">Actions</button>}>
        <MenuItem onClick={(event) => event.preventDefault()}>Edit</MenuItem>
      </DropdownMenu>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    await screen.findByRole("menu");

    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
  });
});

describe("Dropdown", () => {
  it("opens the panel when the trigger is clicked", async () => {
    render(
      <Dropdown testId="my-dropdown" trigger={<button type="button">Open</button>}>
        <div>panel content</div>
      </Dropdown>,
    );

    expect(screen.queryByTestId("my-dropdown")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(await screen.findByTestId("my-dropdown")).toBeInTheDocument();
    expect(screen.getByText("panel content")).toBeInTheDocument();
  });

  it("dismisses when clicking outside the panel", async () => {
    render(
      <div>
        <Dropdown testId="my-dropdown" trigger={<button type="button">Open</button>}>
          <div>panel content</div>
        </Dropdown>
        <div data-testid="outside">outside</div>
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByTestId("my-dropdown");

    fireEvent.mouseDown(screen.getByTestId("outside"));

    expect(screen.queryByTestId("my-dropdown")).not.toBeInTheDocument();
  });

  it("dismisses when pressing Escape", async () => {
    render(
      <Dropdown testId="my-dropdown" trigger={<button type="button">Open</button>}>
        <div>panel content</div>
      </Dropdown>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByTestId("my-dropdown");

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByTestId("my-dropdown")).not.toBeInTheDocument();
  });
});
