import { type ReactElement, useEffect, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { X } from "lucide-react";

// Bottom-sheet wheel time picker styled per DESIGN.md (dark, tactile, dense).
// Replaces the native <input type="time"> on the mobile time entry editor so
// the two OS-native pickers (iOS drum, Android clock) stop dictating visual
// language. CSS scroll-snap drives the wheels — no touch-event JS.

type MobileTimePickerProps = {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
  onClose: () => void;
  testId?: string;
  title: string;
};

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5; // center + 2 above + 2 below
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const SPACER_HEIGHT = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

export function MobileTimePicker({
  hour,
  minute,
  onChange,
  onClose,
  testId,
  title,
}: MobileTimePickerProps): ReactElement {
  const { t } = useTranslation("mobile");
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/60"
      data-testid={testId}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex flex-col rounded-t-[16px] border-t border-[var(--track-border)] bg-[var(--track-surface-raised)] shadow-[0_-8px_24px_rgba(0,0,0,0.45)]"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Grab handle — visual affordance that this is a dismissible sheet */}
        <div className="flex h-2 shrink-0 items-center justify-center pt-2">
          <span className="block h-1 w-10 rounded-full bg-[var(--track-border)]" />
        </div>

        {/* Header */}
        <div className="flex h-[52px] shrink-0 items-center gap-3 border-b border-[var(--track-border)] px-2">
          <button
            aria-label={t("closePickerLabel", { name: title.toLowerCase() })}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--track-text-muted)] transition active:bg-white/5"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
          <span className="flex-1 text-[14px] font-semibold text-white">{title}</span>
        </div>

        {/* Wheels */}
        <div className="relative px-6 py-4">
          {/* Center selection band — sits underneath the wheels */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 rounded-[8px] bg-[var(--track-accent-soft)]"
            style={{
              height: ITEM_HEIGHT,
              top: `calc(50% - ${ITEM_HEIGHT / 2}px)`,
            }}
          />

          <div className="relative flex items-center justify-center gap-6">
            <WheelColumn
              ariaLabel={t("hour")}
              items={hours}
              onChange={(h) => onChange(h, minute)}
              testId="mobile-time-picker-hour"
              value={hour}
            />
            <span
              aria-hidden="true"
              className="text-[14px] font-semibold text-[var(--track-accent-text)] tabular-nums"
              style={{ fontFamily: "var(--font-mono), monospace" }}
            >
              :
            </span>
            <WheelColumn
              ariaLabel={t("minute")}
              items={minutes}
              onChange={(m) => onChange(hour, m)}
              testId="mobile-time-picker-minute"
              value={minute}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function WheelColumn({
  ariaLabel,
  items,
  onChange,
  testId,
  value,
}: {
  ariaLabel: string;
  items: number[];
  onChange: (v: number) => void;
  testId?: string;
  value: number;
}): ReactElement {
  const ref = useRef<HTMLDivElement | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const lastEmittedRef = useRef<number>(value);

  // Jump to the current value without a smooth animation on mount and when
  // the value changes from outside (e.g. the sibling wheel is adjusted and
  // the parent re-renders with a new iso). We compare rounded positions so
  // that a mid-scroll re-render (from our own onChange) does not yank the
  // wheel out from under the user's finger.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = items.indexOf(value);
    if (idx < 0) return;
    const current = Math.round(el.scrollTop / ITEM_HEIGHT);
    if (current !== idx) {
      el.scrollTop = idx * ITEM_HEIGHT;
    }
    lastEmittedRef.current = value;
  }, [items, value]);

  useEffect(() => {
    return () => {
      if (settleTimerRef.current != null) window.clearTimeout(settleTimerRef.current);
    };
  }, []);

  function handleScroll() {
    if (settleTimerRef.current != null) {
      window.clearTimeout(settleTimerRef.current);
    }
    // Debounce past inertial scroll so we emit once per settle. Touch-based
    // momentum scroll on iOS keeps firing `scroll` for ~100ms after release,
    // and `scrollend` is not yet universal (Safari ≥18, older Chrome stubs
    // it), so a debounced scroll is the portable option.
    settleTimerRef.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const rawIdx = Math.round(el.scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(items.length - 1, rawIdx));
      const next = items[clamped];
      if (next !== lastEmittedRef.current) {
        lastEmittedRef.current = next;
        onChange(next);
      }
    }, 120);
  }

  return (
    <div
      aria-label={ariaLabel}
      className="relative w-[72px] overflow-y-auto [&::-webkit-scrollbar]:hidden"
      data-testid={testId}
      onScroll={handleScroll}
      ref={ref}
      role="listbox"
      style={{
        height: WHEEL_HEIGHT,
        scrollSnapType: "y mandatory",
        scrollbarWidth: "none",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 25%, black 50%, black 75%, transparent 100%)",
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 25%, black 50%, black 75%, transparent 100%)",
      }}
    >
      <div aria-hidden="true" style={{ height: SPACER_HEIGHT }} />
      {items.map((n) => (
        <div
          aria-selected={n === value}
          className="flex items-center justify-center text-[14px] font-semibold tabular-nums"
          data-value={n}
          key={n}
          role="option"
          style={{
            color: n === value ? "var(--track-accent-text)" : "var(--track-text)",
            fontFamily: "var(--font-mono), monospace",
            height: ITEM_HEIGHT,
            scrollSnapAlign: "center",
            scrollSnapStop: "always",
            transition: "color var(--duration-fast) var(--ease-out)",
          }}
        >
          {String(n).padStart(2, "0")}
        </div>
      ))}
      <div aria-hidden="true" style={{ height: SPACER_HEIGHT }} />
    </div>
  );
}
