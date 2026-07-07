import {
  type ReactElement,
  type ReactNode,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { useDismiss } from "./useDismiss.ts";
import {
  type DropdownPlacement,
  VIEWPORT_PADDING,
  useFloatingPosition,
} from "./useFloatingPosition.ts";

export type { DropdownPlacement } from "./useFloatingPosition.ts";

// ---------------------------------------------------------------------------
// Context — close callback shared with children (also used by MenuItem/MenuLink
// in DropdownMenuItems.tsx)
// ---------------------------------------------------------------------------

export const DropdownCloseContext = createContext<(() => void) | null>(null);

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
// DropdownMenu — action menu (role="menu") with trigger, dismiss, and styles
// ---------------------------------------------------------------------------

type DropdownMenuProps = {
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
  children,
  className,
  minWidth = "180px",
  placement,
  testId,
  trigger,
}: DropdownMenuProps): ReactElement {
  const resolved = placement ?? "bottom-right";
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useDismiss([triggerRef, panelRef], open, close);

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
              style={{
                ...style,
                maxWidth: `calc(100vw - ${VIEWPORT_PADDING * 2}px)`,
                minWidth: `min(${minWidth}, calc(100vw - ${VIEWPORT_PADDING * 2}px))`,
              }}
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
  children,
  className,
  panelClassName = "max-h-[min(60vh,480px)] overflow-y-auto rounded-[8px] border border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface)] shadow-[0_14px_32px_var(--track-shadow-overlay)]",
  placement,
  testId,
  trigger,
}: DropdownProps): ReactElement {
  const resolved = placement ?? "bottom-left";
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useDismiss([triggerRef, panelRef], open, close);

  const style = useFloatingPosition(triggerRef, panelRef, open, resolved, 4);
  const triggerWidth = triggerRef.current?.getBoundingClientRect().width;
  const panelMinWidth =
    triggerWidth == null
      ? undefined
      : Math.min(triggerWidth, window.innerWidth - VIEWPORT_PADDING * 2);

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
              style={{
                ...style,
                maxWidth: `calc(100vw - ${VIEWPORT_PADDING * 2}px)`,
                minWidth: panelMinWidth,
              }}
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
