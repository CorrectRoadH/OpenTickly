import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";

import { ProjectsIcon, TagsIcon } from "../../shared/ui/icons.tsx";
import { shortcutItemKey, type ShortcutMenuItem } from "./composer-shortcut-menu.ts";

/**
 * Keyboard-navigable inline menu shown under the timer description input when the
 * user types `@` (projects) or `#` (tags). Selection is driven from the input's
 * keydown handler; mouse hover/click mirror that behaviour.
 */
export function TimerComposerShortcutMenu({
  activeIndex,
  items,
  onHoverIndex,
  onSelectIndex,
}: {
  activeIndex: number;
  items: ShortcutMenuItem[];
  onHoverIndex: (index: number) => void;
  onSelectIndex: (index: number) => void;
}): ReactElement {
  const { t } = useTranslation("tracking");

  return (
    <div
      aria-label={t("timerSuggestions")}
      className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-[280px] w-[320px] overflow-y-auto rounded-[12px] border border-[var(--track-overlay-border-strong)] bg-[var(--track-overlay-surface)] p-1 shadow-[0_18px_48px_var(--track-shadow-overlay)]"
      data-testid="timer-composer-shortcut-menu"
      role="listbox"
      // Keep input focus so blur does not dismiss the menu before the click lands.
      onMouseDown={(event) => event.preventDefault()}
    >
      {items.map((item, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            aria-selected={isActive}
            className={`flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[13px] transition ${
              isActive ? "bg-white/8 text-white" : "text-[var(--track-overlay-text-muted)]"
            }`}
            data-active={isActive ? "true" : undefined}
            data-testid="timer-composer-shortcut-option"
            key={shortcutItemKey(item)}
            onClick={() => onSelectIndex(index)}
            onMouseEnter={() => onHoverIndex(index)}
            role="option"
            type="button"
          >
            <ShortcutItemContent
              item={item}
              createLabel={t("createTagNamed", { name: itemName(item) })}
            />
          </button>
        );
      })}
    </div>
  );
}

function itemName(item: ShortcutMenuItem): string {
  return item.kind === "create-tag" ? item.name : item.label;
}

function ShortcutItemContent({
  createLabel,
  item,
}: {
  createLabel: string;
  item: ShortcutMenuItem;
}): ReactElement {
  if (item.kind === "project") {
    return (
      <>
        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
        <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
      </>
    );
  }

  if (item.kind === "tag") {
    return (
      <>
        <TagsIcon className="size-3.5 shrink-0 text-[var(--track-accent-secondary)]" />
        <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
        {item.selected ? (
          <span className="shrink-0 text-[var(--track-accent-text)]">{"✓"}</span>
        ) : null}
      </>
    );
  }

  return (
    <>
      <ProjectsIcon className="size-3.5 shrink-0 text-[var(--track-text-muted)]" />
      <span className="min-w-0 flex-1 truncate font-medium">{createLabel}</span>
    </>
  );
}
