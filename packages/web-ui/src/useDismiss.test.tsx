import { useRef, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useDismiss } from "./useDismiss.ts";

function SingleRefHarness({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => {
    setOpen(false);
    onClose();
  });
  return (
    <div>
      <div data-testid="inside" ref={ref}>
        inside content
      </div>
      <div data-testid="outside">outside content</div>
    </div>
  );
}

function ClosedHarness({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, false, onClose);
  return <div data-testid="outside">outside content</div>;
}

/** Simulates a trigger + portaled panel spanning two disjoint DOM subtrees. */
function MultiRefHarness({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(true);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useDismiss([triggerRef, panelRef], open, () => {
    setOpen(false);
    onClose();
  });
  return (
    <div>
      <div data-testid="trigger" ref={triggerRef}>
        trigger content
      </div>
      <div data-testid="panel" ref={panelRef}>
        panel content
      </div>
      <div data-testid="outside">outside content</div>
    </div>
  );
}

describe("useDismiss - single ref", () => {
  it("does not call onClose when clicking inside the ref", () => {
    const onClose = vi.fn();
    render(<SingleRefHarness onClose={onClose} />);

    fireEvent.mouseDown(screen.getByTestId("inside"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when clicking outside the ref", () => {
    const onClose = vi.fn();
    render(<SingleRefHarness onClose={onClose} />);

    fireEvent.mouseDown(screen.getByTestId("outside"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when pressing Escape", () => {
    const onClose = vi.fn();
    render(<SingleRefHarness onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not attach listeners when isOpen is false", () => {
    const onClose = vi.fn();
    render(<ClosedHarness onClose={onClose} />);

    fireEvent.mouseDown(screen.getByTestId("outside"));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("useDismiss - multiple refs", () => {
  it("does not call onClose when clicking inside the first ref", () => {
    const onClose = vi.fn();
    render(<MultiRefHarness onClose={onClose} />);

    fireEvent.mouseDown(screen.getByTestId("trigger"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not call onClose when clicking inside the second ref", () => {
    const onClose = vi.fn();
    render(<MultiRefHarness onClose={onClose} />);

    fireEvent.mouseDown(screen.getByTestId("panel"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when clicking outside every given ref", () => {
    const onClose = vi.fn();
    render(<MultiRefHarness onClose={onClose} />);

    fireEvent.mouseDown(screen.getByTestId("outside"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when pressing Escape", () => {
    const onClose = vi.fn();
    render(<MultiRefHarness onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
