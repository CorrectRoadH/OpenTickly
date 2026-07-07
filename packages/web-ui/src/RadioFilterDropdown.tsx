import { type ReactElement, useCallback, useRef, useState } from "react";

import {
  FilterClearAffordance,
  FilterDropdownPanel,
  FilterTriggerButton,
} from "./FilterDropdownChrome.tsx";
import { useDismiss } from "./useDismiss.ts";

type RadioFilterOption<T extends string> = {
  key: T;
  label: string;
};

type RadioFilterDropdownProps<T extends string> = {
  label: string;
  onChange: (key: T) => void;
  options: RadioFilterOption<T>[];
  selected: T;
  testId?: string;
};

export function RadioFilterDropdown<T extends string>({
  label,
  onChange,
  options,
  selected,
  testId,
}: RadioFilterDropdownProps<T>): ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  useDismiss(containerRef, open, close);

  const defaultOption = options[0];
  const isActive = defaultOption != null && selected !== defaultOption.key;
  const selectedLabel = options.find((o) => o.key === selected)?.label ?? label;

  return (
    <div className="relative" ref={containerRef}>
      <FilterTriggerButton
        active={isActive}
        inactiveBorderStyle="dashed"
        label={label}
        onClick={() => setOpen(!open)}
        testId={testId}
      >
        <span>{isActive ? selectedLabel : label}</span>
        {isActive ? (
          <FilterClearAffordance
            onClear={() => {
              if (defaultOption) onChange(defaultOption.key);
            }}
          />
        ) : null}
      </FilterTriggerButton>
      {open ? (
        <FilterDropdownPanel
          borderClassName="border"
          paddingClassName="py-3"
          sizeClassName="min-w-[max(100%,180px)] whitespace-nowrap"
        >
          <div className="px-1">
            {options.map((option) => (
              <button
                className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-[12px] transition ${
                  selected === option.key
                    ? "bg-[var(--track-accent-soft)] text-white"
                    : "text-[var(--track-overlay-text)] hover:bg-white/4"
                }`}
                key={option.key}
                onClick={() => {
                  onChange(option.key);
                  setOpen(false);
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </FilterDropdownPanel>
      ) : null}
    </div>
  );
}
