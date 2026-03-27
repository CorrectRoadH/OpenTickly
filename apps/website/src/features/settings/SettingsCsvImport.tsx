import { ShellSurfaceCard } from "@opentoggl/web-ui";
import { useNavigate } from "@tanstack/react-router";
import type { ReactElement } from "react";

import { buildWorkspaceImportPath } from "../../shared/lib/workspace-routing.ts";

const expectedColumns = [
  { name: "Description", detail: "Time entry description" },
  { name: "Project", detail: "Project name" },
  { name: "Client", detail: "Client name" },
  { name: "Start", detail: "Start date/time (ISO 8601)" },
  { name: "Stop", detail: "Stop date/time (ISO 8601)" },
  { name: "Duration", detail: "Duration in HH:MM:SS format" },
  { name: "Billable", detail: "Yes or No" },
  { name: "Tags", detail: "Comma-separated tag names" },
];

type SettingsCsvImportProps = {
  workspaceId: number;
};

export function SettingsCsvImport({ workspaceId }: SettingsCsvImportProps): ReactElement {
  const navigate = useNavigate();

  return (
    <ShellSurfaceCard>
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-[16px] font-semibold text-white">CSV Import</h2>
          <p className="mt-1 text-[13px] text-[var(--track-text-muted)]">
            Import time entries into your workspace from a CSV file. The import tool validates your
            file, maps columns, and lets you review entries before committing.
          </p>
        </div>

        <div>
          <h3 className="mb-2 text-[14px] font-medium text-[var(--track-text-soft)]">
            Expected CSV format
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--track-border)] text-[var(--track-text-soft)]">
                  <th className="pb-2 pr-4 font-medium">Column</th>
                  <th className="pb-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {expectedColumns.map((col) => (
                  <tr
                    className="border-b border-[var(--track-border)] last:border-b-0"
                    key={col.name}
                  >
                    <td className="py-2 pr-4 font-mono text-white">{col.name}</td>
                    <td className="py-2 text-[var(--track-text-muted)]">{col.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <button
          className="h-9 rounded-[8px] bg-[var(--track-accent)] px-5 text-[13px] font-semibold text-black"
          onClick={() => {
            void navigate({ to: buildWorkspaceImportPath(workspaceId) });
          }}
          type="button"
        >
          Go to CSV Import
        </button>
      </div>
    </ShellSurfaceCard>
  );
}
