import { client } from "../../generated/public-track/client.gen.ts";
import type {
  GetProjectGroupsErrors,
  GetProjectGroupsResponses,
} from "../../generated/public-track/types.gen.ts";

// Upstream declares project_ids as GET formData, which the generator omits.
// Keep that spec read-only and send the filter expected by the public handler.
export function getProjectGroups({
  workspaceId,
  projectIds,
}: {
  workspaceId: number;
  projectIds: number[];
}) {
  return client.get<GetProjectGroupsResponses, GetProjectGroupsErrors>({
    url: "/workspaces/{workspace_id}/project_groups",
    path: { workspace_id: workspaceId },
    query: { project_ids: projectIds.join(",") },
    security: [{ scheme: "basic", type: "http" }],
  });
}
