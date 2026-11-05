import { DirectoryTableRenderCountBadge } from "@opentickly/web-ui";
import type { GithubComTogglTogglApiInternalModelsProject } from "../../shared/api/generated/public-track/types.gen.ts";
import { buildProjectTeamPath } from "../../shared/url-state/projects-location.ts";
import { ClientRowActions } from "./ClientRowActions.tsx";
import { type ClientListItem, resolveProjectColor } from "./clients-data.ts";

type ClientGroup = {
  client: ClientListItem;
  projects: GithubComTogglTogglApiInternalModelsProject[];
};
export function ClientDirectoryRow({
  group,
  onArchive,
  onDelete,
  onRename,
}: {
  group: ClientGroup;
  onArchive: (id: number) => void;
  onDelete: (id: number) => void;
  onRename: (id: number, name: string) => void;
}) {
  return (
    <>
      <div className="flex h-[44px] items-center gap-2">
        <span className="truncate text-white">{group.client.name}</span>
        <span className="text-[14px] text-[var(--track-text-muted)]">
          ({group.projects.length})
        </span>
        <DirectoryTableRenderCountBadge />
      </div>
      <div className="flex h-[44px] items-center justify-end">
        <ClientRowActions
          clientId={group.client.id}
          clientName={group.client.name}
          onArchive={onArchive}
          onDelete={onDelete}
          onRename={onRename}
        />
      </div>
    </>
  );
}

export function ClientProjects({
  group,
  workspaceId,
}: {
  group: ClientGroup;
  workspaceId: number;
}) {
  return group.projects.map((project) => (
    <div className="flex h-[44px] items-center gap-2" key={`${group.client.id}-${project.id}`}>
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: resolveProjectColor(project) }}
      />
      <a
        className="truncate"
        href={buildProjectTeamPath(workspaceId, project.id ?? 0)}
        style={{ color: resolveProjectColor(project) }}
      >
        {project.name ?? "Untitled project"}
      </a>
    </div>
  ));
}
