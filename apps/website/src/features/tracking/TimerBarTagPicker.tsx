import { type ReactElement, useRef, useState } from "react";

import { TagPickerDropdown, TagPickerTrigger } from "./TagPickerDropdown.tsx";

export function TimerBarTagPicker({
  draftTagIds,
  onCreateTag,
  onTagToggle,
  runningEntry,
  tagOptions,
}: {
  draftTagIds: number[];
  onCreateTag?: (name: string) => Promise<unknown>;
  onTagToggle: (tagId: number) => void;
  runningEntry: { id?: number | null; tag_ids?: number[] | null } | null;
  tagOptions: { id: number; name: string }[];
}): ReactElement {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const displayTagIds = runningEntry?.id != null ? (runningEntry.tag_ids ?? []) : draftTagIds;
  const displayTags = tagOptions.filter((tag) => displayTagIds.includes(tag.id));

  return (
    <div className="relative" ref={containerRef}>
      <TagPickerTrigger
        onClick={() => {
          setOpen((prev) => !prev);
          setSearch("");
        }}
        onBlur={(e) => {
          if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
        selectedTags={displayTags}
      />
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-[220px]"
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).tagName !== "INPUT") {
              e.preventDefault();
            }
          }}
        >
          <TagPickerDropdown
            createLabel={(name) => `Create tag "${name}"`}
            onCreateTag={onCreateTag}
            onSearchChange={setSearch}
            onTagToggle={onTagToggle}
            search={search}
            selectedTagIds={displayTagIds}
            tagOptions={tagOptions}
          />
        </div>
      ) : null}
    </div>
  );
}
