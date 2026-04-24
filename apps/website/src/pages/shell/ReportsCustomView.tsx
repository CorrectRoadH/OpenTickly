import { type ReactElement, useState } from "react";
import { Link, Pin, Search } from "lucide-react";
import { SelectDropdown } from "@opentickly/web-ui";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("reports");
  const session = useSession();
  const userName = session.user.fullName ?? session.user.email ?? "You";

  const [showFilter, setShowFilter] = useState<ShowFilter>("all");
  const [search, setSearch] = useState("");

  // For now, generate one default saved report matching what Toggl shows
  const savedReports: SavedReport[] = [
    {
      creator: userName,
      id: "default-summary",
      isOwner: true,
      name: "Summary report (This week)",
      scheduling: "Off",
      sharing: "Private",
    },
  ];

  const filtered = (() => {
    let list = savedReports;
    if (showFilter === "mine") list = list.filter((r) => r.isOwner);
    if (showFilter === "shared") list = list.filter((r) => r.sharing === "Workspace");
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }
    return list;
  })();

  return (
    <section
      className="mt-5 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)]"
      data-testid="reports-custom-view"
    >
      {/* Filter bar */}
      <div className="flex items-center gap-3 border-b border-[var(--track-border)] px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--track-text-muted)]">{t("show")}</span>
          <SelectDropdown
            data-testid="custom-reports-show-filter"
            onChange={(value) => setShowFilter(value as ShowFilter)}
            options={[
              { label: t("all"), value: "all" },
              { label: t("mine"), value: "mine" },
              { label: t("sharedWithMe"), value: "shared" },
            ]}
            value={showFilter}
          />
        </div>
        <div className="flex flex-1 items-center gap-2 rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3">
          <Search
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 text-[var(--track-text-muted)]"
            size={14}
            strokeWidth={2}
          />
          <input
            className="h-8 flex-1 bg-transparent text-[12px] text-white placeholder:text-[var(--track-text-muted)] focus:outline-none"
            data-testid="custom-reports-search"
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("findReports")}
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
                {t("name")}
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
                {t("creator")}
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
                {t("scheduling")}
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
                {t("sharing")}
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
                {t("link")}
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
                {t("pin")}
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
                  {t("noSavedReports")}
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
                          <span className="text-[var(--track-text-muted)]"> {t("you")}</span>
                        ) : null}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--track-text-muted)]">{report.scheduling}</td>
                  <td className="px-4 py-3 text-[var(--track-text-muted)]">{report.sharing}</td>
                  <td className="px-4 py-3">
                    <button
                      className="text-[var(--track-text-muted)] hover:text-white"
                      title={t("copyLink")}
                      type="button"
                    >
                      <Link aria-hidden="true" className="h-4 w-4" size={16} strokeWidth={2} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="text-[var(--track-text-muted)] hover:text-white"
                      title={t("pinReport")}
                      type="button"
                    >
                      <Pin aria-hidden="true" className="h-4 w-4" size={16} strokeWidth={2} />
                    </button>
                  </td>
                  <td className="px-2 py-3">
                    <button
                      className="flex h-6 w-6 items-center justify-center text-[var(--track-text-muted)] hover:text-white"
                      title={t("moreActions")}
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
