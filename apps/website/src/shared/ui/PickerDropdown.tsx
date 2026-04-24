import { type ChangeEvent, type ReactElement, type ReactNode } from "react";
import { useRenderCount } from "@uidotdev/usehooks";
import { AppInput } from "@opentickly/web-ui";

import { SearchIcon } from "./icons.tsx";

type PickerDropdownProps = {
  children: ReactNode;
  footer?: ReactNode;
  header?: ReactNode;
  maxHeight?: string;
  search?: {
    onChange: (value: string) => void;
    placeholder: string;
    value: string;
  };
  testId?: string;
  width?: string;
};

/**
 * Shared floating picker dropdown used for project, tag, client, member,
 * and workspace selection panels.
 *
 * Renders as absolute-positioned below its trigger (the parent must be `relative`).
 */
export function PickerDropdown({
  children,
  footer,
  header,
  maxHeight = "max-h-[240px]",
  search,
  testId,
  width = "w-full",
}: PickerDropdownProps): ReactElement {
  const renderCount = useRenderCount();
  return (
    <div
      className={`absolute left-0 top-[calc(100%+4px)] z-20 ${width} rounded-[8px] border border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface)] py-3 shadow-[0_14px_32px_var(--track-shadow-overlay)]`}
      data-testid={testId}
    >
      {import.meta.env.DEV ? (
        <span
          className="pointer-events-none absolute right-2 top-1 font-mono text-[10px] leading-none text-[var(--track-text-muted)]"
          data-testid={testId ? `${testId}-rendercount` : "picker-dropdown-rendercount"}
        >
          r:{renderCount}
        </span>
      ) : null}
      {header ? <div className="px-4 pb-3">{header}</div> : null}
      {search ? <PickerSearchField {...search} /> : null}
      <div className={`${maxHeight} overflow-y-auto px-1 py-1`}>{children}</div>
      {footer ? <div className="border-t border-white/6 px-4 pb-1 pt-3">{footer}</div> : null}
    </div>
  );
}

export function PickerSearchField({
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}): ReactElement {
  return (
    <AppInput
      className="mx-4 mb-3"
      inputClassName="text-[14px]"
      leadingIcon={<SearchIcon className="size-4" />}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      placeholder={placeholder}
      value={value}
    />
  );
}
