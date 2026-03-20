import { describe, expect, it } from "vitest";

import { runCompatContractCase } from "../../src/testing/contracts/compat.ts";

describe("tenant compat contract cases", () => {
  it("validates the organization creation reply shape", () => {
    const result = runCompatContractCase({
      source: "toggl-track-api-v9.swagger.json",
      method: "post",
      path: "/organizations",
      status: 200,
      actual: {
        id: 1,
        name: "Platform",
        permissions: ["organization:write"],
        workspace_id: 11,
        workspace_name: "Platform HQ",
      },
    });

    expect(result.ok).toBe(true);
    expect(result.operationId).toBe("post-organization");
  });

  it("validates the organization update validation error mapping", () => {
    const result = runCompatContractCase({
      source: "toggl-track-api-v9.swagger.json",
      method: "put",
      path: "/organizations/{organization_id}",
      status: 400,
      actual: "field 'name' cannot be empty",
    });

    expect(result.ok).toBe(true);
    expect(result.operationId).toBe("put-organization");
  });

  it("validates the premium-gated workspace settings error mapping", () => {
    const result = runCompatContractCase({
      source: "toggl-track-api-v9.swagger.json",
      method: "post",
      path: "/organizations/{organization_id}/workspaces",
      status: 402,
      actual: "Must be a premium user to use default_currency",
    });

    expect(result.ok).toBe(true);
    expect(result.operationId).toBe("post-organization-workspaces");
  });

  it("validates the workspace logo response surface", () => {
    const result = runCompatContractCase({
      source: "toggl-track-api-v9.swagger.json",
      method: "get",
      path: "/workspaces/{workspace_id}/logo",
      status: 200,
      actual: {
        logo: "https://assets.opentoggl.test/workspaces/11/logo.png",
      },
    });

    expect(result.ok).toBe(true);
    expect(result.operationId).toBe("get-workspace-logo");
  });

  it("validates the workspace logo not-found error mapping", () => {
    const result = runCompatContractCase({
      source: "toggl-track-api-v9.swagger.json",
      method: "get",
      path: "/workspaces/{workspace_id}/logo",
      status: 400,
      actual: "Workspace not found",
    });

    expect(result.ok).toBe(true);
    expect(result.operationId).toBe("get-workspace-logo");
  });
});
