import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  loadGeneratedCustomOperationManifest,
  loadOpenTogglDocuments,
  resolveExternalHeaderRef,
  resolveExternalSchemaRef,
} from "../../src/testing/openapi/custom-documents.ts";
import {
  capabilitySnapshotSchema,
  featureGateDecisionHeaderSchema,
  featureGateDecisionSchema,
  quotaWindowSchema,
  quotaWindowHeaderSchemas,
} from "@opentoggl/shared-contracts";
import { validateGeneratedSchemaValue } from "../../src/testing/contracts/schema-backed-validator.ts";

const webOpenapiSourcePath = resolve(
  import.meta.dirname,
  "../../../../openapi/opentoggl-web.openapi.json",
);

describe("opentoggl custom OpenAPI sources", () => {
  const wave1WebPaths = [
    "/web/v1/auth/login",
    "/web/v1/auth/logout",
    "/web/v1/auth/register",
    "/web/v1/session",
    "/web/v1/profile",
    "/web/v1/profile/api-token/reset",
    "/web/v1/preferences",
    "/web/v1/organizations/{organization_id}/settings",
    "/web/v1/workspaces/{workspace_id}/settings",
    "/web/v1/workspaces/{workspace_id}/capabilities",
    "/web/v1/workspaces/{workspace_id}/quota",
  ] as const;

  const wave2ManagedWebPaths = [
    "/web/v1/workspaces/{workspace_id}/permissions",
    "/web/v1/workspaces/{workspace_id}/members",
    "/web/v1/workspaces/{workspace_id}/members/{member_id}/disable",
    "/web/v1/workspaces/{workspace_id}/members/{member_id}/restore",
    "/web/v1/workspaces/{workspace_id}/members/{member_id}",
    "/web/v1/workspaces/{workspace_id}/members/{member_id}/rate-cost",
    "/web/v1/workspaces/{workspace_id}/members/invitations",
    "/web/v1/projects",
    "/web/v1/projects/{project_id}",
    "/web/v1/projects/{project_id}/archive",
    "/web/v1/projects/{project_id}/pin",
    "/web/v1/projects/{project_id}/members",
    "/web/v1/projects/{project_id}/members/{member_id}",
    "/web/v1/clients",
    "/web/v1/tasks",
    "/web/v1/tags",
    "/web/v1/groups",
  ] as const;

  const currentWebPaths = [...wave1WebPaths, ...wave2ManagedWebPaths] as const;

  const wave1WebOperations = [
    "POST /web/v1/auth/login",
    "POST /web/v1/auth/logout",
    "POST /web/v1/auth/register",
    "GET /web/v1/session",
    "GET /web/v1/profile",
    "PATCH /web/v1/profile",
    "POST /web/v1/profile/api-token/reset",
    "GET /web/v1/preferences",
    "PATCH /web/v1/preferences",
    "GET /web/v1/organizations/{organization_id}/settings",
    "PATCH /web/v1/organizations/{organization_id}/settings",
    "GET /web/v1/workspaces/{workspace_id}/settings",
    "PATCH /web/v1/workspaces/{workspace_id}/settings",
    "GET /web/v1/workspaces/{workspace_id}/capabilities",
    "GET /web/v1/workspaces/{workspace_id}/quota",
  ] as const;

  const wave2ManagedWebOperations = [
    "GET /web/v1/workspaces/{workspace_id}/permissions",
    "PATCH /web/v1/workspaces/{workspace_id}/permissions",
    "GET /web/v1/workspaces/{workspace_id}/members",
    "POST /web/v1/workspaces/{workspace_id}/members/{member_id}/disable",
    "POST /web/v1/workspaces/{workspace_id}/members/{member_id}/restore",
    "DELETE /web/v1/workspaces/{workspace_id}/members/{member_id}",
    "PATCH /web/v1/workspaces/{workspace_id}/members/{member_id}/rate-cost",
    "POST /web/v1/workspaces/{workspace_id}/members/invitations",
    "GET /web/v1/projects",
    "POST /web/v1/projects",
    "GET /web/v1/projects/{project_id}",
    "POST /web/v1/projects/{project_id}/archive",
    "DELETE /web/v1/projects/{project_id}/archive",
    "POST /web/v1/projects/{project_id}/pin",
    "DELETE /web/v1/projects/{project_id}/pin",
    "GET /web/v1/projects/{project_id}/members",
    "POST /web/v1/projects/{project_id}/members",
    "DELETE /web/v1/projects/{project_id}/members/{member_id}",
    "GET /web/v1/clients",
    "POST /web/v1/clients",
    "GET /web/v1/tasks",
    "POST /web/v1/tasks",
    "GET /web/v1/tags",
    "POST /web/v1/tags",
    "GET /web/v1/groups",
    "POST /web/v1/groups",
  ] as const;

  const currentWebOperations = [...wave1WebOperations, ...wave2ManagedWebOperations] as const;

  it("defines the Wave 0 custom boundary documents", () => {
    const documents = loadOpenTogglDocuments();

    expect(documents.map((document) => document.source)).toEqual([
      "opentoggl-web.openapi.json",
      "opentoggl-import.openapi.json",
      "opentoggl-admin.openapi.json",
    ]);
    for (const document of documents) {
      expect(Object.keys(document.document.paths ?? {})).not.toHaveLength(0);
    }
  });

  it("loads the generated custom manifest skeleton with resolved external refs", () => {
    const manifest = loadGeneratedCustomOperationManifest();

    expect(manifest.generatedFrom).toEqual([
      "openapi/opentoggl-web.openapi.json",
      "openapi/opentoggl-import.openapi.json",
      "openapi/opentoggl-admin.openapi.json",
    ]);
    expect(manifest.operations.every((entry) => entry.operationId.length > 0)).toBe(true);
    expect(
      manifest.operations.find(
        (entry) =>
          entry.path === "/web/v1/workspaces/{workspace_id}/quota" && entry.method === "get",
      )?.responses["200"]?.headers["X-OpenToggl-Quota-Remaining"]?.$ref,
    ).toBe(
      // The custom manifest should track the shared OpenAPI SSOT under openapi/.
      "./opentoggl-shared.openapi.json#/components/headers/X-OpenToggl-Quota-Remaining",
    );
  });

  it("defines the current web shell boundary for Wave 1 plus the first Wave 2 runtime-managed slice", () => {
    const webDocument = loadOpenTogglDocuments()[0]?.document;

    expect(Object.keys(webDocument?.paths ?? {})).toEqual(currentWebPaths);
    expect(webDocument?.paths?.["/web/v1/auth/register"]?.post?.operationId).toBe(
      "register-web-user",
    );
    expect(webDocument?.paths?.["/web/v1/auth/login"]?.post?.operationId).toBe("login-web-user");
    expect(webDocument?.paths?.["/web/v1/session"]?.get?.operationId).toBe("get-web-session");
    expect(webDocument?.paths?.["/web/v1/profile"]?.patch?.operationId).toBe(
      "update-current-user-profile",
    );
    expect(webDocument?.paths?.["/web/v1/profile/api-token/reset"]?.post?.operationId).toBe(
      "reset-current-user-api-token",
    );
    expect(
      webDocument?.paths?.["/web/v1/organizations/{organization_id}/settings"]?.patch?.operationId,
    ).toBe("update-organization-settings");
    expect(
      webDocument?.paths?.["/web/v1/workspaces/{workspace_id}/settings"]?.patch?.operationId,
    ).toBe("update-workspace-settings");
    expect(
      webDocument?.paths?.["/web/v1/workspaces/{workspace_id}/permissions"]?.get?.operationId,
    ).toBe("get-workspace-permissions");
    expect(
      webDocument?.paths?.["/web/v1/workspaces/{workspace_id}/permissions"]?.patch?.operationId,
    ).toBe("update-workspace-permissions");
    expect(
      webDocument?.paths?.["/web/v1/workspaces/{workspace_id}/members"]?.get?.operationId,
    ).toBe("list-workspace-members");
    expect(
      webDocument?.paths?.["/web/v1/workspaces/{workspace_id}/members/invitations"]?.post
        ?.operationId,
    ).toBe("invite-workspace-member");
    expect(webDocument?.paths?.["/web/v1/projects"]?.get?.operationId).toBe("list-projects");
    expect(webDocument?.paths?.["/web/v1/projects"]?.post?.operationId).toBe("create-project");
    expect(webDocument?.paths?.["/web/v1/projects/{project_id}"]?.get?.operationId).toBe(
      "get-project",
    );
    expect(webDocument?.paths?.["/web/v1/projects/{project_id}/archive"]?.post?.operationId).toBe(
      "archive-project",
    );
    expect(
      webDocument?.paths?.["/web/v1/projects/{project_id}/archive"]?.delete?.operationId,
    ).toBe("restore-project");
    expect(webDocument?.paths?.["/web/v1/projects/{project_id}/pin"]?.post?.operationId).toBe(
      "pin-project",
    );
    expect(webDocument?.paths?.["/web/v1/projects/{project_id}/pin"]?.delete?.operationId).toBe(
      "unpin-project",
    );
    expect(webDocument?.paths?.["/web/v1/projects/{project_id}/members"]?.get?.operationId).toBe(
      "list-project-members",
    );
    expect(webDocument?.paths?.["/web/v1/projects/{project_id}/members"]?.post?.operationId).toBe(
      "grant-project-member",
    );
    expect(
      webDocument?.paths?.["/web/v1/projects/{project_id}/members/{member_id}"]?.delete
        ?.operationId,
    ).toBe("revoke-project-member");
    expect(webDocument?.paths?.["/web/v1/clients"]?.get?.operationId).toBe("list-clients");
    expect(webDocument?.paths?.["/web/v1/clients"]?.post?.operationId).toBe("create-client");
    expect(webDocument?.paths?.["/web/v1/tasks"]?.get?.operationId).toBe("list-tasks");
    expect(webDocument?.paths?.["/web/v1/tasks"]?.post?.operationId).toBe("create-task");
    expect(webDocument?.paths?.["/web/v1/tags"]?.get?.operationId).toBe("list-tags");
    expect(webDocument?.paths?.["/web/v1/tags"]?.post?.operationId).toBe("create-tag");
    expect(webDocument?.paths?.["/web/v1/groups"]?.get?.operationId).toBe("list-groups");
    expect(webDocument?.paths?.["/web/v1/groups"]?.post?.operationId).toBe("create-group");
  });

  it("keeps placeholder copy out of the web OpenAPI source", () => {
    const source = readFileSync(webOpenapiSourcePath, "utf8");
    expect(source).not.toContain("placeholder");
  });

  it("loads the generated manifest entries for the current generated web shell operations", () => {
    const manifest = loadGeneratedCustomOperationManifest();
    const webOperations = manifest.operations.filter(
      (entry) => entry.source === "opentoggl-web.openapi.json",
    );

    expect(webOperations).toHaveLength(currentWebOperations.length);
    expect(webOperations.map((entry) => `${entry.method.toUpperCase()} ${entry.path}`)).toEqual(
      currentWebOperations,
    );
  });

  it("defines explicit Wave 1 profile, preference, and tenant setting schemas instead of broad upstream passthrough DTOs", () => {
    const webDocument = loadOpenTogglDocuments()[0]?.document;

    const currentUserProfileSchema = webDocument?.components?.schemas?.CurrentUserProfile;
    const userPreferencesSchema = webDocument?.components?.schemas?.UserPreferences;
    const organizationSettingsSchema = webDocument?.components?.schemas?.OrganizationSettings;
    const workspaceSettingsSchema = webDocument?.components?.schemas?.WorkspaceSettings;
    const workspacePreferencesSchema = webDocument?.components?.schemas?.WorkspacePreferences;
    const subscriptionViewSchema = webDocument?.components?.schemas?.SubscriptionView;

    expect(currentUserProfileSchema?.$ref).toBeUndefined();
    expect(currentUserProfileSchema?.required).toEqual([
      "id",
      "email",
      "fullname",
      "api_token",
      "timezone",
      "default_workspace_id",
      "beginning_of_week",
      "country_id",
      "has_password",
      "2fa_enabled",
    ]);
    expect(userPreferencesSchema?.$ref).toBeUndefined();
    expect(userPreferencesSchema?.required).toEqual([
      "date_format",
      "timeofday_format",
      "duration_format",
      "pg_time_zone_name",
      "beginningOfWeek",
      "collapseTimeEntries",
      "language_code",
      "hide_sidebar_right",
      "reports_collapse",
      "manualMode",
      "manualEntryMode",
    ]);
    expect(organizationSettingsSchema?.$ref).toBeUndefined();
    expect(organizationSettingsSchema?.required).toEqual([
      "id",
      "name",
      "admin",
      "max_workspaces",
      "pricing_plan_name",
      "is_multi_workspace_enabled",
      "user_count",
    ]);
    expect(workspaceSettingsSchema?.$ref).toBeUndefined();
    expect(workspaceSettingsSchema?.required).toEqual([
      "id",
      "organization_id",
      "name",
      "default_currency",
      "default_hourly_rate",
      "rounding",
      "rounding_minutes",
      "reports_collapse",
      "only_admins_may_create_projects",
      "only_admins_may_create_tags",
      "only_admins_see_team_dashboard",
      "projects_billable_by_default",
      "projects_private_by_default",
      "projects_enforce_billable",
      "limit_public_project_data",
      "admin",
      "premium",
      "role",
    ]);
    expect(workspacePreferencesSchema?.$ref).toBeUndefined();
    expect(workspacePreferencesSchema?.required).toEqual([
      "hide_start_end_times",
      "report_locked_at",
    ]);
    expect(subscriptionViewSchema?.$ref).toBeUndefined();
    expect(subscriptionViewSchema?.required).toEqual(["plan_name", "state"]);
    expect(webDocument?.components?.schemas?.CurrentUserAPIToken?.required).toEqual(["api_token"]);
  });

  it("defines explicit minimal schemas for the first Wave 2 runtime-managed permission, member, and project slice", () => {
    const webDocument = loadOpenTogglDocuments()[0]?.document;

    const workspacePermissionsSchema = webDocument?.components?.schemas?.WorkspacePermissions;
    const updateWorkspacePermissionsRequestSchema =
      webDocument?.components?.schemas?.UpdateWorkspacePermissionsRequest;
    const workspaceMemberSchema = webDocument?.components?.schemas?.WorkspaceMember;
    const workspaceMembersEnvelopeSchema =
      webDocument?.components?.schemas?.WorkspaceMembersEnvelope;
    const workspaceMemberInvitationRequestSchema =
      webDocument?.components?.schemas?.WorkspaceMemberInvitationRequest;
    const projectSummarySchema = webDocument?.components?.schemas?.ProjectSummary;
    const projectListEnvelopeSchema = webDocument?.components?.schemas?.ProjectListEnvelope;
    const projectCreateRequestSchema = webDocument?.components?.schemas?.ProjectCreateRequest;
    const projectDetailSchema = webDocument?.components?.schemas?.ProjectDetail;
    const projectMemberGrantRequestSchema =
      webDocument?.components?.schemas?.ProjectMemberGrantRequest;
    const projectMemberSchema = webDocument?.components?.schemas?.ProjectMember;
    const projectMembersEnvelopeSchema = webDocument?.components?.schemas?.ProjectMembersEnvelope;
    const clientSummarySchema = webDocument?.components?.schemas?.ClientSummary;
    const clientListEnvelopeSchema = webDocument?.components?.schemas?.ClientListEnvelope;
    const clientCreateRequestSchema = webDocument?.components?.schemas?.ClientCreateRequest;
    const taskSummarySchema = webDocument?.components?.schemas?.TaskSummary;
    const taskListEnvelopeSchema = webDocument?.components?.schemas?.TaskListEnvelope;
    const taskCreateRequestSchema = webDocument?.components?.schemas?.TaskCreateRequest;
    const tagSummarySchema = webDocument?.components?.schemas?.TagSummary;
    const tagListEnvelopeSchema = webDocument?.components?.schemas?.TagListEnvelope;
    const tagCreateRequestSchema = webDocument?.components?.schemas?.TagCreateRequest;
    const groupSummarySchema = webDocument?.components?.schemas?.GroupSummary;
    const groupListEnvelopeSchema = webDocument?.components?.schemas?.GroupListEnvelope;
    const groupCreateRequestSchema = webDocument?.components?.schemas?.GroupCreateRequest;

    expect(workspacePermissionsSchema?.$ref).toBeUndefined();
    expect(workspacePermissionsSchema?.required).toEqual([
      "only_admins_may_create_projects",
      "only_admins_may_create_tags",
      "only_admins_see_team_dashboard",
      "limit_public_project_data",
    ]);
    expect(updateWorkspacePermissionsRequestSchema?.required).toEqual([
      "only_admins_may_create_projects",
      "only_admins_may_create_tags",
      "only_admins_see_team_dashboard",
      "limit_public_project_data",
    ]);
    expect(workspaceMemberSchema?.$ref).toBeUndefined();
    expect(workspaceMemberSchema?.required).toEqual([
      "id",
      "workspace_id",
      "email",
      "name",
      "role",
      "status",
      "hourly_rate",
      "labor_cost",
    ]);
    expect(workspaceMembersEnvelopeSchema?.properties?.members).toEqual({
      type: "array",
      items: {
        $ref: "#/components/schemas/WorkspaceMember",
      },
    });
    expect(workspaceMemberInvitationRequestSchema?.required).toEqual(["email"]);
    expect(workspaceMemberInvitationRequestSchema?.properties?.role).toEqual({
      type: "string",
      nullable: true,
    });

    expect(projectSummarySchema?.$ref).toBeUndefined();
    expect(projectSummarySchema?.required).toEqual([
      "id",
      "name",
      "workspace_id",
      "active",
      "pinned",
      "client_name",
      "template",
      "actual_seconds",
      "tracked_seconds_current_period",
      "tracked_seconds_previous_period",
      "recurring_period",
      "recurring_period_start",
      "recurring_period_end",
    ]);
    expect(projectSummarySchema?.properties?.client_name).toEqual({
      type: "string",
      nullable: true,
    });
    expect(projectSummarySchema?.properties?.template).toEqual({
      type: "boolean",
    });
    expect(projectSummarySchema?.properties?.actual_seconds).toEqual({
      type: "integer",
    });
    expect(projectSummarySchema?.properties?.tracked_seconds_current_period).toEqual({
      type: "integer",
    });
    expect(projectSummarySchema?.properties?.tracked_seconds_previous_period).toEqual({
      type: "integer",
    });
    expect(projectSummarySchema?.properties?.recurring_period).toEqual({
      type: "string",
      nullable: true,
    });
    expect(webDocument?.paths?.["/web/v1/projects"]?.get?.parameters).toContainEqual({
      name: "status",
      in: "query",
      required: false,
      schema: {
        type: "string",
        enum: ["all", "active", "archived"],
      },
    });
    expect(projectListEnvelopeSchema?.properties?.projects).toEqual({
      type: "array",
      items: {
        $ref: "#/components/schemas/ProjectSummary",
      },
    });
    expect(projectCreateRequestSchema?.required).toEqual(["workspace_id", "name"]);
    expect(projectDetailSchema?.$ref).toBeUndefined();
    expect(projectDetailSchema?.required).toEqual([
      "id",
      "workspace_id",
      "client_id",
      "name",
      "active",
      "pinned",
      "billable",
      "private",
      "template",
      "color",
      "currency",
      "estimated_seconds",
      "actual_seconds",
      "fixed_fee",
      "rate",
    ]);
    const projectDetailResponse =
      webDocument?.paths?.["/web/v1/projects/{project_id}"]?.get?.responses?.["200"];
    expect(projectDetailResponse).toMatchObject({
      content: {
        "application/json": {
          schema: {
            $ref: "#/components/schemas/ProjectDetail",
          },
        },
      },
    });
    expect(projectDetailResponse?.description).toEqual(expect.any(String));
    expect(projectDetailResponse?.description?.length).toBeGreaterThan(0);

    expect(projectMemberSchema?.$ref).toBeUndefined();
    expect(projectMemberGrantRequestSchema?.required).toEqual(["member_id"]);
    expect(projectMemberGrantRequestSchema?.properties?.role).toEqual({
      type: "string",
      nullable: true,
    });
    expect(projectMemberSchema?.required).toEqual(["project_id", "member_id", "role"]);
    expect(projectMembersEnvelopeSchema?.properties?.members).toEqual({
      type: "array",
      items: {
        $ref: "#/components/schemas/ProjectMember",
      },
    });
    expect(clientSummarySchema?.required).toEqual(["id", "name", "workspace_id", "active"]);
    expect(clientListEnvelopeSchema?.properties?.clients).toEqual({
      type: "array",
      items: {
        $ref: "#/components/schemas/ClientSummary",
      },
    });
    expect(clientCreateRequestSchema?.required).toEqual(["workspace_id", "name"]);

    expect(taskSummarySchema?.required).toEqual(["id", "name", "workspace_id", "active"]);
    expect(taskListEnvelopeSchema?.properties?.tasks).toEqual({
      type: "array",
      items: {
        $ref: "#/components/schemas/TaskSummary",
      },
    });
    expect(taskCreateRequestSchema?.required).toEqual(["workspace_id", "name"]);

    expect(tagSummarySchema?.required).toEqual(["id", "name", "workspace_id", "active"]);
    expect(tagListEnvelopeSchema?.properties?.tags).toEqual({
      type: "array",
      items: {
        $ref: "#/components/schemas/TagSummary",
      },
    });
    expect(tagCreateRequestSchema?.required).toEqual(["workspace_id", "name"]);

    expect(groupSummarySchema?.required).toEqual(["id", "name", "workspace_id", "active"]);
    expect(groupListEnvelopeSchema?.properties?.groups).toEqual({
      type: "array",
      items: {
        $ref: "#/components/schemas/GroupSummary",
      },
    });
    expect(groupCreateRequestSchema?.required).toEqual(["workspace_id", "name"]);
  });

  it("reuses the shared capability and quota schemas through external refs", () => {
    const documents = loadOpenTogglDocuments();

    const quotaRef = documents[0]?.document.components?.schemas?.QuotaWindow;
    const capabilityRef = documents[0]?.document.components?.schemas?.CapabilitySnapshot;
    const featureGateRef = documents[2]?.document.components?.schemas?.FeatureGateDecision;

    expect(resolveExternalSchemaRef(quotaRef?.$ref)).toEqual(quotaWindowSchema);
    expect(resolveExternalSchemaRef(capabilityRef?.$ref)).toEqual(capabilitySnapshotSchema);
    expect(resolveExternalSchemaRef(featureGateRef?.$ref)).toEqual(featureGateDecisionSchema);
  });

  it("reuses shared quota and feature-gate header contracts through external refs", () => {
    const documents = loadOpenTogglDocuments();

    const quotaHeaderRef =
      documents[0]?.document.paths?.["/web/v1/workspaces/{workspace_id}/quota"]?.get?.responses?.[
        "200"
      ]?.headers?.["X-OpenToggl-Quota-Remaining"]?.$ref;
    const featureGateHeaderRef =
      documents[2]?.document.paths?.["/admin/v1/features/{capability_key}"]?.get?.responses?.["200"]
        ?.headers?.["X-OpenToggl-Feature-Gate"]?.$ref;

    expect(resolveExternalHeaderRef(quotaHeaderRef)).toEqual(
      quotaWindowHeaderSchemas["X-OpenToggl-Quota-Remaining"],
    );
    expect(resolveExternalHeaderRef(featureGateHeaderRef)).toEqual(featureGateDecisionHeaderSchema);
  });

  it("defines session and setting envelopes around shared billing capability/quota truth", () => {
    const webDocument = loadOpenTogglDocuments()[0]?.document;
    const sessionShellSchema = webDocument?.components?.schemas?.SessionBootstrap;
    const organizationShellSchema = webDocument?.components?.schemas?.OrganizationSettingsEnvelope;
    const workspaceShellSchema = webDocument?.components?.schemas?.WorkspaceSettingsEnvelope;

    expect(sessionShellSchema?.required).toEqual([
      "current_organization_id",
      "current_workspace_id",
      "organization_subscription",
      "workspace_subscription",
      "user",
      "organizations",
      "workspaces",
      "workspace_capabilities",
      "workspace_quota",
    ]);
    expect(sessionShellSchema?.properties?.workspace_capabilities).toEqual({
      $ref: "#/components/schemas/CapabilitySnapshot",
      nullable: true,
    });
    expect(sessionShellSchema?.properties?.workspace_quota).toEqual({
      $ref: "#/components/schemas/QuotaWindow",
      nullable: true,
    });
    expect(sessionShellSchema?.properties?.organization_subscription).toEqual({
      $ref: "#/components/schemas/SubscriptionView",
      nullable: true,
    });
    expect(sessionShellSchema?.properties?.workspace_subscription).toEqual({
      $ref: "#/components/schemas/SubscriptionView",
      nullable: true,
    });

    expect(organizationShellSchema?.required).toEqual(["organization", "subscription"]);
    expect(workspaceShellSchema?.required).toEqual([
      "workspace",
      "preferences",
      "subscription",
      "capabilities",
      "quota",
    ]);
    expect(workspaceShellSchema?.properties?.workspace).toEqual({
      $ref: "#/components/schemas/WorkspaceSettings",
    });
    expect(workspaceShellSchema?.properties?.preferences).toEqual({
      $ref: "#/components/schemas/WorkspacePreferences",
    });
  });

  it("requires explicit profile and settings update payload shapes", () => {
    const webDocument = loadOpenTogglDocuments()[0]?.document;

    expect(webDocument?.components?.schemas?.UpdateCurrentUserProfileRequest?.required).toEqual([
      "email",
      "fullname",
      "timezone",
      "beginning_of_week",
      "country_id",
      "default_workspace_id",
    ]);
    expect(webDocument?.components?.schemas?.UpdateOrganizationSettingsRequest?.required).toEqual([
      "name",
    ]);
    expect(webDocument?.components?.schemas?.UpdateWorkspaceSettingsRequest?.required).toEqual([
      "name",
      "default_currency",
      "default_hourly_rate",
      "rounding",
      "rounding_minutes",
      "reports_collapse",
      "only_admins_may_create_projects",
      "only_admins_may_create_tags",
      "only_admins_see_team_dashboard",
      "projects_billable_by_default",
      "projects_private_by_default",
      "projects_enforce_billable",
      "limit_public_project_data",
    ]);
    expect(webDocument?.components?.schemas?.UpdateWorkspacePermissionsRequest?.required).toEqual([
      "only_admins_may_create_projects",
      "only_admins_may_create_tags",
      "only_admins_see_team_dashboard",
      "limit_public_project_data",
    ]);
  });

  it("accepts a Wave 1 workspace settings envelope that composes tenant settings with billing status, capabilities, and quota", () => {
    const manifest = loadGeneratedCustomOperationManifest();
    const operation = manifest.operations.find(
      (entry) =>
        entry.source === "opentoggl-web.openapi.json" &&
        entry.method === "get" &&
        entry.path === "/web/v1/workspaces/{workspace_id}/settings",
    );

    expect(operation).toBeDefined();

    const response = {
      workspace: {
        id: 11,
        organization_id: 1,
        name: "Analytics EU",
        default_currency: "EUR",
        default_hourly_rate: 150,
        rounding: 1,
        rounding_minutes: 15,
        only_admins_may_create_projects: true,
        only_admins_may_create_tags: false,
        only_admins_see_team_dashboard: false,
        projects_billable_by_default: true,
        projects_private_by_default: false,
        projects_enforce_billable: false,
        limit_public_project_data: false,
        reports_collapse: true,
        premium: true,
        admin: true,
        role: "admin",
      },
      preferences: {
        hide_start_end_times: true,
        report_locked_at: "2026-03-20T00:00:00Z",
      },
      subscription: {
        plan_name: "Starter",
        state: "active",
        enterprise: false,
      },
      capabilities: {
        context: {
          organization_id: 1,
          workspace_id: 11,
          scope: "workspace",
        },
        capabilities: [
          {
            key: "reports.summary",
            enabled: true,
            source: "billing",
          },
        ],
      },
      quota: {
        organization_id: 1,
        remaining: 7,
        resets_in_secs: 300,
        total: 10,
      },
    };

    const errors = validateGeneratedSchemaValue(
      response,
      operation?.responses["200"]?.bodySchema ?? undefined,
    );
    expect(errors).toEqual([]);
  });

  it("accepts a Wave 1 session bootstrap payload and rejects malformed settings update requests", () => {
    const manifest = loadGeneratedCustomOperationManifest();
    const webDocument = loadOpenTogglDocuments()[0]?.document;
    const operation = manifest.operations.find(
      (entry) =>
        entry.source === "opentoggl-web.openapi.json" &&
        entry.method === "get" &&
        entry.path === "/web/v1/session",
    );

    expect(operation).toBeDefined();

    const bootstrapResponse = {
      current_organization_id: 1,
      current_workspace_id: 11,
      organization_subscription: {
        plan_name: "Free",
        state: "free",
      },
      workspace_subscription: {
        plan_name: "Free",
        state: "free",
      },
      user: {
        id: 41,
        email: "worker1@opentoggl.dev",
        fullname: "Worker 1",
        api_token: "api-token-41",
        timezone: "UTC",
        default_workspace_id: 11,
        beginning_of_week: 1,
        country_id: 220,
        has_password: true,
        "2fa_enabled": false,
      },
      organizations: [
        {
          id: 1,
          name: "OpenToggl Org",
          admin: true,
          max_workspaces: 1,
          pricing_plan_name: "Free",
          is_multi_workspace_enabled: false,
          user_count: 1,
        },
      ],
      workspaces: [
        {
          id: 11,
          organization_id: 1,
          name: "OpenToggl Workspace",
          default_currency: "USD",
          default_hourly_rate: 0,
          rounding: 0,
          rounding_minutes: 0,
          reports_collapse: false,
          only_admins_may_create_projects: false,
          only_admins_may_create_tags: false,
          only_admins_see_team_dashboard: false,
          projects_billable_by_default: true,
          projects_private_by_default: false,
          projects_enforce_billable: false,
          limit_public_project_data: false,
          admin: true,
          premium: false,
          role: "admin",
        },
      ],
      workspace_capabilities: {
        context: {
          organization_id: 1,
          workspace_id: 11,
          scope: "workspace",
        },
        capabilities: [
          {
            key: "reports.summary",
            enabled: true,
            source: "billing",
          },
        ],
      },
      workspace_quota: {
        organization_id: 1,
        remaining: 7,
        resets_in_secs: 300,
        total: 10,
      },
    };

    const bootstrapErrors = validateGeneratedSchemaValue(
      bootstrapResponse,
      operation?.responses["200"]?.bodySchema ?? undefined,
    );
    expect(bootstrapErrors).toEqual([]);

    const malformedWorkspaceSettingsUpdate = {
      default_currency: "USD",
    };
    const malformedWorkspaceUpdateErrors = validateGeneratedSchemaValue(
      malformedWorkspaceSettingsUpdate,
      webDocument?.components?.schemas?.UpdateWorkspaceSettingsRequest,
    );
    expect(malformedWorkspaceUpdateErrors).toContain("$.name is required");
  });

  it("accepts the current-user api token reset payload", () => {
    const manifest = loadGeneratedCustomOperationManifest();
    const operation = manifest.operations.find(
      (entry) =>
        entry.source === "opentoggl-web.openapi.json" &&
        entry.method === "post" &&
        entry.path === "/web/v1/profile/api-token/reset",
    );

    expect(operation).toBeDefined();

    const response = {
      api_token: "api-token-77",
    };

    const errors = validateGeneratedSchemaValue(
      response,
      operation?.responses["200"]?.bodySchema ?? undefined,
    );
    expect(errors).toEqual([]);
  });

  it("accepts the minimal workspace permissions contract payload and rejects malformed permission updates", () => {
    const manifest = loadGeneratedCustomOperationManifest();
    const webDocument = loadOpenTogglDocuments()[0]?.document;
    const getWorkspacePermissionsOperation = manifest.operations.find(
      (entry) =>
        entry.source === "opentoggl-web.openapi.json" &&
        entry.method === "get" &&
        entry.path === "/web/v1/workspaces/{workspace_id}/permissions",
    );

    expect(getWorkspacePermissionsOperation).toBeDefined();

    const workspacePermissionsResponse = {
      only_admins_may_create_projects: true,
      only_admins_may_create_tags: false,
      only_admins_see_team_dashboard: true,
      limit_public_project_data: false,
    };
    const workspacePermissionsErrors = validateGeneratedSchemaValue(
      workspacePermissionsResponse,
      getWorkspacePermissionsOperation?.responses["200"]?.bodySchema ?? undefined,
    );
    expect(workspacePermissionsErrors).toEqual([]);

    const malformedWorkspacePermissionsUpdate = {
      only_admins_may_create_projects: true,
    };
    const malformedWorkspacePermissionsUpdateErrors = validateGeneratedSchemaValue(
      malformedWorkspacePermissionsUpdate,
      webDocument?.components?.schemas?.UpdateWorkspacePermissionsRequest,
    );
    expect(malformedWorkspacePermissionsUpdateErrors).toContain(
      "$.only_admins_may_create_tags is required",
    );
  });

  it("accepts the first Wave 2 runtime-managed permission, member, project, client, task, tag, and group payloads and rejects malformed request shapes", () => {
    const manifest = loadGeneratedCustomOperationManifest();
    const webDocument = loadOpenTogglDocuments()[0]?.document;

    const getWorkspacePermissionsOperation = manifest.operations.find(
      (entry) =>
        entry.source === "opentoggl-web.openapi.json" &&
        entry.method === "get" &&
        entry.path === "/web/v1/workspaces/{workspace_id}/permissions",
    );
    const updateWorkspacePermissionsOperation = manifest.operations.find(
      (entry) =>
        entry.source === "opentoggl-web.openapi.json" &&
        entry.method === "patch" &&
        entry.path === "/web/v1/workspaces/{workspace_id}/permissions",
    );
    const workspaceMembersOperation = manifest.operations.find(
      (entry) =>
        entry.source === "opentoggl-web.openapi.json" &&
        entry.method === "get" &&
        entry.path === "/web/v1/workspaces/{workspace_id}/members",
    );
    const inviteWorkspaceMemberOperation = manifest.operations.find(
      (entry) =>
        entry.source === "opentoggl-web.openapi.json" &&
        entry.method === "post" &&
        entry.path === "/web/v1/workspaces/{workspace_id}/members/invitations",
    );
    const listProjectsOperation = manifest.operations.find(
      (entry) =>
        entry.source === "opentoggl-web.openapi.json" &&
        entry.method === "get" &&
        entry.path === "/web/v1/projects",
    );
    const createProjectOperation = manifest.operations.find(
      (entry) =>
        entry.source === "opentoggl-web.openapi.json" &&
        entry.method === "post" &&
        entry.path === "/web/v1/projects",
    );
    const getProjectOperation = manifest.operations.find(
      (entry) =>
        entry.source === "opentoggl-web.openapi.json" &&
        entry.method === "get" &&
        entry.path === "/web/v1/projects/{project_id}",
    );
    const projectMembersOperation = manifest.operations.find(
      (entry) =>
        entry.source === "opentoggl-web.openapi.json" &&
        entry.method === "get" &&
        entry.path === "/web/v1/projects/{project_id}/members",
    );
    const grantProjectMemberOperation = manifest.operations.find(
      (entry) =>
        entry.source === "opentoggl-web.openapi.json" &&
        entry.method === "post" &&
        entry.path === "/web/v1/projects/{project_id}/members",
    );
    const revokeProjectMemberOperation = manifest.operations.find(
      (entry) =>
        entry.source === "opentoggl-web.openapi.json" &&
        entry.method === "delete" &&
        entry.path === "/web/v1/projects/{project_id}/members/{member_id}",
    );
    const listClientsOperation = manifest.operations.find(
      (entry) =>
        entry.source === "opentoggl-web.openapi.json" &&
        entry.method === "get" &&
        entry.path === "/web/v1/clients",
    );
    const createClientOperation = manifest.operations.find(
      (entry) =>
        entry.source === "opentoggl-web.openapi.json" &&
        entry.method === "post" &&
        entry.path === "/web/v1/clients",
    );
    const listTasksOperation = manifest.operations.find(
      (entry) =>
        entry.source === "opentoggl-web.openapi.json" &&
        entry.method === "get" &&
        entry.path === "/web/v1/tasks",
    );
    const createTaskOperation = manifest.operations.find(
      (entry) =>
        entry.source === "opentoggl-web.openapi.json" &&
        entry.method === "post" &&
        entry.path === "/web/v1/tasks",
    );
    const listTagsOperation = manifest.operations.find(
      (entry) =>
        entry.source === "opentoggl-web.openapi.json" &&
        entry.method === "get" &&
        entry.path === "/web/v1/tags",
    );
    const createTagOperation = manifest.operations.find(
      (entry) =>
        entry.source === "opentoggl-web.openapi.json" &&
        entry.method === "post" &&
        entry.path === "/web/v1/tags",
    );
    const listGroupsOperation = manifest.operations.find(
      (entry) =>
        entry.source === "opentoggl-web.openapi.json" &&
        entry.method === "get" &&
        entry.path === "/web/v1/groups",
    );
    const createGroupOperation = manifest.operations.find(
      (entry) =>
        entry.source === "opentoggl-web.openapi.json" &&
        entry.method === "post" &&
        entry.path === "/web/v1/groups",
    );

    expect(getWorkspacePermissionsOperation).toBeDefined();
    expect(updateWorkspacePermissionsOperation).toBeDefined();
    expect(workspaceMembersOperation).toBeDefined();
    expect(inviteWorkspaceMemberOperation).toBeDefined();
    expect(inviteWorkspaceMemberOperation?.responses["201"]?.bodySchema).toMatchObject({
      type: "object",
    });
    expect(listProjectsOperation).toBeDefined();
    expect(createProjectOperation).toBeDefined();
    expect(getProjectOperation).toBeDefined();
    expect(projectMembersOperation).toBeDefined();
    expect(grantProjectMemberOperation).toBeDefined();
    expect(revokeProjectMemberOperation).toBeDefined();
    expect(revokeProjectMemberOperation?.responses["204"]?.bodySchema).toBeNull();
    expect(listClientsOperation).toBeDefined();
    expect(createClientOperation).toBeDefined();
    expect(listTasksOperation).toBeDefined();
    expect(createTaskOperation).toBeDefined();
    expect(listTagsOperation).toBeDefined();
    expect(createTagOperation).toBeDefined();
    expect(listGroupsOperation).toBeDefined();
    expect(createGroupOperation).toBeDefined();

    const workspaceMembersResponse = {
      members: [
        {
          id: 1,
          workspace_id: 11,
          email: "member@example.com",
          name: "Sample Member",
          role: "admin",
          status: "joined",
          hourly_rate: 125,
          labor_cost: 80,
        },
      ],
    };
    const inviteWorkspaceMemberResponse = {};
    const projectsResponse = {
      projects: [
        {
          id: 1001,
          name: "Sample Project",
          workspace_id: 11,
          active: true,
          pinned: false,
          client_name: "North Ridge Client",
          template: false,
          actual_seconds: 7200,
          tracked_seconds_current_period: 3600,
          tracked_seconds_previous_period: 1800,
          recurring_period: "weekly",
          recurring_period_start: "2026-03-17",
          recurring_period_end: "2026-03-23",
        },
      ],
    };
    const createProjectRequest = {
      workspace_id: 11,
      name: "Launch Website",
    };
    const createProjectResponse = {
      id: 1002,
      workspace_id: 11,
      name: "Launch Website",
      active: true,
      pinned: false,
      client_name: null,
      template: false,
      actual_seconds: 0,
      tracked_seconds_current_period: 0,
      tracked_seconds_previous_period: 0,
      recurring_period: null,
      recurring_period_start: null,
      recurring_period_end: null,
    };
    const getProjectResponse = {
      id: 1001,
      workspace_id: 11,
      client_id: 501,
      name: "Sample Project",
      active: true,
      pinned: false,
      billable: true,
      private: false,
      template: false,
      color: "#2C7A7B",
      currency: "USD",
      estimated_seconds: 14400,
      actual_seconds: 7200,
      fixed_fee: 0,
      rate: 125,
    };
    const projectMembersResponse = {
      members: [
        {
          project_id: 1001,
          member_id: 41,
          role: "admin",
        },
      ],
    };
    const grantProjectMemberRequest = {
      member_id: 41,
      role: "member",
    };
    const grantProjectMemberResponse = {
      project_id: 1001,
      member_id: 41,
      role: "member",
    };
    const clientsResponse = {
      clients: [
        {
          id: 501,
          name: "North Ridge Client",
          workspace_id: 11,
          active: true,
        },
      ],
    };
    const createClientRequest = {
      workspace_id: 11,
      name: "Studio Partner",
    };
    const createClientResponse = {
      id: 502,
      workspace_id: 11,
      name: "Studio Partner",
      active: true,
    };
    const tasksResponse = {
      tasks: [
        {
          id: 901,
          name: "Weekly Sync",
          workspace_id: 11,
          active: true,
        },
      ],
    };
    const createTaskRequest = {
      workspace_id: 11,
      name: "Finalize Brief",
    };
    const createTaskResponse = {
      id: 902,
      workspace_id: 11,
      name: "Finalize Brief",
      active: true,
    };
    const tagsResponse = {
      tags: [
        {
          id: 801,
          name: "billable",
          workspace_id: 11,
          active: true,
        },
      ],
    };
    const createTagRequest = {
      workspace_id: 11,
      name: "marketing",
    };
    const createTagResponse = {
      id: 802,
      workspace_id: 11,
      name: "marketing",
      active: true,
    };
    const groupsResponse = {
      groups: [
        {
          id: 701,
          name: "Design",
          workspace_id: 11,
          active: true,
        },
      ],
    };
    const createGroupRequest = {
      workspace_id: 11,
      name: "Operations",
    };
    const createGroupResponse = {
      id: 702,
      workspace_id: 11,
      name: "Operations",
      active: true,
    };

    const workspaceMemberErrors = validateGeneratedSchemaValue(
      workspaceMembersResponse,
      workspaceMembersOperation?.responses["200"]?.bodySchema ?? undefined,
    );
    expect(workspaceMemberErrors).toEqual([]);

    const inviteWorkspaceMemberErrors = validateGeneratedSchemaValue(
      inviteWorkspaceMemberResponse,
      inviteWorkspaceMemberOperation?.responses["201"]?.bodySchema ?? undefined,
    );
    expect(inviteWorkspaceMemberErrors).toEqual([]);

    const listProjectsErrors = validateGeneratedSchemaValue(
      projectsResponse,
      listProjectsOperation?.responses["200"]?.bodySchema ?? undefined,
    );
    expect(listProjectsErrors).toEqual([]);

    const createProjectRequestErrors = validateGeneratedSchemaValue(
      createProjectRequest,
      webDocument?.components?.schemas?.ProjectCreateRequest,
    );
    expect(createProjectRequestErrors).toEqual([]);

    const createProjectResponseErrors = validateGeneratedSchemaValue(
      createProjectResponse,
      createProjectOperation?.responses["201"]?.bodySchema ?? undefined,
    );
    expect(createProjectResponseErrors).toEqual([]);

    const getProjectResponseErrors = validateGeneratedSchemaValue(
      getProjectResponse,
      getProjectOperation?.responses["200"]?.bodySchema ?? undefined,
    );
    expect(getProjectResponseErrors).toEqual([]);

    const projectMemberErrors = validateGeneratedSchemaValue(
      projectMembersResponse,
      projectMembersOperation?.responses["200"]?.bodySchema ?? undefined,
    );
    expect(projectMemberErrors).toEqual([]);

    const grantProjectMemberRequestErrors = validateGeneratedSchemaValue(
      grantProjectMemberRequest,
      webDocument?.components?.schemas?.ProjectMemberGrantRequest,
    );
    expect(grantProjectMemberRequestErrors).toEqual([]);

    const grantProjectMemberResponseErrors = validateGeneratedSchemaValue(
      grantProjectMemberResponse,
      grantProjectMemberOperation?.responses["201"]?.bodySchema ?? undefined,
    );
    expect(grantProjectMemberResponseErrors).toEqual([]);

    const listClientsErrors = validateGeneratedSchemaValue(
      clientsResponse,
      listClientsOperation?.responses["200"]?.bodySchema ?? undefined,
    );
    expect(listClientsErrors).toEqual([]);

    const createClientRequestErrors = validateGeneratedSchemaValue(
      createClientRequest,
      webDocument?.components?.schemas?.ClientCreateRequest,
    );
    expect(createClientRequestErrors).toEqual([]);

    const createClientResponseErrors = validateGeneratedSchemaValue(
      createClientResponse,
      createClientOperation?.responses["201"]?.bodySchema ?? undefined,
    );
    expect(createClientResponseErrors).toEqual([]);

    const listTasksErrors = validateGeneratedSchemaValue(
      tasksResponse,
      listTasksOperation?.responses["200"]?.bodySchema ?? undefined,
    );
    expect(listTasksErrors).toEqual([]);

    const createTaskRequestErrors = validateGeneratedSchemaValue(
      createTaskRequest,
      webDocument?.components?.schemas?.TaskCreateRequest,
    );
    expect(createTaskRequestErrors).toEqual([]);

    const createTaskResponseErrors = validateGeneratedSchemaValue(
      createTaskResponse,
      createTaskOperation?.responses["201"]?.bodySchema ?? undefined,
    );
    expect(createTaskResponseErrors).toEqual([]);

    const listTagsErrors = validateGeneratedSchemaValue(
      tagsResponse,
      listTagsOperation?.responses["200"]?.bodySchema ?? undefined,
    );
    expect(listTagsErrors).toEqual([]);

    const createTagRequestErrors = validateGeneratedSchemaValue(
      createTagRequest,
      webDocument?.components?.schemas?.TagCreateRequest,
    );
    expect(createTagRequestErrors).toEqual([]);

    const createTagResponseErrors = validateGeneratedSchemaValue(
      createTagResponse,
      createTagOperation?.responses["201"]?.bodySchema ?? undefined,
    );
    expect(createTagResponseErrors).toEqual([]);

    const listGroupsErrors = validateGeneratedSchemaValue(
      groupsResponse,
      listGroupsOperation?.responses["200"]?.bodySchema ?? undefined,
    );
    expect(listGroupsErrors).toEqual([]);

    const createGroupRequestErrors = validateGeneratedSchemaValue(
      createGroupRequest,
      webDocument?.components?.schemas?.GroupCreateRequest,
    );
    expect(createGroupRequestErrors).toEqual([]);

    const createGroupResponseErrors = validateGeneratedSchemaValue(
      createGroupResponse,
      createGroupOperation?.responses["201"]?.bodySchema ?? undefined,
    );
    expect(createGroupResponseErrors).toEqual([]);

    const malformedWorkspaceMemberInvitationRequest = {};
    const malformedInvitationErrors = validateGeneratedSchemaValue(
      malformedWorkspaceMemberInvitationRequest,
      webDocument?.components?.schemas?.WorkspaceMemberInvitationRequest,
    );
    expect(malformedInvitationErrors).toContain("$.email is required");

    const malformedProjectCreateRequest = {
      workspace_id: 11,
    };
    const malformedProjectCreateErrors = validateGeneratedSchemaValue(
      malformedProjectCreateRequest,
      webDocument?.components?.schemas?.ProjectCreateRequest,
    );
    expect(malformedProjectCreateErrors).toContain("$.name is required");

    const malformedProjectDetailResponse = {
      id: 1001,
      workspace_id: 11,
      client_id: 501,
      name: "Sample Project",
      active: true,
      pinned: false,
      billable: "yes",
      private: false,
      template: false,
      color: "#2C7A7B",
      currency: "USD",
      estimated_seconds: 14400,
      actual_seconds: 7200,
      fixed_fee: 0,
      rate: 125,
    };
    const malformedProjectDetailErrors = validateGeneratedSchemaValue(
      malformedProjectDetailResponse,
      getProjectOperation?.responses["200"]?.bodySchema ?? undefined,
    );
    expect(malformedProjectDetailErrors).toContain("$.billable should be a boolean");

    const malformedClientCreateRequest = {
      workspace_id: 11,
    };
    const malformedClientCreateErrors = validateGeneratedSchemaValue(
      malformedClientCreateRequest,
      webDocument?.components?.schemas?.ClientCreateRequest,
    );
    expect(malformedClientCreateErrors).toContain("$.name is required");

    const malformedTaskCreateRequest = {
      workspace_id: 11,
    };
    const malformedTaskCreateErrors = validateGeneratedSchemaValue(
      malformedTaskCreateRequest,
      webDocument?.components?.schemas?.TaskCreateRequest,
    );
    expect(malformedTaskCreateErrors).toContain("$.name is required");

    const malformedTagCreateRequest = {
      workspace_id: 11,
    };
    const malformedTagCreateErrors = validateGeneratedSchemaValue(
      malformedTagCreateRequest,
      webDocument?.components?.schemas?.TagCreateRequest,
    );
    expect(malformedTagCreateErrors).toContain("$.name is required");

    const malformedGroupCreateRequest = {
      workspace_id: 11,
    };
    const malformedGroupCreateErrors = validateGeneratedSchemaValue(
      malformedGroupCreateRequest,
      webDocument?.components?.schemas?.GroupCreateRequest,
    );
    expect(malformedGroupCreateErrors).toContain("$.name is required");

    const malformedProjectMembersResponse = {
      members: [
        {
          project_id: 1001,
          member_id: 41,
          role: 7,
        },
      ],
    };
    const malformedProjectMemberErrors = validateGeneratedSchemaValue(
      malformedProjectMembersResponse,
      projectMembersOperation?.responses["200"]?.bodySchema ?? undefined,
    );
    expect(malformedProjectMemberErrors).toContain("$.members[0].role should be a string");

    const malformedProjectMemberGrantRequest = {
      role: "member",
    };
    const malformedProjectMemberGrantErrors = validateGeneratedSchemaValue(
      malformedProjectMemberGrantRequest,
      webDocument?.components?.schemas?.ProjectMemberGrantRequest,
    );
    expect(malformedProjectMemberGrantErrors).toContain("$.member_id is required");
  });
});
