import type {
  CapabilitySnapshot as SharedCapabilitySnapshot,
  QuotaWindow as SharedQuotaWindow,
} from "./public-contracts.generated.ts";

/* eslint-disable */
// Generated from openapi/opentoggl-web.openapi.json.
// Do not edit by hand.

export const webContractsDocument = {
  openapi: "3.1.0",
  info: {
    title: "OpenToggl Web API",
    version: "0.0.0",
  },
  paths: {
    "/web/v1/auth/login": {
      post: {
        summary: "Login through the web app shell",
        operationId: "login-web-user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LoginRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Authenticated session bootstrap",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SessionBootstrap",
                },
              },
            },
          },
        },
      },
    },
    "/web/v1/auth/logout": {
      post: {
        summary: "Logout from the web app shell",
        operationId: "logout-web-user",
        responses: {
          "204": {
            description: "Session cleared",
          },
        },
      },
    },
    "/web/v1/auth/register": {
      post: {
        summary: "Register through the web app shell",
        operationId: "register-web-user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RegisterRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Registered session bootstrap",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SessionBootstrap",
                },
              },
            },
          },
        },
      },
    },
    "/web/v1/session": {
      get: {
        summary: "Bootstrap the current web session shell",
        operationId: "get-web-session",
        responses: {
          "200": {
            description: "Current session bootstrap",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SessionBootstrap",
                },
              },
            },
          },
        },
      },
    },
    "/web/v1/profile": {
      get: {
        summary: "Read the current user profile for the web shell",
        operationId: "get-current-user-profile",
        responses: {
          "200": {
            description: "Current user profile",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CurrentUserProfile",
                },
              },
            },
          },
        },
      },
      patch: {
        summary: "Update the current user profile for the web shell",
        operationId: "update-current-user-profile",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateCurrentUserProfileRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated current user profile",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CurrentUserProfile",
                },
              },
            },
          },
        },
      },
    },
    "/web/v1/profile/api-token/reset": {
      post: {
        summary: "Rotate the current user API token for the web shell",
        operationId: "reset-current-user-api-token",
        responses: {
          "200": {
            description: "Updated current user API token",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CurrentUserAPIToken",
                },
              },
            },
          },
        },
      },
    },
    "/web/v1/preferences": {
      get: {
        summary: "Read the current user preferences for the web shell",
        operationId: "get-current-user-preferences",
        responses: {
          "200": {
            description: "Current user preferences",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserPreferences",
                },
              },
            },
          },
        },
      },
      patch: {
        summary: "Update the current user preferences for the web shell",
        operationId: "update-current-user-preferences",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UserPreferencesUpdate",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated current user preferences",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserPreferences",
                },
              },
            },
          },
        },
      },
    },
    "/web/v1/organizations/{organization_id}/settings": {
      get: {
        summary: "Read organization settings for the web shell",
        operationId: "get-organization-settings",
        parameters: [
          {
            name: "organization_id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          "200": {
            description: "Organization settings shell",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/OrganizationSettingsEnvelope",
                },
              },
            },
          },
        },
      },
      patch: {
        summary: "Update organization settings for the web shell",
        operationId: "update-organization-settings",
        parameters: [
          {
            name: "organization_id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/OrganizationSettingsUpdate",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated organization settings shell",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/OrganizationSettingsEnvelope",
                },
              },
            },
          },
        },
      },
    },
    "/web/v1/workspaces/{workspace_id}/settings": {
      get: {
        summary: "Read workspace settings for the web shell",
        operationId: "get-workspace-settings",
        parameters: [
          {
            name: "workspace_id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          "200": {
            description: "Workspace settings shell",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/WorkspaceSettingsEnvelope",
                },
              },
            },
          },
        },
      },
      patch: {
        summary: "Update workspace settings for the web shell",
        operationId: "update-workspace-settings",
        parameters: [
          {
            name: "workspace_id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/WorkspaceSettingsUpdate",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated workspace settings shell",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/WorkspaceSettingsEnvelope",
                },
              },
            },
          },
        },
      },
    },
    "/web/v1/workspaces/{workspace_id}/capabilities": {
      get: {
        summary: "Capability snapshot for the current workspace",
        operationId: "get-workspace-capabilities",
        parameters: [
          {
            name: "workspace_id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          "200": {
            description: "Capability snapshot",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CapabilitySnapshot",
                },
              },
            },
          },
        },
      },
    },
    "/web/v1/workspaces/{workspace_id}/quota": {
      get: {
        summary: "Quota snapshot for the current workspace",
        operationId: "get-workspace-quota",
        parameters: [
          {
            name: "workspace_id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          "200": {
            description: "Quota snapshot",
            headers: {
              "X-OpenToggl-Quota-Remaining": {
                $ref: "./opentoggl-shared.openapi.json#/components/headers/X-OpenToggl-Quota-Remaining",
              },
              "X-OpenToggl-Quota-Reset-In-Secs": {
                $ref: "./opentoggl-shared.openapi.json#/components/headers/X-OpenToggl-Quota-Reset-In-Secs",
              },
              "X-OpenToggl-Quota-Total": {
                $ref: "./opentoggl-shared.openapi.json#/components/headers/X-OpenToggl-Quota-Total",
              },
            },
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/QuotaWindow",
                },
              },
            },
          },
        },
      },
    },
    "/web/v1/workspaces/{workspace_id}/permissions": {
      get: {
        summary: "Read workspace permission toggles",
        operationId: "get-workspace-permissions",
        parameters: [
          {
            name: "workspace_id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          "200": {
            description: "Workspace permission configuration",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/WorkspacePermissions",
                },
              },
            },
          },
        },
      },
      patch: {
        summary: "Update workspace permission toggles",
        operationId: "update-workspace-permissions",
        parameters: [
          {
            name: "workspace_id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/UpdateWorkspacePermissionsRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated workspace permission configuration",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/WorkspacePermissions",
                },
              },
            },
          },
        },
      },
    },
    "/web/v1/workspaces/{workspace_id}/members": {
      get: {
        summary: "List workspace members",
        operationId: "list-workspace-members",
        parameters: [
          {
            name: "workspace_id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          "200": {
            description: "Workspace member list",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/WorkspaceMembersEnvelope",
                },
              },
            },
          },
        },
      },
    },
    "/web/v1/workspaces/{workspace_id}/members/invitations": {
      post: {
        summary: "Invite a workspace member",
        operationId: "invite-workspace-member",
        parameters: [
          {
            name: "workspace_id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/WorkspaceMemberInvitationRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Workspace member invitation accepted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                },
              },
            },
          },
        },
      },
    },
    "/web/v1/projects": {
      get: {
        summary: "List projects",
        operationId: "list-projects",
        parameters: [
          {
            name: "workspace_id",
            in: "query",
            required: false,
            schema: {
              type: "integer",
            },
          },
          {
            name: "status",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: ["all", "active", "archived"],
            },
          },
        ],
        responses: {
          "200": {
            description: "Project list",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ProjectListEnvelope",
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create a project",
        operationId: "create-project",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ProjectCreateRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Created project",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ProjectSummary",
                },
              },
            },
          },
        },
      },
    },
    "/web/v1/projects/{project_id}": {
      get: {
        summary: "Retrieve project detail",
        operationId: "get-project",
        parameters: [
          {
            name: "project_id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          "200": {
            description: "Project detail",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ProjectDetail",
                },
              },
            },
          },
        },
      },
    },
    "/web/v1/projects/{project_id}/archive": {
      post: {
        summary: "Archive a project",
        operationId: "archive-project",
        parameters: [
          {
            name: "project_id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          "200": {
            description: "Archived project",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ProjectSummary",
                },
              },
            },
          },
        },
      },
      delete: {
        summary: "Restore an archived project",
        operationId: "restore-project",
        parameters: [
          {
            name: "project_id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          "200": {
            description: "Restored project",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ProjectSummary",
                },
              },
            },
          },
        },
      },
    },
    "/web/v1/projects/{project_id}/pin": {
      post: {
        summary: "Pin a project",
        operationId: "pin-project",
        parameters: [
          {
            name: "project_id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          "200": {
            description: "Pinned project",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ProjectSummary",
                },
              },
            },
          },
        },
      },
      delete: {
        summary: "Unpin a project",
        operationId: "unpin-project",
        parameters: [
          {
            name: "project_id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          "200": {
            description: "Unpinned project",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ProjectSummary",
                },
              },
            },
          },
        },
      },
    },
    "/web/v1/projects/{project_id}/members": {
      get: {
        summary: "List project members",
        operationId: "list-project-members",
        parameters: [
          {
            name: "project_id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          "200": {
            description: "Project members list",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ProjectMembersEnvelope",
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Grant a project member",
        operationId: "grant-project-member",
        parameters: [
          {
            name: "project_id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ProjectMemberGrantRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Granted project member",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ProjectMember",
                },
              },
            },
          },
        },
      },
    },
    "/web/v1/projects/{project_id}/members/{member_id}": {
      delete: {
        summary: "Revoke a project member",
        operationId: "revoke-project-member",
        parameters: [
          {
            name: "project_id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
          {
            name: "member_id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          "204": {
            description: "Revoked project member",
          },
        },
      },
    },
    "/web/v1/clients": {
      get: {
        summary: "List clients",
        operationId: "list-clients",
        parameters: [
          {
            name: "workspace_id",
            in: "query",
            required: false,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          "200": {
            description: "Client list",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ClientListEnvelope",
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create a client",
        operationId: "create-client",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ClientCreateRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Created client",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ClientSummary",
                },
              },
            },
          },
        },
      },
    },
    "/web/v1/tasks": {
      get: {
        summary: "List tasks",
        operationId: "list-tasks",
        parameters: [
          {
            name: "workspace_id",
            in: "query",
            required: false,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          "200": {
            description: "Task list",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TaskListEnvelope",
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create a task",
        operationId: "create-task",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/TaskCreateRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Created task",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TaskSummary",
                },
              },
            },
          },
        },
      },
    },
    "/web/v1/tags": {
      get: {
        summary: "List tags",
        operationId: "list-tags",
        parameters: [
          {
            name: "workspace_id",
            in: "query",
            required: false,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          "200": {
            description: "Tag list",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TagListEnvelope",
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create a tag",
        operationId: "create-tag",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/TagCreateRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Created tag",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TagSummary",
                },
              },
            },
          },
        },
      },
    },
    "/web/v1/groups": {
      get: {
        summary: "List groups",
        operationId: "list-groups",
        parameters: [
          {
            name: "workspace_id",
            in: "query",
            required: false,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          "200": {
            description: "Group list",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/GroupListEnvelope",
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Create a group",
        operationId: "create-group",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/GroupCreateRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Created group",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/GroupSummary",
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      CapabilitySnapshot: {
        $ref: "./opentoggl-shared.openapi.json#/components/schemas/CapabilitySnapshot",
      },
      CurrentUserProfile: {
        type: "object",
        properties: {
          id: {
            type: "integer",
          },
          email: {
            type: "string",
            format: "email",
          },
          fullname: {
            type: "string",
          },
          image_url: {
            type: "string",
            nullable: true,
          },
          api_token: {
            type: "string",
          },
          timezone: {
            type: "string",
          },
          default_workspace_id: {
            type: "integer",
          },
          beginning_of_week: {
            type: "integer",
          },
          country_id: {
            type: "integer",
          },
          has_password: {
            type: "boolean",
          },
          "2fa_enabled": {
            type: "boolean",
          },
        },
        required: [
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
        ],
      },
      CurrentUserAPIToken: {
        type: "object",
        properties: {
          api_token: {
            type: "string",
          },
        },
        required: ["api_token"],
      },
      LoginRequest: {
        type: "object",
        properties: {
          email: {
            type: "string",
            format: "email",
          },
          password: {
            type: "string",
          },
        },
        required: ["email", "password"],
      },
      OrganizationSettings: {
        type: "object",
        properties: {
          id: {
            type: "integer",
          },
          name: {
            type: "string",
          },
          admin: {
            type: "boolean",
          },
          max_workspaces: {
            type: "integer",
          },
          pricing_plan_name: {
            type: "string",
          },
          is_multi_workspace_enabled: {
            type: "boolean",
          },
          user_count: {
            type: "integer",
          },
        },
        required: [
          "id",
          "name",
          "admin",
          "max_workspaces",
          "pricing_plan_name",
          "is_multi_workspace_enabled",
          "user_count",
        ],
      },
      OrganizationSettingsEnvelope: {
        type: "object",
        properties: {
          organization: {
            $ref: "#/components/schemas/OrganizationSettings",
          },
          subscription: {
            $ref: "#/components/schemas/SubscriptionView",
            nullable: true,
          },
        },
        required: ["organization", "subscription"],
      },
      OrganizationSettingsUpdate: {
        type: "object",
        properties: {
          organization: {
            $ref: "#/components/schemas/UpdateOrganizationSettingsRequest",
          },
        },
        required: ["organization"],
      },
      QuotaWindow: {
        $ref: "./opentoggl-shared.openapi.json#/components/schemas/QuotaWindow",
      },
      ProjectListEnvelope: {
        type: "object",
        properties: {
          projects: {
            type: "array",
            items: {
              $ref: "#/components/schemas/ProjectSummary",
            },
          },
        },
        required: ["projects"],
      },
      ProjectCreateRequest: {
        type: "object",
        properties: {
          workspace_id: {
            type: "integer",
          },
          name: {
            type: "string",
          },
        },
        required: ["workspace_id", "name"],
      },
      ProjectDetail: {
        type: "object",
        properties: {
          id: {
            type: "integer",
          },
          workspace_id: {
            type: "integer",
          },
          client_id: {
            type: "integer",
            nullable: true,
          },
          name: {
            type: "string",
          },
          active: {
            type: "boolean",
          },
          pinned: {
            type: "boolean",
          },
          billable: {
            type: "boolean",
          },
          private: {
            type: "boolean",
          },
          template: {
            type: "boolean",
          },
          color: {
            type: "string",
          },
          currency: {
            type: "string",
            nullable: true,
          },
          estimated_seconds: {
            type: "integer",
          },
          actual_seconds: {
            type: "integer",
          },
          fixed_fee: {
            type: "number",
          },
          rate: {
            type: "number",
            nullable: true,
          },
        },
        required: [
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
        ],
      },
      ProjectMemberGrantRequest: {
        type: "object",
        properties: {
          member_id: {
            type: "integer",
          },
          role: {
            type: "string",
            nullable: true,
          },
        },
        required: ["member_id"],
      },
      ProjectMember: {
        type: "object",
        properties: {
          project_id: {
            type: "integer",
          },
          member_id: {
            type: "integer",
          },
          role: {
            type: "string",
          },
        },
        required: ["project_id", "member_id", "role"],
      },
      ProjectMembersEnvelope: {
        type: "object",
        properties: {
          members: {
            type: "array",
            items: {
              $ref: "#/components/schemas/ProjectMember",
            },
          },
        },
        required: ["members"],
      },
      ProjectSummary: {
        type: "object",
        properties: {
          id: {
            type: "integer",
          },
          name: {
            type: "string",
          },
          workspace_id: {
            type: "integer",
          },
          active: {
            type: "boolean",
          },
          pinned: {
            type: "boolean",
          },
        },
        required: ["id", "name", "workspace_id", "active", "pinned"],
      },
      RegisterRequest: {
        type: "object",
        properties: {
          email: {
            type: "string",
            format: "email",
          },
          password: {
            type: "string",
          },
          fullname: {
            type: "string",
          },
        },
        required: ["email", "password"],
      },
      SessionBootstrap: {
        type: "object",
        properties: {
          current_organization_id: {
            type: "integer",
            nullable: true,
          },
          current_workspace_id: {
            type: "integer",
            nullable: true,
          },
          organization_subscription: {
            $ref: "#/components/schemas/SubscriptionView",
            nullable: true,
          },
          workspace_subscription: {
            $ref: "#/components/schemas/SubscriptionView",
            nullable: true,
          },
          user: {
            $ref: "#/components/schemas/CurrentUserProfile",
          },
          organizations: {
            type: "array",
            items: {
              $ref: "#/components/schemas/OrganizationSettings",
            },
          },
          workspaces: {
            type: "array",
            items: {
              $ref: "#/components/schemas/WorkspaceSettings",
            },
          },
          workspace_capabilities: {
            $ref: "#/components/schemas/CapabilitySnapshot",
            nullable: true,
          },
          workspace_quota: {
            $ref: "#/components/schemas/QuotaWindow",
            nullable: true,
          },
        },
        required: [
          "current_organization_id",
          "current_workspace_id",
          "organization_subscription",
          "workspace_subscription",
          "user",
          "organizations",
          "workspaces",
          "workspace_capabilities",
          "workspace_quota",
        ],
      },
      SubscriptionView: {
        type: "object",
        properties: {
          plan_name: {
            type: "string",
          },
          state: {
            type: "string",
          },
          enterprise: {
            type: "boolean",
            nullable: true,
          },
        },
        required: ["plan_name", "state"],
      },
      UpdateCurrentUserProfileRequest: {
        type: "object",
        properties: {
          email: {
            type: "string",
            format: "email",
          },
          fullname: {
            type: "string",
          },
          timezone: {
            type: "string",
          },
          beginning_of_week: {
            type: "integer",
          },
          country_id: {
            type: "integer",
          },
          default_workspace_id: {
            type: "integer",
          },
          current_password: {
            type: "string",
            nullable: true,
          },
          password: {
            type: "string",
            nullable: true,
          },
        },
        required: [
          "email",
          "fullname",
          "timezone",
          "beginning_of_week",
          "country_id",
          "default_workspace_id",
        ],
      },
      UpdateOrganizationSettingsRequest: {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
        },
        required: ["name"],
      },
      UpdateWorkspaceSettingsRequest: {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
          default_currency: {
            type: "string",
          },
          default_hourly_rate: {
            type: "number",
          },
          rounding: {
            type: "integer",
          },
          rounding_minutes: {
            type: "integer",
          },
          reports_collapse: {
            type: "boolean",
          },
          only_admins_may_create_projects: {
            type: "boolean",
          },
          only_admins_may_create_tags: {
            type: "boolean",
          },
          only_admins_see_team_dashboard: {
            type: "boolean",
          },
          projects_billable_by_default: {
            type: "boolean",
          },
          projects_private_by_default: {
            type: "boolean",
          },
          projects_enforce_billable: {
            type: "boolean",
          },
          limit_public_project_data: {
            type: "boolean",
          },
        },
        required: [
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
        ],
      },
      UserPreferences: {
        type: "object",
        properties: {
          date_format: {
            type: "string",
          },
          timeofday_format: {
            type: "string",
          },
          duration_format: {
            type: "string",
          },
          pg_time_zone_name: {
            type: "string",
          },
          beginningOfWeek: {
            type: "integer",
          },
          collapseTimeEntries: {
            type: "boolean",
          },
          language_code: {
            type: "string",
          },
          hide_sidebar_right: {
            type: "boolean",
          },
          reports_collapse: {
            type: "boolean",
          },
          manualMode: {
            type: "boolean",
          },
          manualEntryMode: {
            type: "string",
          },
        },
        required: [
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
        ],
      },
      UserPreferencesUpdate: {
        type: "object",
        properties: {
          date_format: {
            type: "string",
          },
          timeofday_format: {
            type: "string",
          },
          duration_format: {
            type: "string",
          },
          pg_time_zone_name: {
            type: "string",
          },
          beginningOfWeek: {
            type: "integer",
          },
          collapseTimeEntries: {
            type: "boolean",
          },
          language_code: {
            type: "string",
          },
          hide_sidebar_right: {
            type: "boolean",
          },
          reports_collapse: {
            type: "boolean",
          },
          manualMode: {
            type: "boolean",
          },
          manualEntryMode: {
            type: "string",
          },
        },
      },
      WorkspacePermissions: {
        type: "object",
        properties: {
          only_admins_may_create_projects: {
            type: "boolean",
          },
          only_admins_may_create_tags: {
            type: "boolean",
          },
          only_admins_see_team_dashboard: {
            type: "boolean",
          },
          limit_public_project_data: {
            type: "boolean",
          },
        },
        required: [
          "only_admins_may_create_projects",
          "only_admins_may_create_tags",
          "only_admins_see_team_dashboard",
          "limit_public_project_data",
        ],
      },
      UpdateWorkspacePermissionsRequest: {
        type: "object",
        properties: {
          only_admins_may_create_projects: {
            type: "boolean",
          },
          only_admins_may_create_tags: {
            type: "boolean",
          },
          only_admins_see_team_dashboard: {
            type: "boolean",
          },
          limit_public_project_data: {
            type: "boolean",
          },
        },
        required: [
          "only_admins_may_create_projects",
          "only_admins_may_create_tags",
          "only_admins_see_team_dashboard",
          "limit_public_project_data",
        ],
      },
      WorkspaceMember: {
        type: "object",
        properties: {
          id: {
            type: "integer",
          },
          workspace_id: {
            type: "integer",
          },
          email: {
            type: "string",
            format: "email",
          },
          name: {
            type: "string",
          },
          role: {
            type: "string",
          },
        },
        required: ["id", "workspace_id", "email", "name", "role"],
      },
      ClientListEnvelope: {
        type: "object",
        properties: {
          clients: {
            type: "array",
            items: {
              $ref: "#/components/schemas/ClientSummary",
            },
          },
        },
        required: ["clients"],
      },
      ClientSummary: {
        type: "object",
        properties: {
          id: {
            type: "integer",
          },
          name: {
            type: "string",
          },
          workspace_id: {
            type: "integer",
          },
          active: {
            type: "boolean",
          },
        },
        required: ["id", "name", "workspace_id", "active"],
      },
      ClientCreateRequest: {
        type: "object",
        properties: {
          workspace_id: {
            type: "integer",
          },
          name: {
            type: "string",
          },
        },
        required: ["workspace_id", "name"],
      },
      TaskListEnvelope: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: {
              $ref: "#/components/schemas/TaskSummary",
            },
          },
        },
        required: ["tasks"],
      },
      TaskSummary: {
        type: "object",
        properties: {
          id: {
            type: "integer",
          },
          name: {
            type: "string",
          },
          workspace_id: {
            type: "integer",
          },
          active: {
            type: "boolean",
          },
        },
        required: ["id", "name", "workspace_id", "active"],
      },
      TaskCreateRequest: {
        type: "object",
        properties: {
          workspace_id: {
            type: "integer",
          },
          name: {
            type: "string",
          },
        },
        required: ["workspace_id", "name"],
      },
      TagListEnvelope: {
        type: "object",
        properties: {
          tags: {
            type: "array",
            items: {
              $ref: "#/components/schemas/TagSummary",
            },
          },
        },
        required: ["tags"],
      },
      TagSummary: {
        type: "object",
        properties: {
          id: {
            type: "integer",
          },
          name: {
            type: "string",
          },
          workspace_id: {
            type: "integer",
          },
          active: {
            type: "boolean",
          },
        },
        required: ["id", "name", "workspace_id", "active"],
      },
      TagCreateRequest: {
        type: "object",
        properties: {
          workspace_id: {
            type: "integer",
          },
          name: {
            type: "string",
          },
        },
        required: ["workspace_id", "name"],
      },
      GroupListEnvelope: {
        type: "object",
        properties: {
          groups: {
            type: "array",
            items: {
              $ref: "#/components/schemas/GroupSummary",
            },
          },
        },
        required: ["groups"],
      },
      GroupSummary: {
        type: "object",
        properties: {
          id: {
            type: "integer",
          },
          name: {
            type: "string",
          },
          workspace_id: {
            type: "integer",
          },
          active: {
            type: "boolean",
          },
        },
        required: ["id", "name", "workspace_id", "active"],
      },
      GroupCreateRequest: {
        type: "object",
        properties: {
          workspace_id: {
            type: "integer",
          },
          name: {
            type: "string",
          },
        },
        required: ["workspace_id", "name"],
      },
      WorkspaceMemberInvitationRequest: {
        type: "object",
        properties: {
          email: {
            type: "string",
            format: "email",
          },
          role: {
            type: "string",
            nullable: true,
          },
        },
        required: ["email"],
      },
      WorkspaceMembersEnvelope: {
        type: "object",
        properties: {
          members: {
            type: "array",
            items: {
              $ref: "#/components/schemas/WorkspaceMember",
            },
          },
        },
        required: ["members"],
      },
      WorkspacePreferences: {
        type: "object",
        properties: {
          hide_start_end_times: {
            type: "boolean",
          },
          report_locked_at: {
            type: "string",
          },
        },
        required: ["hide_start_end_times", "report_locked_at"],
      },
      WorkspaceSettings: {
        type: "object",
        properties: {
          id: {
            type: "integer",
          },
          organization_id: {
            type: "integer",
          },
          name: {
            type: "string",
          },
          logo_url: {
            type: "string",
            nullable: true,
          },
          default_currency: {
            type: "string",
          },
          default_hourly_rate: {
            type: "number",
          },
          rounding: {
            type: "integer",
          },
          rounding_minutes: {
            type: "integer",
          },
          reports_collapse: {
            type: "boolean",
          },
          only_admins_may_create_projects: {
            type: "boolean",
          },
          only_admins_may_create_tags: {
            type: "boolean",
          },
          only_admins_see_team_dashboard: {
            type: "boolean",
          },
          projects_billable_by_default: {
            type: "boolean",
          },
          projects_private_by_default: {
            type: "boolean",
          },
          projects_enforce_billable: {
            type: "boolean",
          },
          limit_public_project_data: {
            type: "boolean",
          },
          admin: {
            type: "boolean",
          },
          premium: {
            type: "boolean",
          },
          role: {
            type: "string",
          },
        },
        required: [
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
        ],
      },
      WorkspaceSettingsEnvelope: {
        type: "object",
        properties: {
          workspace: {
            $ref: "#/components/schemas/WorkspaceSettings",
          },
          preferences: {
            $ref: "#/components/schemas/WorkspacePreferences",
          },
          subscription: {
            $ref: "#/components/schemas/SubscriptionView",
            nullable: true,
          },
          capabilities: {
            $ref: "#/components/schemas/CapabilitySnapshot",
            nullable: true,
          },
          quota: {
            $ref: "#/components/schemas/QuotaWindow",
            nullable: true,
          },
        },
        required: ["workspace", "preferences", "subscription", "capabilities", "quota"],
      },
      WorkspaceSettingsUpdate: {
        type: "object",
        properties: {
          workspace: {
            $ref: "#/components/schemas/UpdateWorkspaceSettingsRequest",
          },
          preferences: {
            $ref: "#/components/schemas/WorkspacePreferences",
          },
        },
      },
    },
  },
} as const;

export const webContractsGeneratedArtifact = {
  source: "openapi/opentoggl-web.openapi.json",
  schemaNames: [
    "CapabilitySnapshot",
    "CurrentUserProfile",
    "CurrentUserAPIToken",
    "LoginRequest",
    "OrganizationSettings",
    "OrganizationSettingsEnvelope",
    "OrganizationSettingsUpdate",
    "QuotaWindow",
    "ProjectListEnvelope",
    "ProjectCreateRequest",
    "ProjectDetail",
    "ProjectMemberGrantRequest",
    "ProjectMember",
    "ProjectMembersEnvelope",
    "ProjectSummary",
    "RegisterRequest",
    "SessionBootstrap",
    "SubscriptionView",
    "UpdateCurrentUserProfileRequest",
    "UpdateOrganizationSettingsRequest",
    "UpdateWorkspaceSettingsRequest",
    "UserPreferences",
    "UserPreferencesUpdate",
    "WorkspacePermissions",
    "UpdateWorkspacePermissionsRequest",
    "WorkspaceMember",
    "ClientListEnvelope",
    "ClientSummary",
    "ClientCreateRequest",
    "TaskListEnvelope",
    "TaskSummary",
    "TaskCreateRequest",
    "TagListEnvelope",
    "TagSummary",
    "TagCreateRequest",
    "GroupListEnvelope",
    "GroupSummary",
    "GroupCreateRequest",
    "WorkspaceMemberInvitationRequest",
    "WorkspaceMembersEnvelope",
    "WorkspacePreferences",
    "WorkspaceSettings",
    "WorkspaceSettingsEnvelope",
    "WorkspaceSettingsUpdate",
  ],
  headerNames: [],
} as const;

export interface WebContractTypeMap {
  CapabilitySnapshot: CapabilitySnapshot;
  CurrentUserProfile: CurrentUserProfile;
  CurrentUserAPIToken: CurrentUserAPIToken;
  LoginRequest: LoginRequest;
  OrganizationSettings: OrganizationSettings;
  OrganizationSettingsEnvelope: OrganizationSettingsEnvelope;
  OrganizationSettingsUpdate: OrganizationSettingsUpdate;
  QuotaWindow: QuotaWindow;
  ProjectListEnvelope: ProjectListEnvelope;
  ProjectCreateRequest: ProjectCreateRequest;
  ProjectDetail: ProjectDetail;
  ProjectMemberGrantRequest: ProjectMemberGrantRequest;
  ProjectMember: ProjectMember;
  ProjectMembersEnvelope: ProjectMembersEnvelope;
  ProjectSummary: ProjectSummary;
  RegisterRequest: RegisterRequest;
  SessionBootstrap: SessionBootstrap;
  SubscriptionView: SubscriptionView;
  UpdateCurrentUserProfileRequest: UpdateCurrentUserProfileRequest;
  UpdateOrganizationSettingsRequest: UpdateOrganizationSettingsRequest;
  UpdateWorkspaceSettingsRequest: UpdateWorkspaceSettingsRequest;
  UserPreferences: UserPreferences;
  UserPreferencesUpdate: UserPreferencesUpdate;
  WorkspacePermissions: WorkspacePermissions;
  UpdateWorkspacePermissionsRequest: UpdateWorkspacePermissionsRequest;
  WorkspaceMember: WorkspaceMember;
  ClientListEnvelope: ClientListEnvelope;
  ClientSummary: ClientSummary;
  ClientCreateRequest: ClientCreateRequest;
  TaskListEnvelope: TaskListEnvelope;
  TaskSummary: TaskSummary;
  TaskCreateRequest: TaskCreateRequest;
  TagListEnvelope: TagListEnvelope;
  TagSummary: TagSummary;
  TagCreateRequest: TagCreateRequest;
  GroupListEnvelope: GroupListEnvelope;
  GroupSummary: GroupSummary;
  GroupCreateRequest: GroupCreateRequest;
  WorkspaceMemberInvitationRequest: WorkspaceMemberInvitationRequest;
  WorkspaceMembersEnvelope: WorkspaceMembersEnvelope;
  WorkspacePreferences: WorkspacePreferences;
  WorkspaceSettings: WorkspaceSettings;
  WorkspaceSettingsEnvelope: WorkspaceSettingsEnvelope;
  WorkspaceSettingsUpdate: WorkspaceSettingsUpdate;
}

export type WebContractSchemaName = keyof WebContractTypeMap;

export const quotaWindowSchema = webContractsDocument.components.schemas.QuotaWindow;
export const capabilitySnapshotSchema = webContractsDocument.components.schemas.CapabilitySnapshot;

export type CapabilitySnapshot = SharedCapabilitySnapshot;
export type CurrentUserProfile = {
  id: number;
  email: string;
  fullname: string;
  image_url?: string | null;
  api_token: string;
  timezone: string;
  default_workspace_id: number;
  beginning_of_week: number;
  country_id: number;
  has_password: boolean;
  "2fa_enabled": boolean;
};
export type CurrentUserAPIToken = { api_token: string };
export type LoginRequest = { email: string; password: string };
export type OrganizationSettings = {
  id: number;
  name: string;
  admin: boolean;
  max_workspaces: number;
  pricing_plan_name: string;
  is_multi_workspace_enabled: boolean;
  user_count: number;
};
export type OrganizationSettingsEnvelope = {
  organization: OrganizationSettings;
  subscription: SubscriptionView | null;
};
export type OrganizationSettingsUpdate = { organization: UpdateOrganizationSettingsRequest };
export type QuotaWindow = SharedQuotaWindow;
export type ProjectListEnvelope = { projects: ProjectSummary[] };
export type ProjectCreateRequest = { workspace_id: number; name: string };
export type ProjectDetail = {
  id: number;
  workspace_id: number;
  client_id: number | null;
  name: string;
  active: boolean;
  pinned: boolean;
  billable: boolean;
  private: boolean;
  template: boolean;
  color: string;
  currency: string | null;
  estimated_seconds: number;
  actual_seconds: number;
  fixed_fee: number;
  rate: number | null;
};
export type ProjectMemberGrantRequest = { member_id: number; role?: string | null };
export type ProjectMember = { project_id: number; member_id: number; role: string };
export type ProjectMembersEnvelope = { members: ProjectMember[] };
export type ProjectSummary = {
  id: number;
  name: string;
  workspace_id: number;
  active: boolean;
  pinned: boolean;
};
export type RegisterRequest = { email: string; password: string; fullname?: string };
export type SessionBootstrap = {
  current_organization_id: number | null;
  current_workspace_id: number | null;
  organization_subscription: SubscriptionView | null;
  workspace_subscription: SubscriptionView | null;
  user: CurrentUserProfile;
  organizations: OrganizationSettings[];
  workspaces: WorkspaceSettings[];
  workspace_capabilities: CapabilitySnapshot | null;
  workspace_quota: QuotaWindow | null;
};
export type SubscriptionView = { plan_name: string; state: string; enterprise?: boolean | null };
export type UpdateCurrentUserProfileRequest = {
  email: string;
  fullname: string;
  timezone: string;
  beginning_of_week: number;
  country_id: number;
  default_workspace_id: number;
  current_password?: string | null;
  password?: string | null;
};
export type UpdateOrganizationSettingsRequest = { name: string };
export type UpdateWorkspaceSettingsRequest = {
  name: string;
  default_currency: string;
  default_hourly_rate: number;
  rounding: number;
  rounding_minutes: number;
  reports_collapse: boolean;
  only_admins_may_create_projects: boolean;
  only_admins_may_create_tags: boolean;
  only_admins_see_team_dashboard: boolean;
  projects_billable_by_default: boolean;
  projects_private_by_default: boolean;
  projects_enforce_billable: boolean;
  limit_public_project_data: boolean;
};
export type UserPreferences = {
  date_format: string;
  timeofday_format: string;
  duration_format: string;
  pg_time_zone_name: string;
  beginningOfWeek: number;
  collapseTimeEntries: boolean;
  language_code: string;
  hide_sidebar_right: boolean;
  reports_collapse: boolean;
  manualMode: boolean;
  manualEntryMode: string;
};
export type UserPreferencesUpdate = {
  date_format?: string;
  timeofday_format?: string;
  duration_format?: string;
  pg_time_zone_name?: string;
  beginningOfWeek?: number;
  collapseTimeEntries?: boolean;
  language_code?: string;
  hide_sidebar_right?: boolean;
  reports_collapse?: boolean;
  manualMode?: boolean;
  manualEntryMode?: string;
};
export type WorkspacePermissions = {
  only_admins_may_create_projects: boolean;
  only_admins_may_create_tags: boolean;
  only_admins_see_team_dashboard: boolean;
  limit_public_project_data: boolean;
};
export type UpdateWorkspacePermissionsRequest = {
  only_admins_may_create_projects: boolean;
  only_admins_may_create_tags: boolean;
  only_admins_see_team_dashboard: boolean;
  limit_public_project_data: boolean;
};
export type WorkspaceMember = {
  id: number;
  workspace_id: number;
  email: string;
  name: string;
  role: string;
  status: string;
};
export type ClientListEnvelope = { clients: ClientSummary[] };
export type ClientSummary = { id: number; name: string; workspace_id: number; active: boolean };
export type ClientCreateRequest = { workspace_id: number; name: string };
export type TaskListEnvelope = { tasks: TaskSummary[] };
export type TaskSummary = { id: number; name: string; workspace_id: number; active: boolean };
export type TaskCreateRequest = { workspace_id: number; name: string };
export type TagListEnvelope = { tags: TagSummary[] };
export type TagSummary = { id: number; name: string; workspace_id: number; active: boolean };
export type TagCreateRequest = { workspace_id: number; name: string };
export type GroupListEnvelope = { groups: GroupSummary[] };
export type GroupSummary = { id: number; name: string; workspace_id: number; active: boolean };
export type GroupCreateRequest = { workspace_id: number; name: string };
export type WorkspaceMemberInvitationRequest = { email: string; role?: string | null };
export type WorkspaceMembersEnvelope = { members: WorkspaceMember[] };
export type WorkspacePreferences = { hide_start_end_times: boolean; report_locked_at: string };
export type WorkspaceSettings = {
  id: number;
  organization_id: number;
  name: string;
  logo_url?: string | null;
  default_currency: string;
  default_hourly_rate: number;
  rounding: number;
  rounding_minutes: number;
  reports_collapse: boolean;
  only_admins_may_create_projects: boolean;
  only_admins_may_create_tags: boolean;
  only_admins_see_team_dashboard: boolean;
  projects_billable_by_default: boolean;
  projects_private_by_default: boolean;
  projects_enforce_billable: boolean;
  limit_public_project_data: boolean;
  admin: boolean;
  premium: boolean;
  role: string;
};
export type WorkspaceSettingsEnvelope = {
  workspace: WorkspaceSettings;
  preferences: WorkspacePreferences;
  subscription: SubscriptionView | null;
  capabilities: CapabilitySnapshot | null;
  quota: QuotaWindow | null;
};
export type WorkspaceSettingsUpdate = {
  workspace?: UpdateWorkspaceSettingsRequest;
  preferences?: WorkspacePreferences;
};
