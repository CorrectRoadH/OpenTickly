import { type ReactElement, useMemo, useState } from "react";
import { SelectField } from "@opentoggl/web-ui";

import { useSession } from "../../shared/session/session-context.tsx";

type SavedReport = {
  creator: string;
  id: string;
  isOwner: boolean;
  name: string;
  scheduling: "Off" | "Daily" | "Weekly" | "Monthly";
  sharing: "Private" | "Workspace";
};

type ShowFilter = "all" | "mine" | "shared";

export function ReportsCustomView(): ReactElement {
  const session = useSession();
  const userName = session.user.fullName ?? session.user.email ?? "You";

  const [showFilter, setShowFilter] = useState<ShowFilter>("all");
  const [search, setSearch] = useState("");

  // For now, generate one default saved report matching what Toggl shows
  const savedReports: SavedReport[] = useMemo(
    () => [
      {
        creator: userName,
        id: "default-summary",
        isOwner: true,
        name: "Summary report (This week)",
        scheduling: "Off",
        sharing: "Private",
      },
    ],
    [userName],
  );

  const filtered = useMemo(() => {
    let list = savedReports;
    if (showFilter === "mine") list = list.filter((r) => r.isOwner);
    if (showFilter === "shared") list = list.filter((r) => r.sharing === "Workspace");
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }
    return list;
  }, [savedReports, showFilter, search]);

  return (
    <section
      className="mt-5 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]"
      data-testid="reports-custom-view"
    >
      {/* Filter bar */}
      <div className="flex items-center gap-3 border-b border-[var(--track-border)] px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--track-text-muted)]">Show</span>
          <SelectField
            data-testid="custom-reports-show-filter"
            onChange={(e) => setShowFilter(e.target.value as ShowFilter)}
            value={showFilter}
          >
            <option value="all">All</option>
            <option value="mine">Mine</option>
            <option value="shared">Shared with me</option>
          </SelectField>
        </div>
        <div className="flex flex-1 items-center gap-2 rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3">
          <svg
            className="h-3.5 w-3.5 shrink-0 text-[var(--track-text-muted)]"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" x2="16.65" y1="21" y2="16.65" />
          </svg>
          <input
            className="h-8 flex-1 bg-transparent text-[12px] text-white placeholder:text-[var(--track-text-muted)] focus:outline-none"
            data-testid="custom-reports-search"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find reports..."
            type="text"
            value={search}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-[var(--track-border)]">
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
                Name
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
                Creator
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
                Scheduling
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
                Sharing
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
                Link
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
                Pin
              </th>
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  className="px-5 py-12 text-center text-[14px] text-[var(--track-text-muted)]"
                  colSpan={7}
                >
                  No saved reports found.
                </td>
              </tr>
            ) : (
              filtered.map((report) => (
                <tr
                  className="cursor-pointer border-b border-[var(--track-border)] last:border-b-0 hover:bg-[var(--track-row-hover)]"
                  key={report.id}
                >
                  <td className="px-5 py-3">
                    <span className="text-white">{report.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--track-accent-soft)] text-[10px] font-semibold text-[var(--track-accent)]">
                        {report.creator.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-white">
                        {report.creator}
                        {report.isOwner ? (
                          <span className="text-[var(--track-text-muted)]"> (you)</span>
                        ) : null}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--track-text-muted)]">{report.scheduling}</td>
                  <td className="px-4 py-3 text-[var(--track-text-muted)]">{report.sharing}</td>
                  <td className="px-4 py-3">
                    <button
                      className="text-[var(--track-text-muted)] hover:text-white"
                      title="Copy link"
                      type="button"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="text-[var(--track-text-muted)] hover:text-white"
                      title="Pin report"
                      type="button"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 17v5M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                      </svg>
                    </button>
                  </td>
                  <td className="px-2 py-3">
                    <button
                      className="flex h-6 w-6 items-center justify-center text-[var(--track-text-muted)] hover:text-white"
                      title="More actions"
                      type="button"
                    >
                      ⋯
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
