import type { ReactNode } from "react";

import { WorkspaceProvider } from "./WorkspaceContext.tsx";
import { ViewStateProvider } from "./ViewStateContext.tsx";
import { TimeEntriesProvider } from "./TimeEntriesContext.tsx";
import { RunningTimerProvider } from "./RunningTimerContext.tsx";
import { TimerInputProvider } from "./TimerInputContext.tsx";
import { SelectedEntryProvider } from "./SelectedEntryContext.tsx";

export function TimerPageProviders({
  children,
  initialDate,
  showAllEntries = false,
}: {
  children: ReactNode;
  initialDate?: Date;
  showAllEntries?: boolean;
}) {
  return (
    <WorkspaceProvider>
      <ViewStateProvider initialDate={initialDate}>
        <TimeEntriesProvider showAllEntries={showAllEntries}>
          <RunningTimerProvider>
            <TimerInputProvider>
              <SelectedEntryProvider>{children}</SelectedEntryProvider>
            </TimerInputProvider>
          </RunningTimerProvider>
        </TimeEntriesProvider>
      </ViewStateProvider>
    </WorkspaceProvider>
  );
}
