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

describe("opentoggl custom OpenAPI sources", () => {
  const wave1WebPaths = [
    "/web/v1/auth/login",
    "/web/v1/auth/logout",
    "/web/v1/auth/register",
    "/web/v1/session",
    "/web/v1/profile",
    "/web/v1/preferences",
    "/web/v1/organizations/{organization_id}/settings",
    "/web/v1/workspaces/{workspace_id}/settings",
    "/web/v1/workspaces/{workspace_id}/capabilities",
    "/web/v1/workspaces/{workspace_id}/quota",
  ] as const;

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

  it("defines the Wave 1 web shell boundary for auth, session, profile, preferences, and tenant settings", () => {
    const webDocument = loadOpenTogglDocuments()[0]?.document;

    expect(Object.keys(webDocument?.paths ?? {})).toEqual(wave1WebPaths);
    expect(webDocument?.paths?.["/web/v1/auth/register"]?.post?.operationId).toBe(
      "register-web-user",
    );
    expect(webDocument?.paths?.["/web/v1/auth/login"]?.post?.operationId).toBe("login-web-user");
    expect(webDocument?.paths?.["/web/v1/session"]?.get?.operationId).toBe("get-web-session");
    expect(webDocument?.paths?.["/web/v1/profile"]?.patch?.operationId).toBe(
      "update-current-user-profile",
    );
    expect(
      webDocument?.paths?.["/web/v1/organizations/{organization_id}/settings"]?.patch?.operationId,
    ).toBe("update-organization-settings");
    expect(
      webDocument?.paths?.["/web/v1/workspaces/{workspace_id}/settings"]?.patch?.operationId,
    ).toBe("update-workspace-settings");
  });

  it("loads the generated manifest entries for the Wave 1 web shell operations", () => {
    const manifest = loadGeneratedCustomOperationManifest();
    const webOperations = manifest.operations.filter(
      (entry) => entry.source === "opentoggl-web.openapi.json",
    );

    expect(webOperations).toHaveLength(14);
    expect(webOperations.map((entry) => `${entry.method.toUpperCase()} ${entry.path}`)).toEqual([
      "POST /web/v1/auth/login",
      "POST /web/v1/auth/logout",
      "POST /web/v1/auth/register",
      "GET /web/v1/session",
      "GET /web/v1/profile",
      "PATCH /web/v1/profile",
      "GET /web/v1/preferences",
      "PATCH /web/v1/preferences",
      "GET /web/v1/organizations/{organization_id}/settings",
      "PATCH /web/v1/organizations/{organization_id}/settings",
      "GET /web/v1/workspaces/{workspace_id}/settings",
      "PATCH /web/v1/workspaces/{workspace_id}/settings",
      "GET /web/v1/workspaces/{workspace_id}/capabilities",
      "GET /web/v1/workspaces/{workspace_id}/quota",
    ]);
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

  it("reuses upstream identity, tenant, preferences, and subscription schemas through external refs", () => {
    const webDocument = loadOpenTogglDocuments()[0]?.document;

    expect(
      resolveExternalSchemaRef(webDocument?.components?.schemas?.CurrentUserProfile?.$ref)?.type,
    ).toBe("object");
    expect(
      resolveExternalSchemaRef(webDocument?.components?.schemas?.UserPreferences?.$ref)?.properties
        ?.alpha_features,
    ).toBeDefined();
    expect(
      resolveExternalSchemaRef(webDocument?.components?.schemas?.OrganizationSettings?.$ref)
        ?.properties?.subscription,
    ).toBeDefined();
    expect(
      resolveExternalSchemaRef(webDocument?.components?.schemas?.WorkspaceSettings?.$ref)
        ?.properties?.default_currency,
    ).toBeDefined();
    expect(
      resolveExternalSchemaRef(webDocument?.components?.schemas?.WorkspacePreferences?.$ref)
        ?.properties?.report_locked_at,
    ).toBeDefined();
    expect(
      resolveExternalSchemaRef(webDocument?.components?.schemas?.SubscriptionView?.$ref)?.properties
        ?.plan_name,
    ).toBeDefined();
  });

  it("defines session and workspace shell aggregates around shared billing truth", () => {
    const webDocument = loadOpenTogglDocuments()[0]?.document;
    const sessionShellSchema = webDocument?.components?.schemas?.SessionBootstrap;
    const workspaceShellSchema = webDocument?.components?.schemas?.WorkspaceSettingsEnvelope;

    expect(sessionShellSchema?.required).toEqual([
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

    expect(workspaceShellSchema?.required).toEqual(["workspace", "preferences"]);
    expect(workspaceShellSchema?.properties?.workspace).toEqual({
      $ref: "#/components/schemas/WorkspaceSettings",
    });
    expect(workspaceShellSchema?.properties?.preferences).toEqual({
      $ref: "#/components/schemas/WorkspacePreferences",
    });
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
        hide_start_end_times: true,
        only_admins_may_create_projects: true,
        only_admins_see_team_dashboard: false,
        projects_billable_by_default: true,
        reports_collapse: true,
        premium: true,
        business_ws: false,
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

    const errors = validateGeneratedSchemaValue(response, operation?.responses["200"]?.bodySchema ?? undefined);
    expect(errors).toEqual([]);
  });
});
