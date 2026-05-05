import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";

import { TagsIcon } from "../../shared/ui/icons.tsx";

type TagPickerDropdownProps = {
  createLabel?: (name: string) => string;
  emptyLabel?: string;
  isCreatingTag?: boolean;
  onCreateTag?: (name: string) => Promise<unknown> | void;
  onSearchChange: (value: string) => void;
  onTagToggle: (tagId: number) => void;
  search: string;
  selectedTagIds: number[];
  tagOptions: { id: number; name: string }[];
};

type TagPickerTriggerProps = {
  active?: boolean;
  onBlur?: (event: React.FocusEvent<HTMLButtonElement>) => void;
  onClick: () => void;
  selectedTags: { id: number; name: string }[];
};

export function TagPickerTrigger({
  active = false,
  onBlur,
  onClick,
  selectedTags,
}: TagPickerTriggerProps): ReactElement {
  const tagLabel = resolveTagSummary(selectedTags);
  const hasTags = selectedTags.length > 0;
  const ariaLabel = tagLabel ? `Tags: ${tagLabel}` : "Select tags";

  return (
    <button
      aria-label={ariaLabel}
      className={`flex min-w-9 items-center justify-center gap-1.5 rounded-md transition hover:bg-[var(--track-row-hover)] ${
        hasTags
          ? tagLabel
            ? "h-9 max-w-[160px] px-2 text-[var(--track-accent)]"
            : "size-9 text-[var(--track-accent)]"
          : "size-9 text-[var(--track-text-muted)] hover:text-white"
      }`}
      data-active={active ? "true" : undefined}
      onBlur={onBlur}
      onClick={onClick}
      type="button"
    >
      <TagsIcon className="size-4 shrink-0" />
      {tagLabel ? (
        <span className="min-w-0 truncate text-[12px] font-medium">{tagLabel}</span>
      ) : null}
    </button>
  );
}

export function TagPickerDropdown({
  createLabel,
  emptyLabel,
  isCreatingTag = false,
  onCreateTag,
  onSearchChange,
  onTagToggle,
  search,
  selectedTagIds,
  tagOptions,
}: TagPickerDropdownProps): ReactElement {
  const { t } = useTranslation("tracking");
  const [localCreating, setLocalCreating] = useState(false);
  const trimmedSearch = search.trim();
  const creating = isCreatingTag || localCreating;
  const filteredTags = trimmedSearch
    ? tagOptions.filter((tag) => tag.name.toLowerCase().includes(trimmedSearch.toLowerCase()))
    : tagOptions;
  const canCreate =
    Boolean(trimmedSearch) &&
    Boolean(onCreateTag) &&
    !tagOptions.some((tag) => tag.name.toLowerCase() === trimmedSearch.toLowerCase());

  return (
    <div className="rounded-xl border border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface)] py-2 shadow-[0_14px_32px_var(--track-shadow-overlay)]">
      <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--track-text-soft)]">
        {t("tags")}
      </div>
      <div className="px-3 pb-2">
        <input
          className="h-8 w-full rounded-lg border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-2.5 text-[12px] text-white outline-none placeholder:text-[var(--track-text-muted)] focus:border-[var(--track-accent)]"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("searchTags")}
          type="text"
          value={search}
        />
      </div>
      {filteredTags.length === 0 && !trimmedSearch ? (
        <div className="px-3 py-2 text-[12px] text-[var(--track-text-soft)]">
          {emptyLabel ?? t("noTagsAvailable")}
        </div>
      ) : filteredTags.length > 0 ? (
        <div className="max-h-[200px] overflow-y-auto">
          {filteredTags.map((tag) => {
            const selected = selectedTagIds.includes(tag.id);

            return (
              <button
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] transition hover:bg-white/5 ${
                  selected ? "text-[var(--track-accent)]" : "text-white"
                }`}
                key={tag.id}
                onClick={() => onTagToggle(tag.id)}
                type="button"
              >
                <span
                  className={`flex size-4 items-center justify-center rounded border text-[11px] ${
                    selected
                      ? "border-[var(--track-accent)] bg-[var(--track-accent)] text-white"
                      : "border-[var(--track-border)]"
                  }`}
                >
                  {selected ? "\u2713" : ""}
                </span>
                <TagsIcon className="size-3.5 shrink-0 text-[var(--track-accent)]" />
                <span className="truncate">{tag.name}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      {canCreate ? (
        <button
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[var(--track-accent)] transition hover:bg-white/5 disabled:opacity-60"
          disabled={creating}
          onClick={() => {
            setLocalCreating(true);
            void Promise.resolve(onCreateTag?.(trimmedSearch))
              .then((result) => {
                const newTag = result as { id?: number } | undefined;
                if (typeof newTag?.id === "number") {
                  onTagToggle(newTag.id);
                }
                onSearchChange("");
              })
              .finally(() => setLocalCreating(false));
          }}
          type="button"
        >
          {creating ? t("creating") : (createLabel?.(trimmedSearch) ?? t("createNewTag"))}
        </button>
      ) : null}
    </div>
  );
}

function resolveTagSummary(tags: { id: number; name: string }[]): string | undefined {
  if (tags.length === 0) {
    return undefined;
  }

  if (tags.length === 1) {
    return tags[0]?.name;
  }

  return `${tags[0]?.name ?? "Tag"} +${tags.length - 1}`;
}
