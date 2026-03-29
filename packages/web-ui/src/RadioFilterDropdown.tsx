import { type ReactElement, useCallback, useEffect, useRef, useState } from "react";

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
  const buttonLabel = isActive ? `${selectedLabel} ✓` : label;

  return (
    <div className="relative" ref={containerRef}>
      <button
        className={`flex h-9 items-center gap-1 rounded-[8px] border px-3 text-[12px] font-medium ${
          isActive
            ? "border-[var(--track-accent)] bg-[var(--track-accent)]/10 text-[var(--track-accent-text)]"
            : "border-[var(--track-border)] bg-[var(--track-surface-muted)] text-[var(--track-text-muted)]"
        }`}
        data-testid={testId ?? `filter-${label.toLowerCase()}`}
        onClick={() => setOpen(!open)}
        type="button"
      >
        {buttonLabel}
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] p-2 shadow-lg">
          {options.map((option) => (
            <button
              className={`w-full rounded px-2 py-1.5 text-left text-[12px] hover:bg-[var(--track-surface-muted)] ${
                selected === option.key ? "text-[var(--track-accent-text)]" : "text-white"
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
      ) : null}
    </div>
  );
}

function useDismiss(
  ref: React.RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void,
): void {
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
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
  }, [ref, isOpen, onClose]);
}
