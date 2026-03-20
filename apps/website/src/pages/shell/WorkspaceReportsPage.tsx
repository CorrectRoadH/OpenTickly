import { AppPanel } from "@opentoggl/web-ui";
import { type ReactElement } from "react";

export function WorkspaceReportsPage(): ReactElement {
  return (
    <AppPanel className="bg-white/95">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Reports</h1>
        <p className="text-sm leading-6 text-slate-600">
          Reports stay inside the current workspace shell while Wave 1 focuses on identity and
          tenant surfaces.
        </p>
      </div>
    </AppPanel>
  );
}
