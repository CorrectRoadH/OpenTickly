import type { ReactElement } from "react";
import { ChevronDown } from "lucide-react";
import { PlayIcon, TagsIcon } from "../../shared/ui/icons.tsx";

export function WsBriefcaseIcon(): ReactElement {
  return (
    <svg
      aria-hidden="true"
      fill="var(--track-text-muted)"
      fillRule="evenodd"
      height="16"
      viewBox="0 0 16 16"
      width="16"
    >
      <path
        clipRule="evenodd"
        d="M6.648 0C5.135 0 3.86 1.127 3.672 2.628L3.625 3H2a2 2 0 0 0-2 2v2h16V5a2 2 0 0 0-2-2h-1.625l-.046-.372A2.854 2.854 0 0 0 9.352 0H6.648ZM5.8 3h4.4l-.04-.196A1.18 1.18 0 0 0 9.18 2H6.82c-.477 0-.888.336-.981.804L5.8 3Z"
      />
      <path d="M16 8H0v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    </svg>
  );
}

export function ChevronDownIcon({ expanded }: { expanded: boolean }): ReactElement {
  return (
    <ChevronDown
      aria-hidden="true"
      className={`text-[var(--track-text-muted)] transition-transform duration-[var(--duration-press)] ${
        expanded ? "rotate-180" : ""
      }`}
      size={10}
      strokeWidth={2}
    />
  );
}

export function SuggestionSectionTitle({ title }: { title: string }): ReactElement {
  return (
    <div className="px-2.5 pb-0.5 pt-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--track-text-muted)]">
        {title}
      </div>
    </div>
  );
}

export function SuggestionRow({
  onClick,
  prefix,
  subtitle,
  tags,
  title,
}: {
  onClick: () => void;
  prefix?: ReactElement;
  subtitle?: string;
  tags?: string[];
  title: string;
}): ReactElement {
  const visibleTags = tags?.length ? tags.slice(0, 3) : undefined;
  return (
    <button
      className="flex w-full items-center gap-2 overflow-hidden rounded-[9px] px-2 py-1.5 text-left transition hover:bg-white/4"
      onClick={onClick}
      tabIndex={-1}
      type="button"
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-[var(--track-overlay-surface-raised)]">
        {prefix ?? <PlayIcon className="size-3.5 text-[var(--track-text-muted)]" />}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-[13px] font-medium"
          style={{ color: "var(--track-text)" }}
        >
          {title}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11px]">
          {subtitle ? (
            <span className="truncate" style={{ color: "var(--track-text)" }}>
              {subtitle}
            </span>
          ) : null}
          {visibleTags ? (
            <span className="flex shrink-0 items-center gap-0.5 text-[var(--track-text-muted)]">
              <TagsIcon className="size-2.5" />
              <span className="truncate">{visibleTags.join(", ")}</span>
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}
