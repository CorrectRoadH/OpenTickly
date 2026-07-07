import { type MouseEvent, type ReactElement, type ReactNode, useContext } from "react";

import { DropdownCloseContext } from "./DropdownMenu.tsx";

// ---------------------------------------------------------------------------
// MenuItem — styled button for use inside DropdownMenu
// ---------------------------------------------------------------------------

type MenuItemProps = {
  children: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
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
      className={`flex w-full items-center gap-2 rounded-[6px] px-3 py-1 text-left text-[13px] transition-colors duration-[80ms] hover:bg-[var(--track-row-hover)] disabled:cursor-not-allowed disabled:opacity-50 ${
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
    <button
      className="flex w-full items-center gap-2 rounded-[6px] px-3 py-1 text-left text-[13px] text-[var(--track-overlay-text)] transition-colors duration-[80ms] hover:bg-[var(--track-row-hover)]"
      data-testid={testId}
      onClick={() => {
        close?.();
        window.location.href = href;
      }}
      role="menuitem"
      type="button"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// MenuSeparator — horizontal rule between groups of menu items
// ---------------------------------------------------------------------------

export function MenuSeparator(): ReactElement {
  return <div className="my-0.5 border-t border-[var(--track-border)]" role="separator" />;
}
