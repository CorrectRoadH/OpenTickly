import { Dropdown, SelectButton, useDropdownClose } from "@opentoggl/web-ui";
import { type ReactElement, useMemo, useState } from "react";

type TimezoneOption = {
  name: string;
  offset: string | null;
  region: string;
  subLabel: string;
};

export function TimezonePicker({
  onChange,
  placeholder,
  searchPlaceholder,
  testId,
  timezones,
  value,
}: {
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder: string;
  testId?: string;
  timezones: readonly string[];
  value: string;
}): ReactElement {
  const options = useMemo(() => buildOptions(timezones), [timezones]);
  const selected = options.find((o) => o.name === value);
  const triggerLabel = selected ? formatDisplay(selected) : (placeholder ?? value);

  return (
    <Dropdown
      panelClassName="rounded-[8px] border border-[var(--track-overlay-border)] bg-[var(--track-overlay-surface)] shadow-[0_14px_32px_var(--track-shadow-overlay)]"
      trigger={
        <SelectButton aria-haspopup="listbox" data-testid={testId}>
          {triggerLabel}
        </SelectButton>
      }
    >
      <TimezonePickerPanel
        onChange={onChange}
        options={options}
        searchPlaceholder={searchPlaceholder}
        value={value}
      />
    </Dropdown>
  );
}

function TimezonePickerPanel({
  onChange,
  options,
  searchPlaceholder,
  value,
}: {
  onChange: (value: string) => void;
  options: readonly TimezoneOption[];
  searchPlaceholder: string;
  value: string;
}): ReactElement {
  const close = useDropdownClose();
  const [query, setQuery] = useState("");
  const [openRegions, setOpenRegions] = useState<Set<string>>(() => {
    const selected = options.find((o) => o.name === value);
    return new Set(selected ? [selected.region] : []);
  });

  const { groups, total } = useMemo(() => filterGroups(options, query), [options, query]);
  const isSearching = query.trim().length > 0;

  function toggle(region: string) {
    setOpenRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  }

  function handleSelect(name: string) {
    onChange(name);
    close();
  }

  return (
    <div className="flex w-[320px] flex-col">
      <div className="border-b border-[var(--track-border)] p-2">
        <input
          autoFocus
          className="h-8 w-full rounded-md border border-[var(--track-border)] bg-[var(--track-surface)] px-2.5 text-[12px] text-white outline-none placeholder:text-[var(--track-text-muted)] focus:border-[var(--track-accent)]"
          data-testid="timezone-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          type="text"
          value={query}
        />
      </div>
      <div className="max-h-[360px] overflow-y-auto py-1" role="listbox">
        {total === 0 ? (
          <div className="px-3 py-6 text-center text-[12px] text-[var(--track-text-muted)]">
            No matches
          </div>
        ) : (
          [...groups.entries()].map(([region, items]) => {
            const open = isSearching || openRegions.has(region);
            return (
              <div key={region}>
                <button
                  aria-expanded={open}
                  className="flex w-full items-center justify-between rounded-[6px] px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--track-text-soft)] hover:bg-[var(--track-row-hover)]"
                  data-testid={`timezone-group-${region}`}
                  onClick={() => toggle(region)}
                  type="button"
                >
                  <span>
                    {region}{" "}
                    <span className="font-normal lowercase text-[var(--track-text-muted)]">
                      ({items.length})
                    </span>
                  </span>
                  <span aria-hidden>{open ? "\u25BE" : "\u25B8"}</span>
                </button>
                {open
                  ? items.map((option) => (
                      <button
                        aria-selected={option.name === value}
                        className={`flex w-full items-center gap-2 rounded-[6px] px-3 py-2 pl-5 text-left text-[12px] transition-colors hover:bg-[var(--track-row-hover)] ${
                          option.name === value
                            ? "font-medium text-white"
                            : "text-[var(--track-text-soft)]"
                        }`}
                        key={option.name}
                        onClick={() => handleSelect(option.name)}
                        role="option"
                        type="button"
                      >
                        <span className="flex-1 truncate">{option.name}</span>
                        {option.offset ? (
                          <span className="shrink-0 tabular-nums text-[var(--track-text-muted)]">
                            UTC{option.offset}
                          </span>
                        ) : null}
                      </button>
                    ))
                  : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function buildOptions(timezones: readonly string[]): TimezoneOption[] {
  const now = new Date();
  return timezones.map((name) => {
    const slash = name.indexOf("/");
    const region = slash >= 0 ? name.slice(0, slash) : "Other";
    const subLabel = slash >= 0 ? name.slice(slash + 1) : name;
    return { name, offset: formatOffset(name, now), region, subLabel };
  });
}

function filterGroups(
  options: readonly TimezoneOption[],
  query: string,
): { groups: Map<string, TimezoneOption[]>; total: number } {
  const trimmed = query.trim().toLowerCase();
  const groups = new Map<string, TimezoneOption[]>();
  let total = 0;
  for (const option of options) {
    if (trimmed) {
      const haystack = `${option.name.toLowerCase()} ${option.offset?.toLowerCase() ?? ""}`;
      if (!haystack.includes(trimmed)) continue;
    }
    const list = groups.get(option.region) ?? [];
    list.push(option);
    groups.set(option.region, list);
    total += 1;
  }
  return { groups, total };
}

function formatOffset(timezone: string, now: Date): string | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset",
    }).formatToParts(now);
    const offset = parts.find((part) => part.type === "timeZoneName")?.value ?? "";
    const stripped = offset.replace(/^GMT/, "").replace(/^UTC/, "");
    return stripped === "" ? "+00:00" : stripped;
  } catch {
    return null;
  }
}

function formatDisplay(option: TimezoneOption): string {
  return option.offset ? `${option.name}  (UTC${option.offset})` : option.name;
}
