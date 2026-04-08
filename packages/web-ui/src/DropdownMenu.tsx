import {
  type ReactElement,
  type ReactNode,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// Context — close callback shared with children
// ---------------------------------------------------------------------------

const DropdownCloseContext = createContext<(() => void) | null>(null);

/**
 * Returns the close callback from the nearest DropdownMenu or Dropdown ancestor.
 * Use inside custom dropdown content that needs to close the menu on action.
 */
export function useDropdownClose(): () => void {
  const close = useContext(DropdownCloseContext);
  if (!close) {
    throw new Error("useDropdownClose must be used inside DropdownMenu or Dropdown");
  }
  return close;
}

// ---------------------------------------------------------------------------
// useDismiss2Ref — 2-ref dismiss for portaled panels
// ---------------------------------------------------------------------------

function useDismiss2Ref(
  ref1: React.RefObject<HTMLElement | null>,
  ref2: React.RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void,
): void {
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!ref1.current?.contains(target) && !ref2.current?.contains(target)) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [ref1, ref2, isOpen, onClose]);
}

// ---------------------------------------------------------------------------
// Placement types & positioning
// ---------------------------------------------------------------------------

/**
 * - "bottom-left" / "bottom-right": panel below trigger, aligned left or right edge
 * - "right-bottom": panel to the right of trigger, bottom-aligned (e.g. sidebar profile)
 */
export type DropdownPlacement = "bottom-left" | "bottom-right" | "right-bottom";

type FloatingStyle = {
  bottom?: number;
  left?: number;
  right?: number;
  top?: number;
};

function useFloatingPosition(
  triggerRef: React.RefObject<HTMLElement | null>,
  panelRef: React.RefObject<HTMLElement | null>,
  isOpen: boolean,
  placement: DropdownPlacement,
  gap: number,
): FloatingStyle | null {
  const [style, setStyle] = useState<FloatingStyle | null>(null);

  useEffect(() => {
    if (!isOpen || !triggerRef.current) {
      setStyle(null);
      return;
    }

    function update() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const panelHeight = panelRef.current?.offsetHeight ?? 0;
      const panelWidth = panelRef.current?.offsetWidth ?? 0;
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      switch (placement) {
        case "bottom-left": {
          const fitsBelow = rect.bottom + gap + panelHeight <= vh;
          const top = fitsBelow ? rect.bottom + gap : rect.top - gap - panelHeight;
          const left = Math.min(rect.left, vw - panelWidth);
          setStyle({ left: Math.max(0, left), top: Math.max(0, top) });
          break;
        }
        case "bottom-right": {
          const fitsBelow = rect.bottom + gap + panelHeight <= vh;
          const top = fitsBelow ? rect.bottom + gap : rect.top - gap - panelHeight;
          const right = Math.min(vw - rect.right, vw - panelWidth);
          setStyle({ right: Math.max(0, right), top: Math.max(0, top) });
          break;
        }
        case "right-bottom": {
          const fitsRight = rect.right + gap + panelWidth <= vw;
          const left = fitsRight ? rect.right + gap : rect.left - gap - panelWidth;
          setStyle({
            left: Math.max(0, left),
            bottom: Math.max(0, vh - rect.bottom),
          });
          break;
        }
      }
    }

    // Run once immediately, then again on next frame so panelRef is measured.
    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isOpen, triggerRef, panelRef, placement, gap]);

  return style;
}

// ---------------------------------------------------------------------------
// DropdownMenu — action menu (role="menu") with trigger, dismiss, and styles
// ---------------------------------------------------------------------------

type DropdownMenuProps = {
  /** @deprecated Use `placement` instead. */
  align?: "left" | "right";
  children: ReactNode;
  className?: string;
  /** Minimum width of the floating panel. */
  minWidth?: string;
  /** Panel placement relative to trigger. Defaults to "bottom-right". */
  placement?: DropdownPlacement;
  testId?: string;
  /** The trigger element — receives onClick and aria-expanded via cloneElement. */
  trigger: ReactElement;
};

/**
 * Action dropdown menu with built-in open/close state, click-outside + Escape
 * dismiss, and styled floating panel (role="menu").
 *
 * The panel is portaled to document.body to avoid overflow clipping.
 *
 * ```tsx
 * <DropdownMenu trigger={<IconButton aria-label="Actions"><MoreIcon /></IconButton>}>
 *   <MenuItem onClick={onEdit}>Edit</MenuItem>
 *   <MenuItem destructive onClick={onDelete}>Delete</MenuItem>
 * </DropdownMenu>
 * ```
 */
export function DropdownMenu({
  align,
  children,
  className,
  minWidth = "180px",
  placement,
  testId,
  trigger,
}: DropdownMenuProps): ReactElement {
  const resolved = placement ?? (align === "left" ? "bottom-left" : "bottom-right");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useDismiss2Ref(triggerRef, panelRef, open, close);

  const style = useFloatingPosition(triggerRef, panelRef, open, resolved, 4);

  return (
    <div className={className} ref={triggerRef}>
      <TriggerSlot onClick={() => setOpen((prev) => !prev)} open={open}>
        {trigger}
      </TriggerSlot>
      {open && style
        ? createPortal(
            <div
              className="fixed z-50 rounded-[8px] border border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface-raised)] p-1 shadow-[0_16px_32px_var(--track-shadow-overlay)]"
              data-testid={testId}
              ref={panelRef}
              role="menu"
              style={{ ...style, minWidth }}
            >
              <DropdownCloseContext.Provider value={close}>
                {children}
              </DropdownCloseContext.Provider>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dropdown — generic styled floating panel (no menu semantics)
// ---------------------------------------------------------------------------

type DropdownProps = {
  /** @deprecated Use `placement` instead. */
  align?: "left" | "right";
  children: ReactNode;
  className?: string;
  /** Override the floating panel classes. Falls back to standard surface style. */
  panelClassName?: string;
  /** Panel placement relative to trigger. Defaults to "bottom-left". */
  placement?: DropdownPlacement;
  testId?: string;
  trigger: ReactElement;
};

/**
 * Generic dropdown: trigger + styled floating panel + dismiss.
 * No menu semantics — for select pickers, filter panels, etc.
 *
 * Uses portal to avoid overflow clipping.
 */
export function Dropdown({
  align,
  children,
  className,
  panelClassName = "rounded-[8px] border border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface)] shadow-[0_14px_32px_var(--track-shadow-overlay)]",
  placement,
  testId,
  trigger,
}: DropdownProps): ReactElement {
  const resolved = placement ?? (align === "right" ? "bottom-right" : "bottom-left");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useDismiss2Ref(triggerRef, panelRef, open, close);

  const style = useFloatingPosition(triggerRef, panelRef, open, resolved, 4);
  const triggerWidth = triggerRef.current?.getBoundingClientRect().width;

  return (
    <div className={className} ref={triggerRef}>
      <TriggerSlot onClick={() => setOpen((prev) => !prev)} open={open}>
        {trigger}
      </TriggerSlot>
      {open && style
        ? createPortal(
            <div
              className={`fixed z-50 ${panelClassName}`}
              data-testid={testId}
              ref={panelRef}
              style={{ ...style, minWidth: triggerWidth }}
            >
              <DropdownCloseContext.Provider value={close}>
                {children}
              </DropdownCloseContext.Provider>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MenuItem — styled button for use inside DropdownMenu
// ---------------------------------------------------------------------------

type MenuItemProps = {
  children: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  testId?: string;
};

/**
 * A single menu action item. Automatically closes the parent DropdownMenu
 * when clicked (unless the event handler calls `event.preventDefault()`).
 */
export function MenuItem({
  children,
  destructive = false,
  disabled = false,
  onClick,
  testId,
}: MenuItemProps): ReactElement {
  const close = useContext(DropdownCloseContext);

  return (
    <button
      className={`flex min-h-[28px] w-full items-center gap-2 rounded-[6px] px-2.5 text-left text-[14px] transition-colors duration-[80ms] hover:bg-[var(--track-row-hover)] disabled:cursor-not-allowed disabled:opacity-50 ${
        destructive ? "text-[var(--track-danger-text)]" : "text-[var(--track-overlay-text)]"
      }`}
      data-testid={testId}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          close?.();
        }
      }}
      role="menuitem"
      type="button"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// MenuLink — styled anchor for use inside DropdownMenu
// ---------------------------------------------------------------------------

type MenuLinkProps = {
  children: ReactNode;
  href: string;
  testId?: string;
};

export function MenuLink({ children, href, testId }: MenuLinkProps): ReactElement {
  const close = useContext(DropdownCloseContext);

  return (
    <a
      className="flex min-h-[28px] w-full items-center gap-2 rounded-[6px] px-2.5 text-left text-[14px] text-[var(--track-overlay-text)] transition-colors duration-[80ms] hover:bg-[var(--track-row-hover)]"
      data-testid={testId}
      href={href}
      onClick={() => close?.()}
      role="menuitem"
    >
      {children}
    </a>
  );
}

// ---------------------------------------------------------------------------
// MenuSeparator — horizontal rule between groups of menu items
// ---------------------------------------------------------------------------

export function MenuSeparator(): ReactElement {
  return <div className="my-1 border-t border-[var(--track-border)]" role="separator" />;
}

// ---------------------------------------------------------------------------
// Shared internals
// ---------------------------------------------------------------------------

function TriggerSlot({
  children,
  onClick,
  open,
}: {
  children: ReactElement;
  onClick: () => void;
  open: boolean;
}) {
  if (isValidElement(children)) {
    return cloneElement(children as ReactElement<Record<string, unknown>>, {
      onClick,
      "aria-expanded": open,
    });
  }
  return children;
}
