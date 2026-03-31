import { AppButton, PageLayout } from "@opentoggl/web-ui";
import { type ReactElement } from "react";

type TagDetailPageProps = {
  tagId: number;
  workspaceId: number;
};

export function TagDetailPage({ tagId, workspaceId }: TagDetailPageProps): ReactElement {
  return (
    <PageLayout
      title={`Tag ${tagId}`}
      subtitle="Tag detail view"
      headerActions={
        <AppButton
          variant="secondary"
          onClick={() => {
            window.location.href = `/workspaces/${workspaceId}/tags`;
          }}
        >
          Back to tags
        </AppButton>
      }
    >
      <div className="px-5 py-5">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] px-3 py-1 text-[12px] font-medium text-[var(--track-text-muted)]">
            Workspace {workspaceId}
          </span>
          <span className="rounded-[8px] border border-[var(--track-accent)] bg-[var(--track-accent-soft)] px-3 py-1 text-[12px] font-medium text-[var(--track-accent-text)]">
            Tag {tagId}
          </span>
        </div>

        <div className="mt-5 rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface-muted)] p-4">
          <p className="text-[14px] font-semibold text-white">
            This entry point keeps the formal tag route stable while the workspace directory remains
            the canonical place to review and update tag records.
          </p>
          <p className="mt-2 text-[14px] leading-6 text-[var(--track-text-muted)]">
            Return to the tags directory to create records, switch status views, and open another
            tag detail route.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
