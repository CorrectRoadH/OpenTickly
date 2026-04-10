import { type ReactElement, useCallback, useRef, useState } from "react";

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
      <button
        className={`flex h-9 items-center gap-1.5 rounded-[8px] border px-3 text-[12px] font-medium transition ${
          isActive
            ? "border-transparent bg-[var(--track-accent)]/10 text-[var(--track-accent-text)] hover:bg-[var(--track-accent)]/20"
            : "border-dashed border-[var(--track-border)] text-[var(--track-text-muted)] hover:border-[var(--track-control-border)] hover:text-white"
        }`}
        data-testid={testId ?? `filter-${label.toLowerCase()}`}
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span>{isActive ? selectedLabel : label}</span>
        {isActive ? (
          <span
            className="flex size-4 shrink-0 items-center justify-center rounded-full opacity-50 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              if (defaultOption) onChange(defaultOption.key);
            }}
            role="button"
          >
            <svg className="size-2.5" fill="none" viewBox="0 0 12 12">
              <path
                d="M3 3l6 6M9 3l-6 6"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.5"
              />
            </svg>
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-[max(100%,180px)] whitespace-nowrap rounded-[8px] border border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface)] py-3 shadow-[0_14px_32px_var(--track-shadow-overlay)]">
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
        </div>
      ) : null}
    </div>
  );
}
