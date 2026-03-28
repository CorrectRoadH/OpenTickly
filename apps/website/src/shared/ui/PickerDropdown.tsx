import { type ChangeEvent, type ReactElement, type ReactNode } from "react";

import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";

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
  return (
    <div
      className={`absolute left-0 top-[calc(100%+4px)] z-20 ${width} rounded-[12px] border border-[#3d3d42] bg-[#1f1f20] py-3 shadow-[0_14px_32px_rgba(0,0,0,0.34)]`}
      data-testid={testId}
    >
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
    <label className="mx-4 mb-3 flex items-center gap-3 rounded-[10px] border border-[#5d5d62] bg-[#262628] px-4 py-2.5">
      <TrackingIcon className="size-4 shrink-0 text-[#a1a1a6]" name="search" />
      <input
        className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-[#909096]"
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}
