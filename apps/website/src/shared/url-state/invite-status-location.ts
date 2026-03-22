import { z } from "zod";

const positiveIntegerSearchParamSchema = z.preprocess(
  (value) => {
    if (Array.isArray(value)) {
      return value[0];
    }

    if (typeof value === "number") {
      return String(value);
    }

    return value;
  },
  z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform((value) => Number(value)),
);

const optionalWorkspaceIdSchema = positiveIntegerSearchParamSchema.optional();
const optionalWorkspaceNameSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : undefined),
  z.string().min(1).optional(),
);

export type InviteStatusJoinedSearch = {
  workspaceId?: unknown;
  workspaceName?: unknown;
};

export function parseInviteStatusJoinedSearch(
  search: InviteStatusJoinedSearch | undefined,
): {
  workspaceId?: number;
  workspaceName?: string;
} {
  const parsedWorkspaceId = optionalWorkspaceIdSchema.safeParse(search?.workspaceId);
  const parsedWorkspaceName = optionalWorkspaceNameSchema.safeParse(search?.workspaceName);

  return {
    workspaceId: parsedWorkspaceId.success ? parsedWorkspaceId.data : undefined,
    workspaceName: parsedWorkspaceName.success ? parsedWorkspaceName.data : undefined,
  };
}
