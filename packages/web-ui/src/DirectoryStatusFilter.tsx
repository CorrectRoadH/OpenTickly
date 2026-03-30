import { type ReactElement, useEffect, useRef, useState } from "react";

import { SelectButton } from "./SelectButton.tsx";

type StatusOption<T extends string> = {
  label: string;
  value: T;
};

type DirectoryStatusFilterProps<T extends string> = {
  onChange: (selected: Set<T>) => void;
  options: StatusOption<T>[];
  selected: Set<T>;
};

/**
 * Multi-checkbox status filter dropdown matching Toggl's project/client filter pattern.
 * Shows a summary button; clicking opens a dropdown with checkbox options.
 */
export function DirectoryStatusFilter<T extends string>({
  onChange,
  options,
  selected,
}: DirectoryStatusFilterProps<T>): ReactElement {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const allValues = options.map((o) => o.value);
  const unselected = allValues.filter((v) => !selected.has(v));

  let label: string;
  if (selected.size === 0 || selected.size === options.length) {
    label = "All";
  } else if (unselected.length === 1) {
    const excludedLabel = options.find((o) => o.value === unselected[0])?.label ?? unselected[0];
    label = `All, except ${excludedLabel}`;
  } else {
    const selectedLabels = options.filter((o) => selected.has(o.value)).map((o) => o.label);
    label = selectedLabels.join(", ");
  }

  function toggleOption(value: T) {
    const next = new Set(selected);
    if (next.has(value)) {
      if (next.size > 1) {
        next.delete(value);
      }
    } else {
      next.add(value);
    }
    onChange(next);
  }

  return (
    <div className="relative" ref={ref}>
      <SelectButton aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen((v) => !v)}>
        <span className="text-[var(--track-text-muted)]">Show</span> {label}
      </SelectButton>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] py-1 shadow-lg"
          role="listbox"
        >
          {options.map((option) => {
            const checked = selected.has(option.value);
            return (
              <button
                aria-selected={checked}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-[14px] text-white hover:bg-[var(--track-surface-muted)]"
                key={option.value}
                onClick={() => toggleOption(option.value)}
                role="option"
                type="button"
              >
                <span
                  className={`flex size-[18px] shrink-0 items-center justify-center rounded-[4px] border ${
                    checked
                      ? "border-[var(--track-accent)] bg-[var(--track-accent)]"
                      : "border-[var(--track-border)] bg-transparent"
                  }`}
                >
                  {checked ? <DefaultCheck /> : null}
                </span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function DefaultCheck() {
  return (
    <svg
      aria-hidden="true"
      className="size-3 text-white"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
      viewBox="0 0 16 16"
    >
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}
